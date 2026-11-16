# Welford's Recurrence Formulas — Statistics Homework 04 / Exercise 4.1

An interactive, responsive website in English, made with **vanilla HTML, CSS and JavaScript** (no build system and no JavaScript dependencies).

## Included

- Knuth's mean recurrence and a mathematical derivation of Welford's recurrence for the corrected sum of squares (SS / M2).
- Recurrence for sample variance, including the `n = 1` edge case.
- The three core JavaScript statements used to update the statistics.
- Interactive simulator with editable datasets, presets, single-step, automatic playback, reset, process-all, progress indicator and live metrics.
- Two SVG charts showing running mean and sample variance.
- Calculation history, CSV export and independent two-pass cross-check.
- Built-in **Run all tests** panel: seven datasets, including exact intermediate checkpoints, constant values, negative numbers, decimals, a single observation and large-offset values.
- Correct sample notation: x̄ₙ for the running sample mean and s² for sample variance.

## Run locally

Open `index.html` in a modern browser. An internet connection is optional; Google Fonts only improve typography, and system fallback fonts are provided.

## Publish with GitHub Pages

This exercise belongs to `homework-4/exercise-1/`. Publish the repository using GitHub Pages from `main` / `/(root)` and visit `/statistics-homework/homework-4/exercise-1/`.

## Statistical notes

After observation `x` at sample size `n`, maintain `mean` and `M2 = Σ(xᵢ − mean)²`:

```js
const delta = x - mean;
mean += delta / n;
M2 += delta * (x - mean);
```

Increment `n` **before** these three lines. Sample variance is `M2 / (n - 1)` for `n >= 2`, and undefined for `n = 1`. Population variance uses `M2 / n` instead.

This is a pedagogical demonstration; browser number arithmetic uses IEEE-754 floating point. Tiny differences from two-pass computation are expected.
