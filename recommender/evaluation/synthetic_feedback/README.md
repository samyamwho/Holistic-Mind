# Synthetic exercise feedback — not real participant evidence

[Open the CSV](synthetic_feedback.csv). Every row is fictional and marked
`SYNTHETIC_NOT_REAL_PARTICIPANTS`. No participant was recruited, no exercise was
actually performed, and no observed clinical outcome is represented here.

The default dataset has **1,200 sessions**, **120 fictional participants**, and
**10 sessions each**. It uses the existing 30 authored check-in scenarios and 14
benchmark exercise IDs. There is no journal content or personal information.

## What this is useful for

- Practicing CSV analysis, grouping feedback by state/exercise, and handling missing responses.
- Testing feedback ingestion and participant-level dataset splits.
- Prototyping weight-selection code before collecting suitable independent data.

It **cannot justify the rules, prove an exercise helps anxiety, establish the best
exercise, or validate the 72% weight**. The generator deliberately assumes some
benefit from matching the requested support to exercise metadata, which overlaps
with the recommender's assumptions. Learning that relationship back from these
rows would be circular evidence. Do not combine these rows with real feedback or
the existing benchmark scores without clearly separating their provenance.

Suggested supervisor description: “This is a simulated feedback dataset for
testing the evaluation pipeline. User helpfulness data has not yet been collected.”

## How the rows are generated

1. Use seed 42 and create IDs prefixed `SYN-`. Randomly assign each fictional
   participant a fixed preference profile (independent 18% chance per preference).
2. Randomly split participants: 84 development, 18 validation, 18 test. Every
   session for a participant stays in that split. Scenario types can occur in all
   splits: this is not a held-out-scenario study, and all splits share the same
   simulation assumptions.
3. Sample a check-in from the authored personas, discarding journals and ignoring
   their relevance labels. Resolve preferences through the actual shared
   TypeScript policy and the engine's eligibility filter.
4. Select uniformly among eligible exercises, **without using ranking scores**.
   Selection probability is recorded; assignment is not balanced, and excluded
   exercises have no exposure for that preference profile.
5. Invent stress outcomes using this transparent formula:

   `latent reduction = 0.4 + 0.8 × support-tag-match + participant/exercise affinity + noise`

   Affinity is fixed per participant/exercise and sampled uniformly from -1 to 1.
   Noise is normal with mean 0 and standard deviation 1.5. With 15% probability,
   latent reduction is reset to zero. Discomfort occurs independently with 10%
   probability and subtracts two from latent reduction. These probabilities and
   effects are **arbitrary simulation settings, not research estimates**.
6. Invent initial stress within ranges consistent with the qualitative answer:
   None = 0–2, A little = 3–6, Very stressed = 7–10. Compute after-stress by
   rounding `before - latent reduction` and bounding it to 0–10. These mappings
   are also simulation assumptions, not validated scales. Lower initial values
   introduce a floor effect; comparing average reductions across states is biased.
7. Generate helpfulness as rounded `3 + 0.6 × observed stress reduction + noise`,
   bounded to 1–5 (noise standard deviation 0.8). It is therefore correlated with
   stress reduction by construction, not an independent measure of benefit.
8. Simulate an early stop in 65% of discomfort sessions. Planned durations are
   randomly 60, 120, 180, or 300 seconds; these are test values, not exercise
   instructions. Duration does not cause outcome changes in this model.
9. Independently remove post-session rating fields in 8% of rows. Discomfort and
   stop flags remain available as separate fictional session events. No missing
   feedback should be interpreted as zero helpfulness; blanks must stay missing in analysis.

Default output includes 105 missing-feedback rows, 100 discomfort flags, 67 early
stops, 421 observed unchanged-stress sessions, and 247 observed worsening-stress
sessions. Counts overlap; these are properties of a simulation, not prevalence
estimates. See [manifest.json](manifest.json) for hashes and counts.

## Column dictionary

| Columns | Meaning |
| --- | --- |
| `data_origin`, `generator_version`, `seed` | Provenance on every row. |
| `session_id`, `participant_id`, `session_number` | Unique fictional session, repeated participant, and within-participant order. No actual dates or chronology inferred. |
| `split` | Participant-level `development`, `validation`, or `test`. |
| `source_scenario_id` | Original authored persona providing check-in values; not an actual diagnosis. |
| `state`, `body`, `energy`, `stress`, `focus`, `support` | Original check-in answer strings. |
| `comfort_preferences` | Pipe-separated preference IDs; empty means none selected. |
| `excluded_exercise_ids` | Pipe-separated explicit preference exclusions; other engine restrictions are additionally applied. |
| `exercise_id`, `exercise_title` | Exercise selected from the fixed benchmark catalog. |
| `selection_method`, `eligible_count`, `selection_probability` | Uniform assignment among eligible candidates and its probability, rounded to eight decimals. |
| `planned_duration_seconds`, `actual_duration_seconds` | Fictional timing; early stops have shorter actual durations. |
| `stress_before_0_10`, `stress_after_0_10` | Invented ordinal scores, not a validated clinical instrument. After is blank when feedback is missing. |
| `stress_reduction` | Before minus after; positive means less stress, negative means more. Blank when missing. |
| `helpfulness_1_5` | Invented rating: 1 low, 5 high; blank when missing. |
| `feedback_missing`, `discomfort_reported`, `stopped_early` | Boolean text `True` or `False`. |
| `would_use_again` | True when helpfulness >=4 and no discomfort; otherwise False, or blank when feedback missing. Derived, not an independent survey answer. |

## Regenerate

From the project root, with the existing Python environment and backend Node
dependencies installed:

```bash
recommender/.venv312/bin/python -B recommender/evaluation/generate_synthetic_feedback.py

# Separate experiment: preserves the supplied dataset
recommender/.venv312/bin/python -B recommender/evaluation/generate_synthetic_feedback.py --seed 123 --output /tmp/synthetic-feedback-123
```

The default command overwrites this folder's CSV and manifest, not its README.
Fixed seed, sources, and runtime reproduce the data. The manifest records source
and CSV hashes. The app database, recommendation weights, and existing benchmark
reports are unchanged by generation.
