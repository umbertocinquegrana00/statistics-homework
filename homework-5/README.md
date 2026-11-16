# Homework 5 — Riemann and Lebesgue Integration; Numerical Normal CDF

## Open locally

Open `index.html` directly in a recent browser. No build step or external JavaScript library is needed. `styles.css` imports optional Google Fonts; the website still works offline using system fonts.

## Publication

Upload the complete `homework-5/` directory to the root of the existing `statistics-homework` GitHub repository. With GitHub Pages publishing the `main` branch from `/(root)`, the site URL will be:

https://umbertocinquegrana00.github.io/statistics-homework/homework-5/

## Structure

- `index.html`: theory, exercises, interactive controls, plots, comparison table, tests.
- `styles.css`: dashboard visual design.
- `script.js`: pure numerical algorithms and visualizations, separated into testable functions.
- `test.js`: reproducible Node.js tests (optional; browser includes Run all tests).

## Mathematical methods

- Riemann: equal-width left/midpoint/right sums (n independent function evaluations).
- Lebesgue: lower simple function via **analytic superlevel-set measures** `measure(t) = μ{x : f(x) ≥ t}`; the identity `m(b−a) + h ∑_{k=1}^N measure(m+kh)` is used. For `sin(x)/x`, the superlevel endpoint is obtained by bisection and its additional function evaluations are counted.
- `1/sqrt(x)` is improper, and the left Riemann sum diverges. The unbounded Lebesgue range is truncated at `T = sqrt(N)`; its exact omitted tail is `1/T`, shown to the user (not silently added to the approximation).
- The pathological functions are treated by mathematical set properties, not floating-point rationality checks.
- Normal CDF: composite Simpson's rule (requires even n), Maclaurin power series of the Gaussian density and the well-known Abramowitz–Stegun 7.1.26 approximation of erf; values are compared to independent reference constants.

## Reference reading

- Assignment copy in Marco Verri's Homework 5: https://ifrosty-tech.github.io/sapienza_statistics_26-27/homework/07/
- NIST normal table: https://itl.nist.gov/div898/handbook/eda/section3/eda3671.htm
- NIST DLMF error functions: https://dlmf.nist.gov/7
- M. Abramowitz & I. Stegun, *Handbook of Mathematical Functions*, §7.1.26.

This is a teaching implementation, not a certified scientific computing library. Browser timing depends on local hardware, and the power series is not optimal for distant tails. Numerical methods and precision limits are explained within the site.
