package com.lavadero.api.payroll.repository;

import com.lavadero.api.payroll.domain.PayrollPeriod;
import com.lavadero.api.payroll.domain.PayrollPeriodStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod, Long> {
    List<PayrollPeriod> findAllByOrderByStartDateDesc();

    List<PayrollPeriod> findByStatusOrderByStartDateDesc(PayrollPeriodStatus status);
}
