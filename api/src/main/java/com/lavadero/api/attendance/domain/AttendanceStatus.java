package com.lavadero.api.attendance.domain;

/**
 * Mirrors the legacy Excel status codes per day cell.
 *
 * <p>Payroll treats them as follows:
 * <ul>
 *   <li>{@link #PRESENT} — counts toward present days and toward rest-day pay.</li>
 *   <li>{@link #ABSENT} — triggers absence penalty (sueldo: lose a day + fixed
 *       penalty; commission: tier reduction at 2+ absences).</li>
 *   <li>{@link #REST_DAY} — scheduled day off, counts toward present-day total
 *       so rest-day pay still triggers on a full week.</li>
 *   <li>{@link #SICK}, {@link #SUSPENDED}, {@link #WEATHER} — no penalty, not
 *       counted as either present or absent. Employee earns no commission /
 *       sueldo that day but doesn't lose accrued pay.</li>
 * </ul>
 */
public enum AttendanceStatus {
    PRESENT,
    ABSENT,
    REST_DAY,
    SICK,
    SUSPENDED,
    WEATHER;

    public boolean countsAsAbsence() {
        return this == ABSENT;
    }

    public boolean countsAsPresent() {
        return this == PRESENT || this == REST_DAY;
    }
}
