package com.lavadero.api.payroll.service;

import com.lavadero.api.audit.service.AuditService;
import com.lavadero.api.payroll.domain.PayrollAdjustment;
import com.lavadero.api.payroll.domain.PayrollAdjustmentType;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.repository.PayrollAdjustmentRepository;
import com.lavadero.api.payroll.repository.PayrollEntryRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PayrollExportService {
    private final PayrollService payroll;
    private final PayrollEntryRepository entries;
    private final PayrollAdjustmentRepository adjustments;
    private final AuditService audit;

    public PayrollExportService(PayrollService payroll, PayrollEntryRepository entries,
            PayrollAdjustmentRepository adjustments, AuditService audit) {
        this.payroll = payroll;
        this.entries = entries;
        this.adjustments = adjustments;
        this.audit = audit;
    }

    @Transactional
    public byte[] exportPeriod(Long periodId) {
        PayrollPeriod period = payroll.getPeriod(periodId);
        List<PayrollEntry> payrollEntries = entries.findByPayrollPeriodIdOrderByEmployeeFullNameAsc(periodId);
        Map<Long, List<PayrollAdjustment>> byEmployee = adjustments.findByPayrollPeriodId(periodId).stream()
                .collect(Collectors.groupingBy(adjustment -> adjustment.getEmployee().getId()));

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Styles styles = Styles.create(workbook);
            Sheet sheet = workbook.createSheet("Nomina");
            row(sheet, 0, "Periodo", period.getStartDate() + " al " + period.getEndDate());
            row(sheet, 1, "Estado", period.getStatus().name());
            header(sheet, styles, 3, "Lavador", "Tipo", "Carros", "Sueldo", "Comision", "Productividad",
                    "Extras", "Deducciones", "Prestamos", "Neto", "Notas");

            int rowIndex = 4;
            Totals totals = new Totals();
            for (PayrollEntry entry : payrollEntries) {
                List<PayrollAdjustment> employeeAdjustments = byEmployee.getOrDefault(entry.getEmployee().getId(), List.of());
                Row row = sheet.createRow(rowIndex++);
                text(row, 0, entry.getEmployee().getFullName());
                text(row, 1, entry.getEmployee().getPayrollType().name());
                money(row, 2, entry.getCarsWashed(), styles.number);
                money(row, 3, entry.getBaseSalary(), styles.money);
                money(row, 4, entry.getCommissions(), styles.money);
                money(row, 5, entry.getCarsBonus(), styles.money);
                money(row, 6, entry.getManualEarnings(), styles.money);
                money(row, 7, entry.getManualDeductions(), styles.money);
                money(row, 8, entry.getAdvancesDeducted(), styles.money);
                money(row, 9, entry.getNetPay(), styles.money);
                text(row, 10, notes(employeeAdjustments));
                totals.add(entry);
            }

            Row total = sheet.createRow(rowIndex);
            text(total, 0, "Totales");
            total.getCell(0).setCellStyle(styles.header);
            money(total, 2, totals.cars, styles.number);
            money(total, 3, totals.salary, styles.moneyBold);
            money(total, 4, totals.commission, styles.moneyBold);
            money(total, 5, totals.productivity, styles.moneyBold);
            money(total, 6, totals.earnings, styles.moneyBold);
            money(total, 7, totals.deductions, styles.moneyBold);
            money(total, 8, totals.advances, styles.moneyBold);
            money(total, 9, totals.net, styles.moneyBold);
            autosize(sheet, 11);
            workbook.write(output);
            audit.record("PAYROLL_EXPORTED", "PAYROLL_PERIOD", period.getId(), null,
                    period.getStartDate() + " al " + period.getEndDate());
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create payroll export", ex);
        }
    }

    private String notes(List<PayrollAdjustment> rows) {
        return rows.stream()
                .map(row -> row.getConcept() + " " + row.getType().name() + " " + row.getAmount()
                        + (row.getNote() == null ? "" : " (" + row.getNote() + ")"))
                .collect(Collectors.joining("; "));
    }

    private void header(Sheet sheet, Styles styles, int index, String... labels) {
        Row row = sheet.createRow(index);
        for (int i = 0; i < labels.length; i++) {
            text(row, i, labels[i]);
            row.getCell(i).setCellStyle(styles.header);
        }
    }

    private void row(Sheet sheet, int index, String label, String value) {
        Row row = sheet.createRow(index);
        text(row, 0, label);
        text(row, 1, value);
    }

    private void text(Row row, int index, String value) {
        row.createCell(index).setCellValue(value == null ? "" : value);
    }

    private void money(Row row, int index, BigDecimal value, CellStyle style) {
        row.createCell(index).setCellValue(value == null ? 0 : value.doubleValue());
        row.getCell(index).setCellStyle(style);
    }

    private void autosize(Sheet sheet, int columns) {
        for (int i = 0; i < columns; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private static final class Totals {
        private BigDecimal cars = BigDecimal.ZERO;
        private BigDecimal salary = BigDecimal.ZERO;
        private BigDecimal commission = BigDecimal.ZERO;
        private BigDecimal productivity = BigDecimal.ZERO;
        private BigDecimal earnings = BigDecimal.ZERO;
        private BigDecimal deductions = BigDecimal.ZERO;
        private BigDecimal advances = BigDecimal.ZERO;
        private BigDecimal net = BigDecimal.ZERO;

        private void add(PayrollEntry entry) {
            cars = cars.add(entry.getCarsWashed());
            salary = salary.add(entry.getBaseSalary());
            commission = commission.add(entry.getCommissions());
            productivity = productivity.add(entry.getCarsBonus());
            earnings = earnings.add(entry.getManualEarnings());
            deductions = deductions.add(entry.getManualDeductions());
            advances = advances.add(entry.getAdvancesDeducted());
            net = net.add(entry.getNetPay());
        }
    }

    private record Styles(CellStyle header, CellStyle money, CellStyle moneyBold, CellStyle number) {
        static Styles create(Workbook workbook) {
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            CellStyle header = workbook.createCellStyle();
            header.setFont(headerFont);

            DataFormat dataFormat = workbook.createDataFormat();
            CellStyle money = workbook.createCellStyle();
            money.setDataFormat(dataFormat.getFormat("$#,##0.00"));
            CellStyle moneyBold = workbook.createCellStyle();
            moneyBold.cloneStyleFrom(money);
            Font bold = workbook.createFont();
            bold.setBold(true);
            moneyBold.setFont(bold);
            CellStyle number = workbook.createCellStyle();
            number.setDataFormat(dataFormat.getFormat("#,##0.00"));
            return new Styles(header, money, moneyBold, number);
        }
    }
}
