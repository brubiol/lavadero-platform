package com.lavadero.api.ai.calendar.domain;

import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;

/**
 * One row per (date, holiday name). A single date can have multiple rows if both
 * MX and US observe distinct holidays that day (Cinco de Mayo, Navidad, etc.).
 */
@Entity
@Table(name = "holiday_calendar")
public class HolidayCalendar extends AuditedEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "holiday_date", nullable = false)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(nullable = false, length = 4)
    private String country;

    @Column(name = "drives_border_traffic", nullable = false)
    private boolean drivesBorderTraffic;

    protected HolidayCalendar() {
    }

    public HolidayCalendar(LocalDate holidayDate, String name, String country, boolean drivesBorderTraffic) {
        this.holidayDate = holidayDate;
        this.name = name;
        this.country = country;
        this.drivesBorderTraffic = drivesBorderTraffic;
    }

    public Long getId() { return id; }
    public LocalDate getHolidayDate() { return holidayDate; }
    public String getName() { return name; }
    public String getCountry() { return country; }
    public boolean isDrivesBorderTraffic() { return drivesBorderTraffic; }
}
