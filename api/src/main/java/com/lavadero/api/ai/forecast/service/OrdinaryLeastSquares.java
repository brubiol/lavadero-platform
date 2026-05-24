package com.lavadero.api.ai.forecast.service;

/**
 * Solves β = (XᵀX)⁻¹ Xᵀy via Gauss-Jordan elimination on the augmented normal
 * matrix. Pure Java, no math library. Fine for the 4-feature regression used
 * by the weather-adjusted forecaster; do not use for large k.
 *
 * <p>Adds a tiny ridge (1e-8 on the diagonal) to keep collinear inputs stable.
 */
public final class OrdinaryLeastSquares {

    private static final double RIDGE = 1.0e-8;

    private OrdinaryLeastSquares() {
    }

    /**
     * Fits an OLS regression. {@code x} is an n×k matrix (rows = observations,
     * columns = features). An intercept column is added automatically, so the
     * returned coefficient array has length k+1 with index 0 = intercept.
     */
    public static double[] fit(double[][] x, double[] y) {
        if (x == null || y == null || x.length == 0 || x.length != y.length) {
            throw new IllegalArgumentException("OLS inputs must be non-empty and aligned");
        }
        int n = x.length;
        int k = x[0].length + 1; // +1 for intercept
        double[][] xtx = new double[k][k];
        double[] xty = new double[k];

        for (int i = 0; i < n; i++) {
            double[] row = new double[k];
            row[0] = 1.0;
            for (int j = 1; j < k; j++) {
                row[j] = x[i][j - 1];
            }
            for (int a = 0; a < k; a++) {
                xty[a] += row[a] * y[i];
                for (int b = 0; b < k; b++) {
                    xtx[a][b] += row[a] * row[b];
                }
            }
        }
        for (int d = 0; d < k; d++) {
            xtx[d][d] += RIDGE;
        }
        return solve(xtx, xty);
    }

    /**
     * Applies fitted coefficients to a single feature row (no intercept column —
     * the intercept is at {@code betas[0]}).
     */
    public static double predict(double[] betas, double[] features) {
        double sum = betas[0];
        for (int i = 0; i < features.length; i++) {
            sum += betas[i + 1] * features[i];
        }
        return sum;
    }

    private static double[] solve(double[][] a, double[] b) {
        int n = b.length;
        double[][] m = new double[n][n + 1];
        for (int i = 0; i < n; i++) {
            System.arraycopy(a[i], 0, m[i], 0, n);
            m[i][n] = b[i];
        }
        for (int col = 0; col < n; col++) {
            // Partial pivoting on the column to keep the elimination stable.
            int pivot = col;
            for (int row = col + 1; row < n; row++) {
                if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) {
                    pivot = row;
                }
            }
            if (pivot != col) {
                double[] tmp = m[col];
                m[col] = m[pivot];
                m[pivot] = tmp;
            }
            double diag = m[col][col];
            if (Math.abs(diag) < 1.0e-12) {
                throw new IllegalStateException("OLS normal matrix is singular at column " + col);
            }
            for (int j = col; j <= n; j++) {
                m[col][j] /= diag;
            }
            for (int row = 0; row < n; row++) {
                if (row == col) continue;
                double factor = m[row][col];
                if (factor == 0.0) continue;
                for (int j = col; j <= n; j++) {
                    m[row][j] -= factor * m[col][j];
                }
            }
        }
        double[] beta = new double[n];
        for (int i = 0; i < n; i++) {
            beta[i] = m[i][n];
        }
        return beta;
    }
}
