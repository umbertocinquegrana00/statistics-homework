# Homework 3 — Random Walks, LLN and CLT

Statistics for Cybersecurity (2026/27). Independent educational dashboard with no JavaScript dependencies, served directly from `index.html`.

## How to run

Open `index.html` locally or publish the contents of this directory at `statistics-homework/homework-3/` using GitHub Pages. The links within this project are relative. No server is needed; optional Google Fonts require an internet connection and fall back to system fonts offline.

## Assignment coverage

- Bernoulli X ∈ {0,1}, success probability p, and symmetric Rademacher X ∈ {-1,+1}.
- m independent attackers, each observed over n independent systems.
- Sₙ, Sₙ/n, Sₙ/√n and their sample paths and distributions.
- Theoretical moments: E[Sₙ]=nμ, Var(Sₙ)=nσ²; E[Sₙ/n]=μ, Var(Sₙ/n)=σ²/n; E[Sₙ/√n]=√nμ, Var(Sₙ/√n)=σ².
- Law of large numbers: deviations of the per-system mean, plus Chebyshev upper bound.
- Central limit theorem: Zₙ=(Sₙ−nμ)/(σ√n), with N(0,1) comparison. For Rademacher, Zₙ=Sₙ/√n exactly.
- Discussion of n (systems per attacker), m (Monte Carlo sample size and attackers), aggregate penetration score.
- Reproducible Monte Carlo using mulberry32 seeded PRNG and independent draws. The generator is suitable for simulations, not for cryptography.
- Reference tests for computation and model invariants.

## Code review notes

`script.js` is separated into `Homework3Core` (model, generator, recurrence, theoretical moments, simulation) and DOM/SVG visualization. Sample variance across m trajectories uses denominator m−1. Exact reference moments describe a random trajectory, not the empirical m-trajectory variance. In the Bernoulli case, Sₙ/√n is **not** asymptotically centred because its mean is p√n; the CLT section correctly centres and scales by σ. The plotted histograms are densities rather than raw frequencies. The visualization may show small Monte Carlo deviations. No values are fixed to theoretical outcomes.

## Developer tests

From the project folder, run `node test.js`. Alternatively press **Run all tests** in the page. No dependencies are required.

## Source assignment

Problem statement (secondary reproduction): https://ifrosty-tech.github.io/sapienza_statistics_26-27/homework/04/
