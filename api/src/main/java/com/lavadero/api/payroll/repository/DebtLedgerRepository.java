package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.DebtLedgerEntry;
import com.lavadero.api.payroll.domain.DebtLedgerType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DebtLedgerRepository extends JpaRepository<DebtLedgerEntry, Long> {
    boolean existsByEmployeeAdvanceIdAndType(Long employeeAdvanceId, DebtLedgerType type);

    List<DebtLedgerEntry> findByEmployeeIdOrderByEntryDateAscCreatedAtAsc(Long employeeId);

    void deleteByPayrollPeriodIdAndType(Long payrollPeriodId, DebtLedgerType type);

    void deleteByEmployeeAdvanceIdAndType(Long employeeAdvanceId, DebtLedgerType type);
}
