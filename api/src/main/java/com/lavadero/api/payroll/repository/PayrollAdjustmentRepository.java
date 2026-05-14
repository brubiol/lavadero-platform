package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.PayrollAdjustment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollAdjustmentRepository extends JpaRepository<PayrollAdjustment, Long> {
    List<PayrollAdjustment> findByPayrollPeriodIdOrderByEmployeeFullNameAscCreatedAtAsc(Long payrollPeriodId);

    List<PayrollAdjustment> findByPayrollPeriodId(Long payrollPeriodId);
}
