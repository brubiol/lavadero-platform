package com.lavadero.api.reports.service;

import com.lavadero.api.cash.domain.ShiftCloseSummary;
import com.lavadero.api.cash.repository.ShiftCloseSummaryRepository;
import com.lavadero.api.inventory.domain.ProductMovement;
import com.lavadero.api.inventory.repository.ProductMovementRepository;
import com.lavadero.api.money.domain.EmployeeAdvance;
import com.lavadero.api.money.domain.Expense;
import com.lavadero.api.money.domain.Withdrawal;
import com.lavadero.api.money.repository.EmployeeAdvanceRepository;
import com.lavadero.api.money.repository.ExpenseRepository;
import com.lavadero.api.money.repository.WithdrawalRepository;
import com.lavadero.api.operations.domain.Ticket;
import com.lavadero.api.payroll.domain.PayrollEntry;
import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.repository.PayrollEntryRepository;
import com.lavadero.api.payroll.repository.PayrollPeriodRepository;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
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
public class ExcelExportService {
    private final DailySummaryService reports;
    private final ExpenseRepository expenses;
    private final WithdrawalRepository withdrawals;
    private final EmployeeAdvanceRepository advances;
    private final ShiftCloseSummaryRepository closeSummaries;
    private final ProductMovementRepository inventoryMovements;
    private final PayrollPeriodRepository payrollPeriods;
    private final PayrollEntryRepository payrollEntries;

    public ExcelExportService(DailySummaryService reports, ExpenseRepository expenses,
            WithdrawalRepository withdrawals, EmployeeAdvanceRepository advances,
            ShiftCloseSummaryRepository closeSummaries, ProductMovementRepository inventoryMovements,
            PayrollPeriodRepository payrollPeriods, PayrollEntryRepository payrollEntries) {
        this.reports = reports;
        this.expenses = expenses;
        this.withdrawals = withdrawals;
        this.advances = advances;
        this.closeSummaries = closeSummaries;
        this.inventoryMovements = inventoryMovements;
        this.payrollPeriods = payrollPeriods;
        this.payrollEntries = payrollEntries;
    }

    @Transactional(readOnly = true)
    public byte[] export(String type, LocalDate from, LocalDate to) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Styles styles = Styles.create(workbook);
            writeCover(workbook, styles, type, from, to);
            writeTickets(workbook, styles, reports.ticketsInRange(from, to));
            writeExpenses(workbook, styles, expenses.findByExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(from, to));
            writeWithdrawals(workbook, styles, withdrawals.findByWithdrawalDateBetweenOrderByWithdrawalDateDescCreatedAtDesc(from, to));
            writeAdvances(workbook, styles, advances.findByAdvanceDateBetween(from, to));
            writeShiftClose(workbook, styles,
                    closeSummaries.findByShiftBusinessDayBusinessDateBetweenOrderByShiftBusinessDayBusinessDateAsc(from, to));
            writeInventory(workbook, styles, inventoryMovements.findByMovementDateBetweenOrderByMovementDateAscCreatedAtAsc(
                    DailySummaryService.startInstant(from), DailySummaryService.endInstant(to)));
            writePayroll(workbook, styles,
                    payrollPeriods.findByStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByStartDateAsc(to, from));
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("Could not create Excel export", ex);
        }
    }

    private void writeCover(Workbook workbook, Styles styles, String type, LocalDate from, LocalDate to) {
        Sheet sheet = workbook.createSheet("Resumen");
        row(sheet, 0, "Lavadero export", "");
        row(sheet, 1, "Tipo", type);
        row(sheet, 2, "Desde", from.toString());
        row(sheet, 3, "Hasta", to.toString());
        row(sheet, 4, "Generado", Instant.now().toString());
        sheet.getRow(0).getCell(0).setCellStyle(styles.header);
        autosize(sheet, 2);
    }

    private void writeTickets(Workbook workbook, Styles styles, List<Ticket> tickets) {
        Sheet sheet = workbook.createSheet("Tickets");
        header(sheet, styles, "Fecha", "Nota", "Servicio", "Tamano", "Vehiculo", "Lavadores", "Estado", "Cortesia",
                "Moneda", "Importe");
        int rowIndex = 1;
        BigDecimal total = BigDecimal.ZERO;
        for (Ticket ticket : tickets) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, ticket.getBusinessDay().getBusinessDate().toString());
            text(row, 1, ticket.getNotaNumber());
            text(row, 2, ticket.getServiceType().getName());
            text(row, 3, ticket.getVehicleSize().getName());
            text(row, 4, ticket.getVehicleDescription());
            text(row, 5, ticket.getAssignments().stream()
                    .map(assignment -> assignment.getEmployee().getFullName())
                    .reduce((left, right) -> left + ", " + right).orElse(""));
            text(row, 6, ticket.getStatus().name());
            text(row, 7, ticket.isCourtesy() ? "SI" : "NO");
            text(row, 8, ticket.getCurrency().name());
            money(row, 9, ticket.getPriceAmount(), styles.money);
            if (!ticket.isCourtesy() && ticket.getStatus().name().equals("ACTIVE")) {
                total = total.add(ticket.getPriceAmount());
            }
        }
        totalRow(sheet, styles, rowIndex, "Total ingresos tickets", 9, total);
        autosize(sheet, 10);
    }

    private void writeExpenses(Workbook workbook, Styles styles, List<Expense> rows) {
        Sheet sheet = workbook.createSheet("Expenses");
        header(sheet, styles, "Fecha", "Categoria", "Descripcion", "Monto");
        int rowIndex = 1;
        BigDecimal total = BigDecimal.ZERO;
        for (Expense expense : rows) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, expense.getExpenseDate().toString());
            text(row, 1, expense.getCategory().name());
            text(row, 2, expense.getDescription());
            money(row, 3, expense.getAmount(), styles.money);
            total = total.add(expense.getAmount());
        }
        totalRow(sheet, styles, rowIndex, "Total gastos", 3, total);
        autosize(sheet, 4);
    }

    private void writeWithdrawals(Workbook workbook, Styles styles, List<Withdrawal> rows) {
        Sheet sheet = workbook.createSheet("Withdrawals");
        header(sheet, styles, "Fecha", "Motivo", "Monto");
        int rowIndex = 1;
        BigDecimal total = BigDecimal.ZERO;
        for (Withdrawal withdrawal : rows) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, withdrawal.getWithdrawalDate().toString());
            text(row, 1, withdrawal.getReason());
            money(row, 2, withdrawal.getAmount(), styles.money);
            total = total.add(withdrawal.getAmount());
        }
        totalRow(sheet, styles, rowIndex, "Total retiros", 2, total);
        autosize(sheet, 3);
    }

    private void writeAdvances(Workbook workbook, Styles styles, List<EmployeeAdvance> rows) {
        Sheet sheet = workbook.createSheet("Advances");
        header(sheet, styles, "Fecha", "Lavador", "Motivo", "Monto");
        int rowIndex = 1;
        BigDecimal total = BigDecimal.ZERO;
        for (EmployeeAdvance advance : rows) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, advance.getAdvanceDate().toString());
            text(row, 1, advance.getEmployee().getFullName());
            text(row, 2, advance.getReason());
            money(row, 3, advance.getAmount(), styles.money);
            total = total.add(advance.getAmount());
        }
        totalRow(sheet, styles, rowIndex, "Total prestamos", 3, total);
        autosize(sheet, 4);
    }

    private void writeShiftClose(Workbook workbook, Styles styles, List<ShiftCloseSummary> rows) {
        Sheet sheet = workbook.createSheet("Shift Close");
        header(sheet, styles, "Fecha", "Turno", "Esperado", "Contado", "Diferencia", "Motivo");
        int rowIndex = 1;
        for (ShiftCloseSummary close : rows) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, close.getShift().getBusinessDay().getBusinessDate().toString());
            text(row, 1, close.getShift().getShiftType().name());
            money(row, 2, close.getExpectedCash(), styles.money);
            money(row, 3, close.getTotalCounted(), styles.money);
            money(row, 4, close.getVariance(), styles.money);
            text(row, 5, close.getClosingReason());
        }
        autosize(sheet, 6);
    }

    private void writeInventory(Workbook workbook, Styles styles, List<ProductMovement> rows) {
        Sheet sheet = workbook.createSheet("Inventory");
        header(sheet, styles, "Fecha", "Producto", "Tipo", "Cantidad", "Precio unitario", "Total", "Motivo");
        int rowIndex = 1;
        for (ProductMovement movement : rows) {
            Row row = sheet.createRow(rowIndex++);
            text(row, 0, movement.getMovementDate().toString());
            text(row, 1, movement.getProduct().getName());
            text(row, 2, movement.getMovementType().name());
            money(row, 3, movement.getQuantity(), styles.number);
            money(row, 4, movement.getUnitPrice(), styles.money);
            money(row, 5, movement.getTotalAmount(), styles.money);
            text(row, 6, movement.getReason());
        }
        autosize(sheet, 7);
    }

    private void writePayroll(Workbook workbook, Styles styles, List<PayrollPeriod> periods) {
        Sheet sheet = workbook.createSheet("Payroll");
        header(sheet, styles, "Periodo", "Estado", "Lavador", "Carros", "Base", "Bono", "Comision", "Extras",
                "Deducciones", "Prestamos", "Bruto", "Neto");
        int rowIndex = 1;
        for (PayrollPeriod period : periods) {
            for (PayrollEntry entry : payrollEntries.findByPayrollPeriodIdOrderByEmployeeFullNameAsc(period.getId())) {
                Row row = sheet.createRow(rowIndex++);
                text(row, 0, period.getStartDate() + " al " + period.getEndDate());
                text(row, 1, period.getStatus().name());
                text(row, 2, entry.getEmployee().getFullName());
                money(row, 3, entry.getCarsWashed(), styles.number);
                money(row, 4, entry.getBaseSalary(), styles.money);
                money(row, 5, entry.getCarsBonus(), styles.money);
                money(row, 6, entry.getCommissions(), styles.money);
                money(row, 7, entry.getManualEarnings(), styles.money);
                money(row, 8, entry.getManualDeductions(), styles.money);
                money(row, 9, entry.getAdvancesDeducted(), styles.money);
                money(row, 10, entry.getGrossPay(), styles.money);
                money(row, 11, entry.getNetPay(), styles.money);
            }
        }
        autosize(sheet, 12);
    }

    private void header(Sheet sheet, Styles styles, String... labels) {
        Row row = sheet.createRow(0);
        for (int i = 0; i < labels.length; i++) {
            text(row, i, labels[i]);
            row.getCell(i).setCellStyle(styles.header);
        }
    }

    private void totalRow(Sheet sheet, Styles styles, int index, String label, int moneyColumn, BigDecimal total) {
        Row row = sheet.createRow(index);
        text(row, 0, label);
        row.getCell(0).setCellStyle(styles.header);
        money(row, moneyColumn, total, styles.money);
        row.getCell(moneyColumn).setCellStyle(styles.moneyBold);
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

    private record Styles(CellStyle header, CellStyle money, CellStyle moneyBold, CellStyle number) {
        static Styles create(Workbook workbook) {
            Font bold = workbook.createFont();
            bold.setBold(true);

            CellStyle header = workbook.createCellStyle();
            header.setFont(bold);

            DataFormat format = workbook.createDataFormat();
            CellStyle money = workbook.createCellStyle();
            money.setDataFormat(format.getFormat("$#,##0.00;-$#,##0.00"));

            CellStyle moneyBold = workbook.createCellStyle();
            moneyBold.cloneStyleFrom(money);
            moneyBold.setFont(bold);

            CellStyle number = workbook.createCellStyle();
            number.setDataFormat(format.getFormat("#,##0.00"));

            return new Styles(header, money, moneyBold, number);
        }
    }
}
