package com.lavadero.api.ai.forecast;

import com.lavadero.api.ai.forecast.service.OrdinaryLeastSquares;
import java.util.Random;
import org.assertj.core.data.Offset;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OrdinaryLeastSquaresTest {

    @Test
    void should_recover_known_coefficients_when_fit_on_synthetic_linear_data() {
        // y = 5 + 2*x1 - 3*x2 + 0.5*x3 + small noise
        Random rng = new Random(7);
        int n = 200;
        double[][] x = new double[n][3];
        double[] y = new double[n];
        for (int i = 0; i < n; i++) {
            double x1 = rng.nextGaussian();
            double x2 = rng.nextGaussian() * 2.0;
            double x3 = rng.nextGaussian() * 0.5;
            double noise = rng.nextGaussian() * 0.05;
            x[i] = new double[] { x1, x2, x3 };
            y[i] = 5.0 + 2.0 * x1 - 3.0 * x2 + 0.5 * x3 + noise;
        }
        double[] betas = OrdinaryLeastSquares.fit(x, y);

        assertThat(betas[0]).isCloseTo(5.0, Offset.offset(0.05));
        assertThat(betas[1]).isCloseTo(2.0, Offset.offset(0.05));
        assertThat(betas[2]).isCloseTo(-3.0, Offset.offset(0.05));
        assertThat(betas[3]).isCloseTo(0.5, Offset.offset(0.1));
    }

    @Test
    void should_be_robust_to_collinear_inputs_with_small_ridge() {
        // x2 = 2 * x1 + tiny noise → near-perfect collinearity. The ridge term should
        // prevent the solver from blowing up while still recovering a sensible fit.
        Random rng = new Random(3);
        int n = 100;
        double[][] x = new double[n][2];
        double[] y = new double[n];
        for (int i = 0; i < n; i++) {
            double x1 = rng.nextGaussian();
            double x2 = 2.0 * x1 + rng.nextGaussian() * 1.0e-6;
            x[i] = new double[] { x1, x2 };
            y[i] = 3.0 + 4.0 * x1;
        }
        double[] betas = OrdinaryLeastSquares.fit(x, y);

        // Intercept should still be recovered; individual coefficients can split
        // between x1 and x2 due to collinearity, but their combined contribution
        // (β1 + 2*β2) should reproduce the underlying 4.0.
        assertThat(betas[0]).isCloseTo(3.0, Offset.offset(0.01));
        assertThat(betas[1] + 2.0 * betas[2]).isCloseTo(4.0, Offset.offset(0.01));
    }

    @Test
    void should_apply_intercept_and_features_when_predicting() {
        double[] betas = { 1.0, 2.0, -0.5 };
        double[] features = { 3.0, 4.0 };
        assertThat(OrdinaryLeastSquares.predict(betas, features))
                .isCloseTo(1.0 + 2.0 * 3.0 - 0.5 * 4.0, Offset.offset(1.0e-9));
    }
}
