package com.lavadero.api.payroll.service;

import com.lavadero.api.attendance.repository.AttendanceRepository;
import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.catalog.domain.PayrollType;
import com.lavadero.api.catalog.repository.EmployeeRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.operations.domain.TicketAssignment;
import com.lavadero.api.operations.repository.TicketAssignmentRepository;
import com.lavadero.api.payroll.domain.DebtLedgerType;
import com.lavadero.api.payroll.domain.PayrollAdjustment;
import com.lavadero.api.payroll.domain.PayrollAdjustmentType;
import com.lavadero.api.payroll.domain.PayrollDay;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import com.lavadero.api.payroll.repository.DebtLedgerRepository;
import com.lavadero.api.payroll.repository.PayrollAdjustmentRepository;
import com.lavadero.api.payroll.repository.PayrollDayRepository;
import com.lavadero.api.payroll.repository.PayrollEntryRepository;
import com.lavadero.api.payroll.repository.PayrollPeriodRepository;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollAdjustmentRequest;
import com.lavadero.api.payroll.web.PayrollDtos.CreatePayrollPeriodRequest;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollAdjustmentResponse;
import com.lavadero.api.payroll.web.PayrollDtos.PayrollPeriodResponse;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayrollService {
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100.00");

    private static final BigDecimal ABSENCE_RATE_2 = new BigDecimal("15.00");
    private static final BigDecimal ABSENCE_RATE_3 = new BigDecimal("10.00");

    // Weekly salaries cover 6 working days; the 7th is the paid rest day.
    private static final BigDecimal WORK_DAYS_PER_WEEK = new BigDecimal("6");
    private static final long FULL_WEEK_ATTENDANCE = 7;

    private final PayrollPeriodRepository periods;
    private final PayrollEntryRepository entries;
    private final PayrollDayRepository days;
    private final PayrollAdjustmentRepository adjustments;
    private final DebtLedgerRepository debtLedger;
    private final EmployeeRepository employees;
    private final EmployeeAdvanceRepository advances;
    private final TicketAssignmentRepository ticketAssignments;
    private final AttendanceRepository attendance;
    private final DebtLedgerService debtLedgerService;
    private final AuditService audit;

    public PayrollService(PayrollPeriodRepository periods, PayrollEntryRepository entries, PayrollDayRepository days,
            PayrollAdjustmentRepository adjustments, DebtLedgerRepository debtLedger, EmployeeRepository employees,
            EmployeeAdvanceRepository advances, TicketAssignmentRepository ticketAssignments,
            AttendanceRepository attendance, DebtLedgerService debtLedgerService, AuditService audit) {
        this.periods = periods;
        this.entries = entries;
        this.days = days;
        this.adjustments = adjustments;
        this.debtLedger = debtLedger;
        this.employees = employees;
        this.advances = advances;
        this.ticketAssignments = ticketAssignments;
        this.attendance = attendance;
        this.debtLedgerService = debtLedgerService;
        this.audit = audit;
    }

    @Transactional
    public PayrollPeriodResponse createPeriod(CreatePayrollPeriodRequest request) {
        if (request.startDate().getDayOfWeek() != DayOfWeek.SUNDAY) {
            throw new IllegalArgumentException("Payroll period must start on Sunday");
        }
        PayrollPeriod period = periods.save(new PayrollPeriod(request.startDate(), request.startDate().plusDays(6)));
        audit.record("PAYROLL_PERIOD_CREATED", "PAYROLL_PERIOD", period.getId(), null,
                period.getStartDate() + " al " + period.getEndDate());
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
        entries.flush();
        days.flush();
        debtLedger.flush();

        List<TicketAssignment> assignments = ticketAssignments.findActiveInDateRange(period.getStartDate(),
                period.getEndDate());
        List<EmployeeAdvance> periodAdvances = advances.findByAdvanceDateBetween(period.getStartDate(), period.getEndDate());
        periodAdvances.forEach(debtLedgerService::recordAdvance);

        Map<Long, EmployeeAccumulator> byEmployee = new HashMap<>();
        Map<DayKey, DayAccumulator> byDay = new HashMap<>();
        Map<Long, AdjustmentTotals> adjustmentsByEmployee = adjustmentTotals(period);
        for (TicketAssignment assignment : assignments) {
            Employee employee = assignment.getEmployee();
            BigDecimal share = assignment.getSharePct().divide(ONE_HUNDRED, 4, RoundingMode.HALF_UP);
            BigDecimal revenueShare = assignment.getTicket().isCourtesy()
                    ? ZERO
                    : assignment.getTicket().getPriceAmount().multiply(share);
            String ticketShift = assignment.getTicket().getShift().getShiftType().name();
            boolean inShift = employee.getPrimaryShift() == null || employee.getPrimaryShift().equals(ticketShift);
            byEmployee.computeIfAbsent(employee.getId(), ignored -> new EmployeeAccumulator(employee))
                    .add(share, inShift);
            LocalDate workDate = assignment.getTicket().getBusinessDay().getBusinessDate();
            byDay.computeIfAbsent(new DayKey(employee.getId(), workDate), ignored -> new DayAccumulator(employee, workDate))
                    .add(share, revenueShare);
        }

        for (EmployeeAdvance advance : periodAdvances) {
            byEmployee.computeIfAbsent(advance.getEmployee().getId(), ignored -> new EmployeeAccumulator(advance.getEmployee()));
        }
        for (PayrollAdjustment adjustment : adjustments.findByPayrollPeriodId(period.getId())) {
            byEmployee.computeIfAbsent(adjustment.getEmployee().getId(), ignored -> new EmployeeAccumulator(adjustment.getEmployee()));
        }
        for (Employee employee : employees.findByActiveTrueOrderByFullNameAsc()) {
            if (employee.getBaseWeeklySalary().signum() > 0) {
                byEmployee.computeIfAbsent(employee.getId(), ignored -> new EmployeeAccumulator(employee));
            }
        }

        for (DayAccumulator day : byDay.values()) {
            days.save(new PayrollDay(period, day.employee, day.workDate, money(day.carsWashed), money(day.ticketRevenue)));
        }

        for (EmployeeAccumulator accumulator : byEmployee.values()) {
            Employee employee = accumulator.employee;
            BigDecimal carsWashed = money(accumulator.inShiftCars.add(accumulator.outOfShiftCars));
            BigDecimal baseSalary = employee.getPayrollType() == PayrollType.SALARY
                    ? salaryBaseFor(employee, period)
                    : ZERO;
            BigDecimal carsBonusRate = employee.getPayrollType() == PayrollType.SALARY
                    ? money(employee.getProductivityBonusRate())
                    : ZERO;
            BigDecimal carsBonus = employee.getPayrollType() == PayrollType.SALARY
                    ? money(carsWashed.multiply(carsBonusRate))
                    : ZERO;
            BigDecimal commissionRate = ZERO;
            BigDecimal outOfShiftRate = ZERO;
            BigDecimal commissions = ZERO;
            if (employee.getPayrollType() == PayrollType.COMMISSION) {
                long absences = attendance.countAbsences(employee.getId(), period.getStartDate(), period.getEndDate());
                BigDecimal baseRate = absences >= 3 ? ABSENCE_RATE_3.min(money(employee.getCommissionRate()))
                        : absences == 2 ? ABSENCE_RATE_2.min(money(employee.getCommissionRate()))
                        : money(employee.getCommissionRate());
                commissionRate = baseRate;
                outOfShiftRate = absences >= 2 ? baseRate.min(money(employee.getOutOfShiftCommissionRate()))
                        : money(employee.getOutOfShiftCommissionRate());
                commissions = money(accumulator.inShiftCars.multiply(commissionRate)
                        .add(accumulator.outOfShiftCars.multiply(outOfShiftRate)));
            }
            AdjustmentTotals manual = adjustmentsByEmployee.getOrDefault(employee.getId(), AdjustmentTotals.ZERO);
            BigDecimal debtBalance = debtLedgerService.balance(employee);
            BigDecimal grossPay = money(baseSalary.add(carsBonus).add(commissions).add(manual.earnings));
            BigDecimal maxDeductions = grossPay.subtract(manual.deductions).max(ZERO);
            BigDecimal advancesDeducted = money(debtBalance.min(maxDeductions).max(ZERO));
            BigDecimal netPay = money(grossPay.subtract(manual.deductions).subtract(advancesDeducted).max(ZERO));
            entries.save(new PayrollEntry(period, employee, carsWashed, baseSalary, carsBonusRate, carsBonus,
                    commissions, ZERO, manual.earnings, manual.deductions, advancesDeducted, grossPay, netPay));
            debtLedgerService.recordPayrollDeduction(employee, period, advancesDeducted);
        }

        period.markComputed();
        periods.save(period);
        audit.record("PAYROLL_COMPUTED", "PAYROLL_PERIOD", period.getId(), null,
                period.getStartDate() + " al " + period.getEndDate());
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
        audit.record("PAYROLL_LOCKED", "PAYROLL_PERIOD", period.getId(), null,
                period.getStartDate() + " al " + period.getEndDate());
        return response(period);
    }

    @Transactional(readOnly = true)
    public List<PayrollAdjustmentResponse> listAdjustments(Long periodId) {
        getPeriod(periodId);
        return adjustments.findByPayrollPeriodIdOrderByEmployeeFullNameAscCreatedAtAsc(periodId).stream()
                .map(PayrollAdjustmentResponse::from)
                .toList();
    }

    @Transactional
    public PayrollAdjustmentResponse createAdjustment(Long periodId, CreatePayrollAdjustmentRequest request) {
        PayrollPeriod period = getPeriod(periodId);
        requireUnlocked(period);
        Employee employee = employees.findById(request.employeeId())
                .orElseThrow(() -> new EntityNotFoundException("Employee not found"));
        PayrollAdjustment adjustment = adjustments.save(new PayrollAdjustment(period, employee, request.type(),
                money(request.amount()), request.concept().trim(), normalize(request.note())));
        audit.record("PAYROLL_ADJUSTMENT_CREATED", "PAYROLL_ADJUSTMENT", adjustment.getId(), request.concept(),
                "Period " + period.getId() + ": " + employee.getFullName() + " " + request.type() + " " + money(request.amount()));
        return PayrollAdjustmentResponse.from(adjustment);
    }

    @Transactional
    public void deleteAdjustment(Long adjustmentId) {
        PayrollAdjustment adjustment = adjustments.findById(adjustmentId)
                .orElseThrow(() -> new EntityNotFoundException("Payroll adjustment not found"));
        requireUnlocked(adjustment.getPayrollPeriod());
        adjustments.delete(adjustment);
        audit.record("PAYROLL_ADJUSTMENT_DELETED", "PAYROLL_ADJUSTMENT", adjustment.getId(),
                adjustment.getConcept(), "Period " + adjustment.getPayrollPeriod().getId() + ": "
                        + adjustment.getEmployee().getFullName() + " " + adjustment.getAmount());
    }

    public PayrollPeriod getPeriod(Long id) {
        return periods.findById(id).orElseThrow(() -> new EntityNotFoundException("Payroll period not found"));
    }

    private PayrollPeriodResponse response(PayrollPeriod period) {
        return PayrollPeriodResponse.from(period, entries.findByPayrollPeriodIdOrderByEmployeeFullNameAsc(period.getId()),
                days.findByPayrollPeriodIdOrderByWorkDateAscEmployeeFullNameAsc(period.getId()),
                adjustments.findByPayrollPeriodIdOrderByEmployeeFullNameAscCreatedAtAsc(period.getId()));
    }

    // Weekly salary adjusted for the period: each absence loses a day's pay plus
    // the employee's fixed penalty; a full 7-day week pays the rest day at the
    // daily rate plus any rest-day premium.
    private BigDecimal salaryBaseFor(Employee employee, PayrollPeriod period) {
        BigDecimal weeklyBase = money(employee.getBaseWeeklySalary());
        BigDecimal dailyRate = weeklyBase.divide(WORK_DAYS_PER_WEEK, 2, RoundingMode.HALF_UP);
        long absences = attendance.countAbsences(employee.getId(), period.getStartDate(), period.getEndDate());
        long presentDays = attendance.countPresentDays(employee.getId(), period.getStartDate(), period.getEndDate());

        BigDecimal restDayPay = presentDays >= FULL_WEEK_ATTENDANCE
                ? money(dailyRate.add(money(employee.getRestDayPremium())))
                : ZERO;
        BigDecimal absenceDeduction = money(dailyRate.add(money(employee.getAbsenceDayPenalty()))
                .multiply(BigDecimal.valueOf(absences)));
        return money(weeklyBase.add(restDayPay).subtract(absenceDeduction).max(ZERO));
    }

    private BigDecimal money(BigDecimal value) {
        return (value == null ? ZERO : value).setScale(2, RoundingMode.HALF_UP);
    }

    private void requireUnlocked(PayrollPeriod period) {
        if (period.getStatus() == PayrollPeriodStatus.LOCKED) {
            throw new IllegalArgumentException("Locked payroll periods cannot be changed");
        }
    }

    private Map<Long, AdjustmentTotals> adjustmentTotals(PayrollPeriod period) {
        Map<Long, AdjustmentTotals> result = new HashMap<>();
        for (PayrollAdjustment adjustment : adjustments.findByPayrollPeriodId(period.getId())) {
            result.computeIfAbsent(adjustment.getEmployee().getId(), ignored -> new AdjustmentTotals())
                    .add(adjustment);
        }
        return result;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record DayKey(Long employeeId, LocalDate workDate) {
    }

    private static final class AdjustmentTotals {
        private static final AdjustmentTotals ZERO = new AdjustmentTotals();

        private BigDecimal earnings = PayrollService.ZERO;
        private BigDecimal deductions = PayrollService.ZERO;

        private void add(PayrollAdjustment adjustment) {
            if (adjustment.getType() == PayrollAdjustmentType.EARNING) {
                earnings = earnings.add(adjustment.getAmount());
            } else {
                deductions = deductions.add(adjustment.getAmount());
            }
        }
    }

    private static final class EmployeeAccumulator {
        private final Employee employee;
        private BigDecimal inShiftCars = ZERO;
        private BigDecimal outOfShiftCars = ZERO;

        private EmployeeAccumulator(Employee employee) {
            this.employee = employee;
        }

        private void add(BigDecimal cars, boolean inShift) {
            if (inShift) {
                inShiftCars = inShiftCars.add(cars);
            } else {
                outOfShiftCars = outOfShiftCars.add(cars);
            }
        }

        private void add(BigDecimal cars) {
            inShiftCars = inShiftCars.add(cars);
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
