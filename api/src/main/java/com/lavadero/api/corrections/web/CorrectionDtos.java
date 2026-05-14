package com.lavadero.api.corrections.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class CorrectionDtos {
    private CorrectionDtos() {
    }

    public record CorrectionRequest(@NotBlank @Size(max = 500) String reason) {
    }
}
