package com.lavadero.api.payroll.service;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.repository.TicketAssignmentRepository;
import com.lavadero.api.payroll.domain.DebtLedgerType;
import com.lavadero.api.payroll.domain.PayrollDay;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import com.lavadero.api.payroll.repository.DebtLedgerRepository;
import com.lavadero.api.payroll.repository.PayrollDayRepository;
import com.lavadero.api.payroll.repository.PayrollEntryRepository;
import com.lavadero.api.payroll.repository.PayrollPeriodRepository;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollPeriodRequest;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollPeriodResponse;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayrollService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100.00");

    private final PayrollPeriodRepository periods;
    private final PayrollEntryRepository entries;
    private final PayrollDayRepository days;
    private final DebtLedgerRepository debtLedger;
    private final EmployeeRepository employees;
    private final EmployeeAdvanceRepository advances;
    private final TicketAssignmentRepository ticketAssignments;
    private final DebtLedgerService debtLedgerService;
    private final BigDecimal carsBonusRate;

    public PayrollService(PayrollPeriodRepository periods, PayrollEntryRepository entries, PayrollDayRepository days,
            DebtLedgerRepository debtLedger, EmployeeRepository employees, EmployeeAdvanceRepository advances,
            TicketAssignmentRepository ticketAssignments, DebtLedgerService debtLedgerService,
            @Value("${lavadero.payroll.cars-bonus-rate:10.00}") BigDecimal carsBonusRate) {
        this.periods = periods;
        this.entries = entries;
        this.days = days;
        this.debtLedger = debtLedger;
        this.employees = employees;
        this.advances = advances;
        this.ticketAssignments = ticketAssignments;
        this.debtLedgerService = debtLedgerService;
        this.carsBonusRate = money(carsBonusRate);
    }

    @Transactional
    public PayrollPeriodResponse createPeriod(CreatePayrollPeriodRequest request) {
        if (request.startDate().getDayOfWeek() != DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException("Payroll period must start on Sunday");
        }
        PayrollPeriod period = periods.save(new PayrollPeriod(request.startDate(), request.startDate().plusDays(6)));
        return response(period);
    }

    @Transactional(readOnly = true)
    public List<PayrollPeriodResponse> list(PayrollPeriodStatus status) {
        List<PayrollPeriod> result = status == null
                ? periods.findAllByOrderByStartDateDesc()
                : periods.findByStatusOrderByStartDateDesc(status);
        return result.stream().map(PayrollPeriodResponse::summary).toList();
    }

    @Transactional(readOnly = true)
    public PayrollPeriodResponse get(Long id) {
        return response(getPeriod(id));
    }

    @Transactional
    public PayrollPeriodResponse compute(Long id) {
        PayrollPeriod period = getPeriod(id);
        if (period.getStatus() == PayrollPeriodStatus.LOCKED) {
            throw new IllegalArgumentException("Locked payroll periods cannot be recomputed");
        }

        entries.deleteByPayrollPeriodId(period.getId());
        days.deleteByPayrollPeriodId(period.getId());
        debtLedger.deleteByPayrollPeriodIdAndType(period.getId(), DebtLedgerType.PAYROLL_DEDUCTION);

        List<TicketAssignment> assignments = ticketAssignments.findActiveInDateRange(period.getStartDate(),
                period.getEndDate());
        List<EmployeeAdvance> periodAdvances = advances.findByAdvanceDateBetween(period.getStartDate(), period.getEndDate());
        periodAdvances.forEach(debtLedgerService::recordAdvance);

        Map<Long, EmployeeAccumulator> byEmployee = new HashMap<>();
        Map<DayKey, DayAccumulator> byDay = new HashMap<>();
        for (TicketAssignment assignment : assignments) {
            Employee employee = assignment.getEmployee();
            BigDecimal share = assignment.getSharePct().divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal revenueShare = assignment.getTicket().isCourtesy()
                    ? ZERO
                    : assignment.getTicket().getPriceAmount().multiply(share);
            byEmployee.computeIfAbsent(employee.getId(), ignored -> new EmployeeAccumulator(employee))
                    .add(share);
            LocalDate workDate = assignment.getTicket().getBusinessDay().getBusinessDate();
            byDay.computeIfAbsent(new DayKey(employee.getId(), workDate), ignored -> new DayAccumulator(employee, workDate))
                    .add(share, revenueShare);
        }

        for (EmployeeAdvance advance : periodAdvances) {
            byEmployee.computeIfAbsent(advance.getEmployee().getId(), ignored -> new EmployeeAccumulator(advance.getEmployee()));
        }

        for (DayAccumulator day : byDay.values()) {
            days.save(new PayrollDay(period, day.employee, day.workDate, money(day.carsWashed), money(day.ticketRevenue)));
        }

        for (EmployeeAccumulator accumulator : byEmployee.values()) {
            Employee employee = accumulator.employee;
            BigDecimal baseSalary = money(employee.getBaseWeeklySalary());
            BigDecimal carsWashed = money(accumulator.carsWashed);
            BigDecimal carsBonus = money(carsWashed.multiply(carsBonusRate));
            BigDecimal debtBalance = debtLedgerService.balance(employee);
            BigDecimal grossPay = baseSalary.add(carsBonus);
            BigDecimal advancesDeducted = money(debtBalance.min(grossPay).max(ZERO));
            BigDecimal netPay = money(grossPay.subtract(advancesDeducted));
            entries.save(new PayrollEntry(period, employee, carsWashed, baseSalary, carsBonusRate, carsBonus,
                    ZERO, ZERO, advancesDeducted, netPay));
            debtLedgerService.recordPayrollDeduction(employee, period, advancesDeducted);
        }

        period.markComputed();
        periods.save(period);
        return response(period);
    }

    @Transactional
    public PayrollPeriodResponse lock(Long id) {
        PayrollPeriod period = getPeriod(id);
        if (period.getStatus() == PayrollPeriodStatus.LOCKED) {
            return response(period);
        }
        if (period.getStatus() != PayrollPeriodStatus.COMPUTED) {
            throw new IllegalArgumentException("Payroll period must be computed before locking");
        }
        period.lock();
        periods.save(period);
        return response(period);
    }

    private PayrollPeriod getPeriod(Long id) {
        return periods.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll period not found"));
    }

    private PayrollPeriodResponse response(PayrollPeriod period) {
        return PayrollPeriodResponse.from(period, entries.findByPayrollPeriodIdOrderByEmployeeFullNameAsc(period.getId()),
                days.findByPayrollPeriodIdOrderByWorkDateAscEmployeeFullNameAsc(period.getId()));
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private record DayKey(Long employeeId, LocalDate workDate) {
    }

    private static final class EmployeeAccumulator {
        private final Employee employee;
        private BigDecimal carsWashed = ZERO;

        private EmployeeAccumulator(Employee employee) {
            this.employee = employee;
        }

        private void add(BigDecimal cars) {
            carsWashed = carsWashed.add(cars);
        }
    }

    private static final class DayAccumulator {
        private final Employee employee;
        private final LocalDate workDate;
        private BigDecimal carsWashed = ZERO;
        private BigDecimal ticketRevenue = ZERO;

        private DayAccumulator(Employee employee, LocalDate workDate) {
            this.employee = employee;
            this.workDate = workDate;
        }

        private void add(BigDecimal cars, BigDecimal revenue) {
            carsWashed = carsWashed.add(cars);
            ticketRevenue = ticketRevenue.add(revenue);
        }
    }
}
