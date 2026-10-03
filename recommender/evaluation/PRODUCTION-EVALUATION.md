# Journal-free evaluation and restriction investigation

Implemented 18 September 2026. This update addresses the first two priorities:
evaluate current journal privacy behavior and investigate the three previously
reported unsuitable selections. It does not optimize scoring weights or establish
clinical validity. Recommendation engine behavior and original relevance labels
were not changed.

## What changed

There are now three separate suites:

| Suite | Inputs and purpose |
| --- | --- |
| `original` | Original 30 authored personas, including synthetic journals. Preserved for historical comparison. |
| `production` | Same 30 personas, labels, goals, check-ins, and 14-exercise catalog, with journal text removed. No invented comfort choices. Isolates the effect of the privacy-related input change. |
| `comfort` | Eight separately identified variants with explicitly declared comfort choices, including no preferences, each individual preference, combinations, and all four. Tests restriction enforcement. |

The new adapter executes `getComfortConstraints()` from the application's shared
TypeScript policy. It also excludes exercises marked `breath_hold_required` when
that preference is selected, matching the API behavior. It does not infer choices
from journals, persona titles, or relevance labels.

All new contexts have empty journals. Contexts remain cold-start and use the fixed
benchmark catalog, so “production” means matching these input conventions, not a
full live-catalog, API, or longitudinal evaluation. Node and installed backend
TypeScript tooling are needed for the comfort suite.

The JSON/dashboard now records preferences, explicit exclusions, and signals.
`explicit_exclusion_violation_rate` measures the percentage of returned IDs that
violate declared exclusions. This is separate from `safety_violation_rate`, which
measures disagreement with negative authored labels. Empty results give zero
violations, so always inspect fill rate too.

## Journal-free ONNX results

30 scenarios, 10 repeats per model, seed 42. These are fresh results, not projected
scores. Deterministic repeats improve timing measurements, not sample size.

| Approach | Precision@4 | NDCG@4 | Negative-label selections |
| --- | ---: | ---: | ---: |
| Random | 48.50% | 0.4315 | 5.17% |
| MiniLM text similarity | 71.67% | 0.6602 | 1.67% |
| Rules + eligibility | 73.33% | 0.7244 | 2.50% |
| Hybrid | 77.50% | 0.7387 | 3.33% |

Hybrid precision remains 3.1 relevant items per four. Its NDCG drops from the
original 0.7522 to 0.7387, compared with rules at 0.7244. This is a small measured
ranking advantage, not proof that the chosen weights are optimal. The three
negative-label cases still occur without declared preferences.

[Interactive journal-free results](evaluation_results_production_onnx.html) ·
[JSON](evaluation_results_production_onnx.json) ·
[PNG](evaluation_results_production_onnx_charts.png) ·
[SVG](evaluation_results_production_onnx_charts.svg)

## Investigation: what is and is not resolved

| Case | Finding | Treatment in this update |
| --- | --- | --- |
| P27, touch aversion | The original scenario describes aversion only in journal text; current production cannot read that text. | Add a separate variant declaring `self_touch`. The actual existing preference policy excludes both self-touch exercises. Original case and labels remain unchanged. |
| P29, head/eye scanning discomfort | The original check-in does not carry the concern. | Add a separate variant declaring `head_scanning`, and another also avoiding breath holds. Test explicit exclusions. Do not claim automated detection of dizziness. |
| P07, low energy/body scan | The negative body-scan label does not correspond to an existing metadata restriction. Evidence reviewed so far does not establish a blanket body-scan exclusion for low energy. | Keep the unresolved original label visible. Add a clearly separate variant where the user explicitly avoids body scans; this tests preference handling, not the clinical correctness of the original label. |

No new clinical rule was added just to improve benchmark scores. Explicit choices
can resolve the corresponding preference conflict; they cannot establish what an
undeclared preference would have been. The disputed P07 label still needs
independent review, as do other clinical interpretations in the authored fixtures.

## Comfort suite interpretation

[Interactive ONNX comfort results](evaluation_results_comfort_onnx.html) ·
[JSON](evaluation_results_comfort_onnx.json) ·
[PNG](evaluation_results_comfort_onnx_charts.png) ·
[SVG](evaluation_results_comfort_onnx_charts.svg)

Fresh ONNX results (eight scenarios, 10 repeats, seed 42):

| Approach | Precision@4 | NDCG@4 | Explicit exclusion violations | Negative-label selections | Fill |
| --- | ---: | ---: | ---: | ---: | ---: |
| Random Baseline | 61.25% | 0.4925 | 0.00% | 5.31% | 100% |
| Text Similarity (onnx) | 87.50% | 0.7885 | 0.00% | 0.00% | 100% |
| Rules + Eligibility | 78.12% | 0.6575 | 0.00% | 0.00% | 100% |
| Holistic Mind Hybrid | 90.62% | 0.7441 | 0.00% | 0.00% | 100% |

All rankers respected explicit exclusions. Hybrid returned no negative-labeled
items in these selected cases, but text-only had higher NDCG. This is not evidence
that hybrid wins on every metric or that undeclared concerns are detected.

The eight scenarios are selected stress cases, not a representative user sample.
Some share a source persona, so their bootstrap intervals must not be interpreted
as independent population evidence. Compare restriction enforcement within this
suite; do not compare its overall precision directly with the 30-persona suite.

Original labels remain unchanged even when a user excludes a positively labeled
exercise. Consequently recall and ideal NDCG are not preference-adjusted. This is
intentional transparency: the suite's main purpose is to verify explicit choices,
not to manufacture a new relevance ground truth.

Separate regression tests also construct one-eligible-item and zero-eligible-item
pools and verify that all four rankers return short/empty results without refilling
from excluded exercises. These stress tests do not affect the ranking averages.

## Reproduce and inspect

From the project root:

```bash
npm run benchmark:production
npm run benchmark:comfort
npm run recommender:test
npm run recommender:typecheck
npm run test:comfort

# Quick lexical variant, with its own output files
recommender/.venv312/bin/python -B recommender/evaluation/evaluate.py --suite comfort --backend lexical
```

The commands retain 10 repeats by default. Use `--output /tmp/my-results.json` to
preserve a previous result. Standard commands overwrite only their own suite's
report. The original saved reports remain intact.

The next phase is weight selection on development data followed by evaluation on
unseen scenarios, plus a source-by-source rule justification and independent label
review. No held-out data or expert validation is claimed by this update.
