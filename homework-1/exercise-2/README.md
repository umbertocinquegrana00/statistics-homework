# Homework 1.2 — Updated reference-check interface

This patch changes **only** `homework-1/exercise-2/`. Keep the existing `homework-1/shared.css` unchanged: `index.html` references it as `../shared.css`.

## Changes
- The top **Run reference checks** button automatically scrolls to section **07 / Reference tests**.
- Both test buttons show a running state and a clear pass/fail summary.
- The interface explicitly states the fixed Hardhat reference vector uses **account 0**, regardless of the selected test account.
- Duplicate runs are prevented while the tests are executing.
- Cryptographic implementations and reference vectors are **unchanged**.

## Deployment
Upload/replace the files under `homework-1/exercise-2/` in the same GitHub repository. Do not delete `homework-1/shared.css` or modify `exercise-1/`.

Direct URL after deployment: https://umbertocinquegrana00.github.io/statistics-homework/homework-1/exercise-2/
