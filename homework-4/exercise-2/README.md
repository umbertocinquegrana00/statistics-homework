# Statistics Homework 04 — Exercise 4.2

**Sampling Mean and Variance** — a standalone HTML/CSS/JavaScript simulation.

## How to open

Open `index.html` in a browser, or publish the folder using GitHub Pages. No build system, server, dependencies, or API keys are needed. Google Fonts are optional; if unavailable, the browser uses its fallback fonts.

## Assignment

Each of `m` independent hackers attempts `n` systems. A score is drawn independently for each attempt from the following fixed discrete distribution:

| Score | 0 | 2 | 4 | 6 | 8 | 10 |
| --- | --- | --- | --- | --- | --- | --- |
| Probability | 0.05 | 0.10 | 0.20 | 0.30 | 0.25 | 0.10 |

The probabilities sum to 1. The theoretical mean is

`μ = Σ x p(x) = 5.8`

and the theoretical variance is

`σ² = Σ x² p(x) − μ² = 40.4 − 5.8² = 6.76`.

### Per-hacker online statistics

For each score `x`, increment `count`, then apply:

```js
const delta = x - mean;
mean += delta / count;
M2 += delta * (x - mean);
```

`M2` is the centered sum of squares; the **sample variance** is `M2 / (n - 1)` for `n >= 2`. The mean and variance are calculated independently for each hacker. Across hackers, the app computes the mean of the sample means, the mean of the sample variances, and the descriptive standard deviations of both collections.

### Expected results and interpretation

For independent identically distributed (i.i.d.) scores with finite variance:

- `E[sample mean] = μ = 5.8`.
- `E[sample variance] = σ² = 6.76` (because we divide by `n - 1`).
- `SD(sample mean) = sqrt(σ² / n)`; the sample means become more concentrated as `n` grows.
- The sample variances also become more concentrated as `n` grows for this bounded distribution.
- Monte Carlo averages generally lie close to theoretical targets for large `m`, but will not exactly equal them in each random run.
- Increasing `m` reduces Monte Carlo noise when estimating average statistics; increasing `n` improves the precision of each hacker's estimates.

The app reports the **descriptive SD with divisor m** for the empirical spread across the `m` hackers (not the unbiased variance estimator of a population of hacker statistics).

## How to verify

1. Click **Run all tests** for known-answer tests, step-by-step prefix checks, probability moments, seeded reproducibility and a numerical Monte Carlo check.
2. Use identical values of `m`, `n` and the seed to reproduce a run.
3. Change `n` (e.g. 2 → 30 → 300), click **Run simulation**, and inspect the sampling histograms.
4. Click **Compare sample sizes** to compare `n = 2, 5, 10, 30, 100, 300` on a common graph. The chart's theoretical reference for the mean SD is `sqrt(6.76/n)`.
5. Select an individual hacker and inspect the complete Welford trajectory and independent two-pass comparison.

## Structure

- `index.html` — explanation and interactive dashboard.
- `styles.css` — visual design, adapted from Exercise 1.
- `script.js` — distribution, Welford algorithm, seeded simulation, charts, verification, and CSV export.

Recommended GitHub Pages path: `homework-1/exercise-2/`.


## Additional analysis (Homework 4.2)

- The sample-size comparison table now places each empirical aggregate beside its population target and also compares the observed SD of sample variances with its finite-fourth-moment theoretical benchmark.
- The Bessel-correction panel contrasts the unbiased estimator `M2/(n-1)` with the biased estimator `M2/n` over all six sample sizes. The relevant identities are `E[M2/(n-1)] = sigma^2` and `E[M2/n] = ((n-1)/n) sigma^2` for i.i.d. scores with finite variance.
- Five additional automated tests cover the biased estimator, theoretical sampling SDs, and simulation consistency. The pseudo-random stream is intentionally non-cryptographic and seeded for reproducibility.
- All averages in the bias table are Monte Carlo estimates rather than exactly equal theoretical quantities; the gap decreases with additional hackers.
