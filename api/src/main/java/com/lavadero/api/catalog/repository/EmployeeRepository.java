package com.lavadero.api.catalog.repository;

import com.lavadero.api.catalog.domain.Employee;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    List<Employee> findByActiveOrderByFullNameAsc(boolean active);

    List<Employee> findAllByOrderByFullNameAsc();
}
