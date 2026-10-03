# Recommendation benchmark

This is an **offline development benchmark**, not a clinical validation study or
training pipeline. Original persona inputs and relevance labels are unchanged.
The 30 authored personas each label all 14 exercises: −1 = contraindicated by the
benchmark, 0 = irrelevant, 1 = weak match, 2 = relevant, 3 = strongest match.

## Open the visualizations

- `evaluation_results.html`: deterministic lexical text matching.
- `evaluation_results_onnx.html`: actual MiniLM ONNX embeddings.
- `*_charts.png` and `*_charts.svg`: Matplotlib figures for slides/documents.

Double-click an HTML file. No server, login, CDN, or internet is needed. Choose a
metric, filter the persona heatmap by group or search, click a cell, and inspect
its ranked exercises. The run selector shows the exact random seed and list for
each repeat. Summary metrics average repeats; detail metrics describe that one
run. JSON/CSV download and print/save-PDF buttons are included.

## Run from the project root

```bash
npm run benchmark
npm run benchmark:onnx
npm run recommender:test
npm run recommender:typecheck

# Custom number of repeats / random seed, without overwriting the standard run
npm run benchmark -- --runs 20 --seed 123 --output /tmp/custom-benchmark.json
```

Each benchmark command writes JSON, a self-contained HTML dashboard, PNG and SVG.
ONNX mode refuses lexical fallback, so a missing/broken model cannot produce a
report mislabeled as semantic embeddings. Do not compare lexical timing with
ONNX timing as though they measured the same algorithm.

## Local Python setup

Use **Python 3.12**, matching the Docker image. Python 3.9 cannot install the pinned
NumPy/ONNX stack. The repaired local environment is `recommender/.venv312`; the
previous `.venv` is retained. VS Code/Pyright use `.venv312`. If an already-open
editor still reports missing imports, select that interpreter explicitly and
reload its window.

For a new checkout, with Python 3.12 installed:

```bash
python3.12 -m venv recommender/.venv312
recommender/.venv312/bin/python -m pip install -r recommender/requirements-dev.txt
recommender/.venv312/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='sentence-transformers/all-MiniLM-L6-v2', local_dir='recommender/.python/models/all-MiniLM-L6-v2', allow_patterns=['tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'vocab.txt', 'onnx/model.onnx'])"
```

The engine finds `/models/all-MiniLM-L6-v2` in Docker and
`recommender/.python/models/all-MiniLM-L6-v2` locally. `SENTENCE_TRANSFORMER_PATH`
overrides either. Environment/model directories are ignored by Git.

## Methodology

All four rankers deduplicate candidates and respect explicit exercise exclusions.
Random and text-only baselines intentionally omit suitability filtering; rules
and hybrid enforce the same known contraindications before scoring. This is a
comparison of complete approaches, not an isolated measurement of every hybrid
component. Text-only uses the current check-in, whereas hybrid also uses history.

The hybrid applies primary-support alignment to its pool when enough eligible
options exist, then category diversity and recency adjustments. That existing
behavior is preserved; its helper is now named/documented accurately.

By default each model runs 10 times per persona (300 timed runs/model). Random
seeds are `base_seed + persona_index * runs_per_persona + run_index`. Deterministic
rankers repeat for timing; repeating them is not additional independent evidence.
Each context is warmed once. All timed runs contribute to mean/P50/P95 latency.
Model loading, database, HTTP, and mobile rendering are outside the timer.

Quality is averaged within personas and then across personas. Bootstrap 95%
intervals resample the 30 persona means 2,000 times with a fixed seed. These are
uncertainty estimates within this small authored dataset, not proof of superiority
or estimates of population-wide clinical performance. Coverage is measured across
all personas and repeats. Changing repeat count can change random coverage.

Results include the actual backend, engine version, timestamp, Python/NumPy
versions, platform, run count, seed, and source hashes. Repeated quality results
are reproducible for fixed sources/backend/seeds; timings are machine-dependent.

## Metrics

- **Precision@4:** relevant returned items / 4, including penalties for unfilled slots.
- **Recall@4:** relevant returned items / all relevant labeled items.
- **NDCG@4:** ranking gain divided by ideal gain, using `(2^max(label,0)−1)/log2(rank+1)`.
- **MRR:** reciprocal rank of first relevant item, averaged across personas.
- **Hit rate@1/@4:** whether a relevant item appears at rank 1 / anywhere in the top 4.
- **Label violations:** negative-labeled returned items / returned items, as a percentage.
- **Fill rate:** returned items / 4. Read alongside violations so an empty list cannot look successful.
- **Diversity:** fraction of pairs from different exercise categories.
- **Coverage:** distinct exercises ever returned / all 14 exercises, as a percentage.

NDCG treats negative labels as zero gain; it does not substitute for the separate
violation metric. Relevance means label ≥2. Baselines may have good hit rate while
still returning unsuitable items elsewhere in the list.

## Remaining input and validation gaps

Known contraindication matches are now hard exclusions, including the existing
breath-hold/high-activation constraint. Exclusions apply before every selection
stage, so recency or exploration cannot reintroduce those exercises. Returning
fewer than four items is allowed. The Home screen respects an empty successful
response instead of replacing it with unfiltered local recommendations.

The Python request schema accepts `contraindication_signals`, e.g.
`["touch_discomfort", "dizziness"]`. Regression tests demonstrate exclusion when
these signals are supplied. The final mobile check-in step now collects optional
comfort preferences (self-touch, breath holds, head/eye scanning, inward body scans).
The Node route maps them into explicit exercise exclusions and contraindication
signals. The offline fallback uses the same shared preference mapping. Run
`npm run test:comfort` for validation, round-trip, fallback, and Python integration tests.
Original P27/P29 persona
journals mention these concerns, but journal text similarity is not a reliable
contraindication detector. These failures remain visible rather than adding
benchmark-specific text rules or feeding relevance labels into the ranker.
P07's negative body-scan label also lacks a matching contraindication in the
current exercise metadata. Those label/metadata decisions require review.

Collaborative activation, explicit exclusions, and rotation have regression tests.
They are not measured by the cold-start ranking benchmark because its original
personas have no interactions or recommendation history. A separate longitudinal
or real-user dataset is needed to evaluate those effects. Likewise, this work does
not establish independent expert labels, a held-out test set, or clinical efficacy.
The pre-existing offline mobile ranking fallback on service failure is a separate
algorithm and is not scored by this Python benchmark.

The original benchmark personas do not include these newly collected preferences,
so the previously saved benchmark scores remain unchanged. Preference enforcement
is tested separately; supplying a preference in a test does not demonstrate that
the engine can infer it from a journal.
