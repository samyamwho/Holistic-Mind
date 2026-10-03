# Samyam's project documents

Start with [How the functionality works](HOW-THE-FUNCTIONALITY-WORKS.md) for a plain-language explanation of the app, recommendations, encrypted journaling, recovery, and benchmark graphs. Then read [Recent changes](RECENT-CHANGES.md) for the implementation record, completed checks, and remaining release work.

## Current guides

| Document | Purpose |
| --- | --- |
| [How the functionality works](HOW-THE-FUNCTIONALITY-WORKS.md) | User flows, data flow, recommendation scoring, encryption, and evaluation explained with examples. |
| [Device and backend tests](DEVICE-AND-BACKEND-TEST-RESULTS.md) | 15 September simulator fixes, native key persistence, and live API verification. |
| [Recent changes](RECENT-CHANGES.md) | What changed, why it changed, verification, and current limitations. |
| [Journal privacy](journal-privacy.md) | Detailed encryption design, recovery, migration, and privacy limits. |
| [Recommendation benchmark](RECOMMENDATION-BENCHMARK.md) | Evaluation methodology, metrics, local setup, and graph generation. |
| [Project README](PROJECT-README.md) | General setup, commands, architecture, and API reference. |

## Development history and earlier descriptions

These documents preserve earlier project reporting. Their journal/recommendation descriptions may predate device-only encryption; use the current guides above for that behaviour.

| Document | Purpose |
| --- | --- |
| [15-week daily development journal](15-Week-Development-Journal.md) | Detailed daily development narrative. |
| [15-week weekly journal](15-Week-Weekly-Journal.md) | Weekly development summary. |
| [Holistic Mind progress summary](HOLISTIC_MIND_PROGRESS_SUMMARY_TO_DATE.txt) | Original progress report dated 2 September 2026; retained as plain text. |
| [Recommendation engine explanation](Recommendation-Engine-Explanation.md) | Earlier detailed implementation explanation. |
| [Recommendation engine workflow](RECOMMENDATION-ENGINE-WORKFLOW.md) | Earlier end-to-end recommendation workflow. |
| [Project features and requirements](PROJECT_FEATURES_AND_REQUIREMENTS.md) | Earlier feature, architecture, and requirements reference. |
| [Deployment guide](DEPLOYMENT.md) | Earlier deployment instructions; also read the new encryption rollout limits before release. |

## Open the benchmark graphs

- [Lexical interactive dashboard](../recommender/evaluation/evaluation_results.html)
- [MiniLM/ONNX interactive dashboard](../recommender/evaluation/evaluation_results_onnx.html)
- [Lexical chart image](../recommender/evaluation/evaluation_results_charts.png)
- [MiniLM/ONNX chart image](../recommender/evaluation/evaluation_results_onnx_charts.png)

Open the HTML files locally in a browser. The reports use authored test personas, including their original journal inputs; they do not measure the current journal-free production configuration or real-user outcomes.

All development commands in these documents should be run from the repository root, one directory above this folder, unless a command explicitly changes directory.
