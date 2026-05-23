package com.lavadero.api.ai.service;

import com.lavadero.api.cash.event.ShiftClosedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * After a shift close commits, automatically run the AI watchdog for that day
 * so any actor-pattern or cash-variance alerts are generated without the
 * owner having to manually trigger them.
 */
@Component
public class AiShiftCloseListener {
    private static final Logger log = LoggerFactory.getLogger(AiShiftCloseListener.class);
    private final AiInsightService ai;

    public AiShiftCloseListener(AiInsightService ai) {
        this.ai = ai;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onShiftClosed(ShiftClosedEvent event) {
        try {
            ai.runAlerts(event.businessDate(), event.businessDate());
        } catch (Exception ex) {
            // Advisory only — never let AI failure cascade into the close path.
            log.warn("AI watchdog failed after shift close for {}: {}", event.businessDate(), ex.getMessage());
        }
    }
}
