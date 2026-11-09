/**
 * Statistics — Rigorous statistical estimation for traffic simulation experiments.
 *
 * Implements:
 *   1. Wilson Score Confidence Interval for binomial proportions (e.g. jam probability).
 *      Provides accurate coverage even with small sample sizes (n < 30) or extreme probabilities
 *      (k = 0 or k = n) where standard normal approximations fail.
 *   2. Sample mean, sample variance, standard deviation, and standard error.
 */

export interface ConfidenceInterval {
  /** Point estimate (e.g. k / n) */
  estimate: number;
  /** Lower bound of confidence interval (clamped >= 0) */
  lower: number;
  /** Upper bound of confidence interval (clamped <= 1) */
  upper: number;
  /** Confidence level (e.g. 0.95 for 95%) */
  confidenceLevel: number;
  /** Sample size */
  n: number;
}

/**
 * Compute the Wilson Score Interval for a binomial proportion.
 *
 * Formula:
 *   center = (p_hat + z^2 / (2n)) / (1 + z^2 / n)
 *   margin = (z / (1 + z^2 / n)) * sqrt(p_hat * (1 - p_hat) / n + z^2 / (4n^2))
 *   interval = [center - margin, center + margin]
 *
 * @param successes Number of positive trials (e.g. number of runs with sustained jam)
 * @param totalTrials Total number of independent trials with distinct random seeds
 * @param confidenceLevel Confidence level (default 0.95 for 95% confidence, z = 1.95996)
 */
export function computeWilsonInterval(
  successes: number,
  totalTrials: number,
  confidenceLevel: number = 0.95,
): ConfidenceInterval {
  if (totalTrials <= 0) {
    return {
      estimate: 0,
      lower: 0,
      upper: 0,
      confidenceLevel,
      n: 0,
    };
  }

  const n = totalTrials;
  const k = Math.max(0, Math.min(n, successes));
  const p = k / n;

  // Normal critical value z:
  // 95% -> 1.95996, 90% -> 1.64485, 99% -> 2.57583
  let z = 1.95996;
  if (Math.abs(confidenceLevel - 0.90) < 0.01) z = 1.64485;
  else if (Math.abs(confidenceLevel - 0.99) < 0.01) z = 2.57583;

  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const radicand = (p * (1 - p)) / n + z2 / (4 * n * n);
  const margin = (z * Math.sqrt(Math.max(0, radicand))) / denominator;

  const lower = Math.max(0, center - margin);
  const upper = Math.min(1, center + margin);

  return {
    estimate: Math.round(p * 1000) / 1000,
    lower: Math.round(lower * 1000) / 1000,
    upper: Math.round(upper * 1000) / 1000,
    confidenceLevel,
    n,
  };
}

/**
 * Compute sample mean and standard error for an array of numeric values.
 */
export function computeMeanAndStdDev(values: ReadonlyArray<number>): {
  mean: number;
  variance: number;
  stdDev: number;
  standardError: number;
} {
  if (values.length === 0) {
    return { mean: 0, variance: 0, stdDev: 0, standardError: 0 };
  }

  const n = values.length;
  const mean = values.reduce((acc, v) => acc + v, 0) / n;

  if (n === 1) {
    return { mean, variance: 0, stdDev: 0, standardError: 0 };
  }

  // Unbiased sample variance (divide by n - 1)
  const sumSquaredDev = values.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  const variance = sumSquaredDev / (n - 1);
  const stdDev = Math.sqrt(variance);
  const standardError = stdDev / Math.sqrt(n);

  return {
    mean: Math.round(mean * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    standardError: Math.round(standardError * 100) / 100,
  };
}
