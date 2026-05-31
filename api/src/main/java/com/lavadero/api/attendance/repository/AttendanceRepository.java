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

    // Only true ABSENT (falta) triggers the absence penalty. SICK / SUSPENDED /
    // WEATHER are explicitly excluded so an employee who got sick doesn't lose pay.
    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employee.id = :employeeId " +
           "AND a.workDate BETWEEN :from AND :to AND a.status = com.lavadero.api.attendance.domain.AttendanceStatus.ABSENT")
    long countAbsences(@Param("employeeId") Long employeeId,
                       @Param("from") LocalDate from,
                       @Param("to") LocalDate to);

    // PRESENT and REST_DAY both count — descanso is a scheduled day off that
    // still counts toward the 7-day attendance threshold for rest-day pay.
    @Query("SELECT COUNT(a) FROM AttendanceRecord a WHERE a.employee.id = :employeeId " +
           "AND a.workDate BETWEEN :from AND :to AND a.status IN " +
           "(com.lavadero.api.attendance.domain.AttendanceStatus.PRESENT, com.lavadero.api.attendance.domain.AttendanceStatus.REST_DAY)")
    long countPresentDays(@Param("employeeId") Long employeeId,
                          @Param("from") LocalDate from,
                          @Param("to") LocalDate to);
}
