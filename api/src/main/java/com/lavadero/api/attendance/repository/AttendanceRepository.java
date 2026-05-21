package com.lavadero.api.attendance.repository;

import com.lavadero.api.attendance.domain.AttendanceRecord;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AttendanceRepository extends JpaRepository<AttendanceRecord, Long> {

    @EntityGraph(attributePaths = {"employee"})
    List<AttendanceRecord> findByWorkDateOrderByEmployeeFullNameAsc(LocalDate workDate);

    @EntityGraph(attributePaths = {"employee"})
    List<AttendanceRecord> findByEmployeeIdAndWorkDateBetweenOrderByWorkDateAsc(
            Long employeeId, LocalDate from, LocalDate to);

    @EntityGraph(attributePaths = {"employee"})
    Optional<AttendanceRecord> findByTenantIdAndEmployeeIdAndWorkDate(
            Long tenantId, Long employeeId, LocalDate workDate);

    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employee.id = :employeeId " +
           "AND a.workDate BETWEEN :from AND :to AND a.absence = true")
    long countAbsences(@Param("employeeId") Long employeeId,
                       @Param("from") LocalDate from,
                       @Param("to") LocalDate to);

    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employee.id = :employeeId " +
           "AND a.workDate BETWEEN :from AND :to AND a.absence = false")
    long countPresentDays(@Param("employeeId") Long employeeId,
                          @Param("from") LocalDate from,
                          @Param("to") LocalDate to);
}
