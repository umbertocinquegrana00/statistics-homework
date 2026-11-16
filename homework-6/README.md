# Homework 6 — Statistical Independence in Network Traffic

A self-contained HTML/CSS/vanilla JavaScript educational dashboard. The analysis uses **real UNSW-NB15 observations** from the official test split (`UNSW_NB15_testing-set.csv`, 82,332 rows). The dataset is **not bundled** in this distribution: the browser retrieves an unchanged public copy or the user imports the downloaded official CSV. No synthetic network flow records are created. The tiny fixtures in `testSuite()` are exclusively for mathematical unit tests and never appear as study data.

## Launch

1. Open `index.html` (or deploy this folder to `homework-6/` on GitHub Pages).
2. Click **Load UNSW-NB15 test split**. The browser fetches the same-named public copy from GitHub; Internet connectivity is required. If the mirror is unreachable, download the official `UNSW_NB15_testing-set.csv` from UNSW and select it with the file input.
3. Choose `service`, `proto`, or `state`; inspect tables and χ²; run the permutation test and reference tests.

The app checks column names, binary label values, and CSV row shapes. It shows actual loaded row count and warns if it differs from 82,332. Tests are separate from downloaded data. All displayed statistics are recomputed directly from the loaded rows.

## Statistical methods

- Explanatory feature X = `service`, `proto`, or `state`; binary F = `label` (0 normal, 1 attack).
- To reduce sparse expected counts, the seven most common X categories (selected without using F) are retained individually, and the remainder is pooled into `Other (grouped)`. All observations are retained. The service value `-` remains a normal observed category.
- Counts, joint/conditional frequencies, expected values `E_ij=R_i C_j/N`, Pearson `χ²`, df, p-value `Q(df/2, χ²/2)` computed through an incomplete gamma implementation, and Cramér's V.
- Fixed-margin permutations shuffle the actual binary labels relative to X (seeded Fisher-Yates), rebuilding a new χ² for each resample. Monte Carlo p = `(exceedances+1)/(B+1)`.
- Mathematical unit tests cover simple known matrices, expected counts, χ², p-values, V, CSV parsing, determinism and permutations. They do **not** validate the downloaded CSV's origin cryptographically.

## Important limitations

UNSW-NB15 was produced in a controlled cybersecurity laboratory with both normal and simulated attack traffic. Observations can be correlated; formal p-values assume conditions that may not hold for individual network flows. Results are associations within this benchmark, **not evidence of causality** or general traffic attack prevalence. Verify the stated source before research use, and cite the original dataset authors.

## Sources and citation

**Official dataset page:** https://research.unsw.edu.au/projects/unsw-nb15-dataset

**Public copy of the test CSV:** https://github.com/Nir-J/ML-Projects/blob/master/UNSW-Network_Packet_Classification/UNSW_NB15_testing-set.csv

**Required citation:** Moustafa, N., and Slay, J. (2015). *UNSW-NB15: a comprehensive data set for network intrusion detection systems (UNSW-NB15 network data set).* Military Communications and Information Systems Conference (MilCIS), IEEE.

University of New South Wales grants free use for academic research with citation. This dashboard is not an intrusion detection classifier; it performs descriptive and inferential contingency analysis.
