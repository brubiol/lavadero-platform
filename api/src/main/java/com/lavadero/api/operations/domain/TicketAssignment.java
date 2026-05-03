package com.lavadero.api.operations.domain;

import com.lavadero.api.catalog.domain.Employee;
import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "ticket_assignments")
public class TicketAssignment extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @Column(name = "share_pct", nullable = false, precision = 5, scale = 2)
    private BigDecimal sharePct;

    protected TicketAssignment() {
    }

    public TicketAssignment(Employee employee, BigDecimal sharePct) {
        this.employee = employee;
        this.sharePct = sharePct;
    }

    public Long getId() {
        return id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public Employee getEmployee() {
        return employee;
    }

    public BigDecimal getSharePct() {
        return sharePct;
    }

    void attachTo(Ticket ticket) {
        this.ticket = ticket;
    }
}
