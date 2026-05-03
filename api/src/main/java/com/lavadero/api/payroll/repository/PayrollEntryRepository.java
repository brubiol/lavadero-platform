package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.PayrollEntry;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollEntryRepository extends JpaRepository<PayrollEntry, Long> {
    @EntityGraph(attributePaths = {"employee"})
    List<PayrollEntry> findByPayrollPeriodIdOrderByEmployeeFullNameAsc(Long payrollPeriodId);

    void deleteByPayrollPeriodId(Long payrollPeriodId);
}
