package com.lavadero.api.operations.web;

import com.lavadero.api.operations.domain.BusinessDay;
import com.lavadero.api.operations.domain.PaymentMethod;
import com.lavadero.api.operations.domain.PrepaidPackage;
import com.lavadero.api.operations.domain.Shift;
import com.lavadero.api.operations.domain.TicketCurrency;
import com.lavadero.api.operations.repository.PrepaidPackageRepository;
import com.lavadero.api.operations.service.BusinessDayService;
import com.lavadero.api.operations.service.ShiftService;
import com.lavadero.api.operations.web.PrepaidPackageDtos.CreateRequest;
import com.lavadero.api.operations.web.PrepaidPackageDtos.PackageResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

@RestController
@RequestMapping("/api/v1/prepaid-packages")
public class PrepaidPackageController {
    private final PrepaidPackageRepository packages;
    private final BusinessDayService businessDays;
    private final ShiftService shifts;

    public PrepaidPackageController(PrepaidPackageRepository packages,
            BusinessDayService businessDays, ShiftService shifts) {
        this.packages = packages;
        this.businessDays = businessDays;
        this.shifts = shifts;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public PackageResponse create(@Valid @RequestBody CreateRequest request) {
        BusinessDay businessDay = businessDays.get(request.businessDayId());
        Shift shift = shifts.get(request.shiftId());
        TicketCurrency currency = request.currency() != null ? request.currency() : TicketCurrency.MXN;
        PaymentMethod paymentMethod = request.paymentMethod() != null ? request.paymentMethod() : PaymentMethod.CASH;
        Instant occurredAt = request.occurredAt() != null ? request.occurredAt() : Instant.now();
        PrepaidPackage pkg = new PrepaidPackage(businessDay, shift, request.washesIncluded(),
                request.amount(), currency, paymentMethod, request.notes(), occurredAt);
        return PackageResponse.from(packages.save(pkg));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PackageResponse> list(@RequestParam("business_day_id") Long businessDayId) {
        return packages.findByBusinessDayId(businessDayId)
                .stream()
                .map(PackageResponse::from)
                .toList();
    }
}
