# Homework 2 — Statistics for Cybersecurity

A standalone HTML/CSS/JavaScript dashboard. Put the **homework-2** folder in the root of your GitHub repository:

```
statistics-homework/
  homework-2/
    index.html
    styles.css
    script.js
    README.md
```

Published URL (after GitHub Pages deploys):
https://umbertocinquegrana00.github.io/statistics-homework/homework-2/

To test locally, open `homework-2/index.html` (not just the directory). The page does not require libraries, servers or build tooling. Internet is optional and only loads Google Fonts; system fonts work offline.

## Scope

- secp256k1 arithmetic with BigInt and scalar multiplication by double-and-add.
- Educational **non-standard** ephemeral ECDH + Keccak-256 counter-based masking; encrypt/decrypt the same input as Caesar. This is a teaching scheme and not secure ECIES. Keys are deliberately constrained to `1..4096` for a fast interactive demonstration, unlike the `1..2^20` choice used in one colleague's example; the assignment does not impose a specific upper bound.
- Caesar cipher preserving spaces and punctuation.
- χ² English letter-frequency key recovery ranking all 26 candidates; index of coincidence and histogram.
- Reproducible Monte Carlo study using short English excerpts from the project's own embedded fixed corpus. Test sizes 8, 16, 32, 64, 128, 256 and 512 letters.
- Exhaustive restricted private key search from Q = kG; no language statistics used.
- 15 reference checks, including curve/Keccak public vectors and round trips.

## Notes for oral review

The ECC toy scheme uses Keccak-256 for masking but **does not include standard message authentication**. It is not cryptographically secure and should not be confused with ECIES. A wrong private key may cause invalid UTF-8 or meaningless data; correctness is demonstrated using a valid key.

The attack compares a public point Q with successive multiples of G. This works only because the possible private keys have been artificially restricted. The letter frequency method assumes English with standard expected proportions; successful key recovery is an estimate, not a certainty. The corpus is self-contained and intentionally modest, limiting external generalization.

The initial values and experiments are entirely calculated at runtime (no hard-coded fake output).

## Reproducing tests

Open the page and click `Run all tests` in section 08. For statistical experiments choose seed and trials and click `Run experiment`.

## Sources for independent technical reference

- SEC 2, secp256k1 curve parameters, Standards for Efficient Cryptography Group.
- Keccak-256 (Ethereum variant with domain padding `0x01`, distinct from FIPS SHA3-256).
- English letter probabilities: common published frequency table used as fixed baseline; results depend on the language model.

No live user secrets or real wallet seeds should be entered.
