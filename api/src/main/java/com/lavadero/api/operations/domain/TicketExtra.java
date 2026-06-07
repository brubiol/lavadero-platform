package com.lavadero.api.operations.domain;

import com.lavadero.api.catalog.domain.ServiceType;
import com.lavadero.api.common.domain.AuditedEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

/**
 * One add-on line on a ticket (Encerado, Lavado de Motor, …). The name and
 * amount are snapshotted from the catalog at capture time so the ticket's price
 * math stays reconstructable even if catalog prices change later.
 */
@Entity
@Table(name = "ticket_extras")
public class TicketExtra extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "service_type_id", nullable = false)
    private ServiceType serviceType;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 3)
    private TicketCurrency currency;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    protected TicketExtra() {
    }

    public TicketExtra(ServiceType serviceType, String name, BigDecimal amount, TicketCurrency currency, int sortOrder) {
        this.serviceType = serviceType;
        this.name = name;
        this.amount = amount;
        this.currency = currency;
        this.sortOrder = sortOrder;
    }

    public Long getId() {
        return id;
    }

    public Ticket getTicket() {
        return ticket;
    }

    public ServiceType getServiceType() {
        return serviceType;
    }

    public String getName() {
        return name;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public TicketCurrency getCurrency() {
        return currency;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    void attachTo(Ticket ticket) {
        this.ticket = ticket;
    }
}
