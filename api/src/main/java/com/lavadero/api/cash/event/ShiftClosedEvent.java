package com.lavadero.api.cash.event;

import java.time.LocalDate;

/** Published after a shift close transaction commits. Used by advisory listeners (AI, notifications). */
public record ShiftClosedEvent(Long shiftId, LocalDate businessDate) {
}
