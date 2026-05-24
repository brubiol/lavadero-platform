package com.lavadero.api.ai.forecast.domain;

import java.time.LocalDate;

/**
 * Per-day calendar covariates fed into the OLS residual regression alongside
 * weather. Five binary signals encoded as 1.0 / 0.0 for the linear model.
 *
 * <ul>
 *   <li>{@code isHoliday} — any Mexican or US holiday observed on this date.</li>
 *   <li>{@code dayBeforeHoliday} — tomorrow is a holiday (anticipation washes).</li>
 *   <li>{@code dayAfterHoliday} — yesterday was a holiday (post-event recovery).</li>
 *   <li>{@code isQuincenaPost} — within the 1-3 day window after Mexican biweekly
 *       payday (15th or end-of-month). Disposable-income effect.</li>
 *   <li>{@code isBorderTrafficHoliday} — US holiday that historically moves
 *       Reynosa↔McAllen flow (Thanksgiving, Black Friday, Memorial Day, etc.).</li>
 * </ul>
 */
public record CalendarFeatures(
        LocalDate date,
        boolean isHoliday,
        boolean dayBeforeHoliday,
        boolean dayAfterHoliday,
        boolean isQuincenaPost,
        boolean isBorderTrafficHoliday) {

    public static final int DIMENSION = 5;

    public double[] asVector() {
        return new double[] {
                b(isHoliday),
                b(dayBeforeHoliday),
                b(dayAfterHoliday),
                b(isQuincenaPost),
                b(isBorderTrafficHoliday)
        };
    }

    public static CalendarFeatures empty(LocalDate date) {
        return new CalendarFeatures(date, false, false, false, false, false);
    }

    /**
     * Mexican biweekly pay lands on the 15th and on the last calendar day of the
     * month. Disposable income drives car-wash demand for ~3 days afterward, so
     * we mark the 15-17 window and the (last_day, last_day-1, 1, 2) window.
     */
    public static boolean isQuincenaPostWindow(LocalDate date) {
        int day = date.getDayOfMonth();
        if (day >= 15 && day <= 17) return true;
        int lastDay = date.lengthOfMonth();
        if (day >= lastDay - 1) return true;       // last 2 days
        if (day == 1 || day == 2) return true;     // first 2 days (after month-end pay)
        return false;
    }

    private static double b(boolean value) {
        return value ? 1.0 : 0.0;
    }
}
