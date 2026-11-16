# Statistics for Cybersecurity — Homework Portfolio

Interactive homework projects for the **Statistics for Cybersecurity** course at **Sapienza University of Rome**.

The portfolio includes mathematical explanations, JavaScript implementations, experiments, charts, and reference checks. Each exercise is accessible through GitHub Pages.

**[Open the homework portfolio](https://umbertocinquegrana00.github.io/statistics-homework/)**

## Homeworks

| Homework | Topic | Live website |
| --- | --- | --- |
| 1.1 | Elliptic Curve Cryptography — Private Key to Public Key | [Open 1.1](https://umbertocinquegrana00.github.io/statistics-homework/homework-1/exercise-1/) |
| 1.2 | Ethereum Wallet — Mnemonic to Address | [Open 1.2](https://umbertocinquegrana00.github.io/statistics-homework/homework-1/exercise-2/) |
| 2 | ECC vs Caesar Cipher — Encryption and Cryptanalysis | [Open 2](https://umbertocinquegrana00.github.io/statistics-homework/homework-2/) |
| 3 | Random Walks — Law of Large Numbers and Central Limit Theorem | [Open 3](https://umbertocinquegrana00.github.io/statistics-homework/homework-3/) |
| 4 | Welford’s Recurrence Formulas and Sampling Mean & Variance | [Open 4](https://umbertocinquegrana00.github.io/statistics-homework/homework-4/) |
| 5 | Riemann & Lebesgue Integration; Numerical Normal CDF | [Open 5](https://umbertocinquegrana00.github.io/statistics-homework/homework-5/) |
| 6 | Statistical Independence with UNSW-NB15 Network Traffic | [Open 6](https://umbertocinquegrana00.github.io/statistics-homework/homework-6/) |

## Repository structure

```text
statistics-homework/
├── index.html                 # Main portfolio homepage
├── README.md                  # This file
├── homework-1/
│   ├── shared.css
│   ├── exercise-1/             # Elliptic-curve scalar multiplication
│   └── exercise-2/             # Ethereum wallet pipeline
├── homework-2/                # ECC and Caesar cipher
├── homework-3/                # Random walks, LLN and CLT
├── homework-4/
│   ├── index.html             # Homework 4 landing page
│   ├── exercise-1/             # Welford's recurrences
│   └── exercise-2/             # Sampling mean and variance
├── homework-5/                # Numerical integration and normal CDF
└── homework-6/                # Statistical independence (UNSW-NB15)
```

## Technology

The exercises run client-side using **HTML, CSS, and JavaScript**. No backend is required for GitHub Pages deployment. The portfolio homepage is self-contained: its styles are embedded in `index.html`.

Each homework has its own code and explanations. For implementation details and validation procedures, consult the README or reference-tests section inside the corresponding homework folder.

## Dataset note — Homework 6

Homework 6 analyzes the **UNSW-NB15** network-intrusion benchmark from UNSW Canberra. The application loads an official test-split CSV (or lets users provide the CSV file manually), then computes contingency tables and statistical tests from the imported records. Results depend on the records actually loaded; the original dataset is not represented as naturally occurring Internet traffic.

- [UNSW-NB15 dataset — official project page](https://research.unsw.edu.au/projects/unsw-nb15-dataset)

## Local use and deployment

1. Clone or download this repository.
2. Open the root `index.html` to browse the portfolio locally. Exercise links explicitly target their `index.html` files.
3. In GitHub, enable **Settings → Pages → Deploy from a branch**, choosing `main` and `/(root)`.
4. Open the [portfolio homepage](https://umbertocinquegrana00.github.io/statistics-homework/) after deployment.

For Homework 6, Internet access or a locally supplied CSV may be required to load the dataset.

## Educational scope

The cryptographic demonstrations are educational implementations. Toy elliptic curves, deliberately restricted key spaces, and example wallet phrases **must not be used to protect real secrets or funds**. Simulated statistical results illustrate estimators and limit theorems; their interpretation depends on the assumptions of each model.
