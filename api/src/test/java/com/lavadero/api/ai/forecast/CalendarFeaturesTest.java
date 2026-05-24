package com.lavadero.api.ai.forecast;

import com.lavadero.api.ai.forecast.domain.CalendarFeatures;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarFeaturesTest {

    @Test
    void should_flag_quincena_post_window_for_15th_to_17th_of_month() {
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 15))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 16))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 17))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 18))).isFalse();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 14))).isFalse();
    }

    @Test
    void should_flag_quincena_post_window_around_month_end() {
        // 31-day month: last 2 days + first 2 of next.
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 30))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 5, 31))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 6, 1))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 6, 2))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 6, 3))).isFalse();
    }

    @Test
    void should_flag_quincena_post_window_around_february_short_month() {
        // 28-day Feb 2026: last 2 days (27, 28) flagged, March 1-2 flagged.
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 2, 27))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 2, 28))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 3, 1))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 3, 2))).isTrue();
        assertThat(CalendarFeatures.isQuincenaPostWindow(LocalDate.of(2026, 2, 26))).isFalse();
    }

    @Test
    void should_emit_zero_vector_when_empty() {
        double[] v = CalendarFeatures.empty(LocalDate.of(2026, 5, 12)).asVector();
        assertThat(v).hasSize(CalendarFeatures.DIMENSION);
        for (double x : v) {
            assertThat(x).isEqualTo(0.0);
        }
    }

    @Test
    void should_encode_booleans_as_one_or_zero() {
        CalendarFeatures cf = new CalendarFeatures(
                LocalDate.of(2026, 5, 10), true, false, true, true, false);
        double[] v = cf.asVector();
        // Order: isHoliday, dayBefore, dayAfter, isQuincenaPost, isBorderTraffic
        assertThat(v[0]).isEqualTo(1.0);
        assertThat(v[1]).isEqualTo(0.0);
        assertThat(v[2]).isEqualTo(1.0);
        assertThat(v[3]).isEqualTo(1.0);
        assertThat(v[4]).isEqualTo(0.0);
    }
}
