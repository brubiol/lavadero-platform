package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.PayrollDay;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollDayRepository extends JpaRepository<PayrollDay, Long> {
    @EntityGraph(attributePaths = {"employee"})
    List<PayrollDay> findByPayrollPeriodIdOrderByWorkDateAscEmployeeFullNameAsc(Long payrollPeriodId);

    void deleteByPayrollPeriodId(Long payrollPeriodId);
}
