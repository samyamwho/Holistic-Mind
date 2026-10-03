"""Reproducible offline comparison; labels are authored scenarios, not clinical validation."""

import argparse
import hashlib
import json
import os
import platform
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import numpy as np

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from app.engine import (
    MODEL_PATH, _current_document, _exercise_document, _rule_evaluation,
    encode, eligible_candidates, recommend,
)
from app.schemas import RecommendationContext
from evaluation.benchmark_personas import BENCHMARK_PERSONAS, BenchmarkPersona
from evaluation.catalog import BENCHMARK_CATALOG, EXERCISE_MAP
from evaluation.metrics import (
    compute_catalog_coverage, compute_hit_rate, compute_intra_list_diversity,
    compute_mrr, compute_ndcg, compute_precision_at_k, compute_recall_at_k,
    compute_safety_violation_rate,
)

RankingFunction = Callable[[RecommendationContext, int], list[str]]


def rank_random(context: RecommendationContext, seed: int = 42) -> list[str]:
    items = [ex.id for ex in eligible_candidates(context, enforce_suitability=False)]
    random.Random(seed).shuffle(items)
    return items[:context.limit]


def rank_semantic_only(context: RecommendationContext, seed: int = 42) -> list[str]:
    candidates = eligible_candidates(context, enforce_suitability=False)
    if not candidates:
        return []
    embeddings, _ = encode([_current_document(context), *map(_exercise_document, candidates)])
    scores = np.clip(embeddings[1:] @ embeddings[0], 0.0, 1.0)
    order = sorted(range(len(candidates)), key=lambda i: (-float(scores[i]), candidates[i].id))
    return [candidates[i].id for i in order[:context.limit]]


def rank_rule_only(context: RecommendationContext, seed: int = 42) -> list[str]:
    candidates = eligible_candidates(context)
    scored = [(_rule_evaluation(ex, context)[0], ex.id) for ex in candidates]
    scored.sort(key=lambda pair: (-pair[0], pair[1]))
    return [ex_id for _, ex_id in scored[:context.limit]]


def rank_proposed_hybrid(context: RecommendationContext, seed: int = 42) -> list[str]:
    items, _, _ = recommend(context)
    return [item.exercise_id for item in items]


def score_ranking(ids: list[str], persona: BenchmarkPersona) -> dict[str, float]:
    truth = persona.relevance_scores
    return {
        "precision_at_4": compute_precision_at_k(ids, truth, k=4),
        "recall_at_4": compute_recall_at_k(ids, truth, k=4),
        "ndcg_at_4": compute_ndcg(ids, truth, k=4),
        "mrr": compute_mrr(ids, truth),
        "hit_rate_at_1": compute_hit_rate(ids, truth, k=1),
        "hit_rate_at_4": compute_hit_rate(ids, truth, k=4),
        "safety_violation_rate": compute_safety_violation_rate(ids, truth, k=4),
        "intra_list_diversity": compute_intra_list_diversity(ids, EXERCISE_MAP, k=4),
        "fill_rate_at_4": len(ids) / 4,
        "explicit_exclusion_violation_rate": 100 * len(set(ids) & set(persona.excluded_exercise_ids)) / max(1, len(ids)),
    }


def bootstrap_interval(values: list[float], seed: int) -> list[float]:
    # Resample personas, not repeated timings of the same persona.
    rng = np.random.default_rng(seed)
    means = rng.choice(values, size=(2000, len(values)), replace=True).mean(axis=1)
    return [round(float(v), 4) for v in np.percentile(means, [2.5, 97.5])]


def evaluate_model(
    model_name: str,
    ranking_fn: RankingFunction,
    personas: list[BenchmarkPersona],
    runs_per_persona: int = 10,
    seed: int = 42,
) -> tuple[dict, list[dict]]:
    if not personas or runs_per_persona < 1:
        raise ValueError("Provide personas and at least one run per persona")
    # Warm each context once. Timed runs exclude model initialization and I/O.
    contexts = [persona.to_context() for persona in personas]
    for context in contexts:
        ranking_fn(context, seed)
    records = []
    all_ids: set[str] = set()
    latencies = []
    for index, (persona, context) in enumerate(zip(personas, contexts)):
        runs = []
        for run in range(runs_per_persona):
            run_seed = seed + index * runs_per_persona + run
            start = time.perf_counter()
            ids = ranking_fn(context, run_seed)
            latency = (time.perf_counter() - start) * 1000
            if len(ids) > context.limit or len(ids) != len(set(ids)):
                raise ValueError(f"{model_name} returned duplicate or excessive items")
            if set(ids) - set(EXERCISE_MAP):
                raise ValueError(f"{model_name} returned unknown exercises")
            latencies.append(latency)
            all_ids.update(ids)
            runs.append({
                "seed": run_seed, "recommended_ids": ids,
                "relevances": [persona.relevance_scores[item] for item in ids],
                **score_ranking(ids, persona), "latency_ms": latency,
            })
        keys = list(score_ranking([], persona)) + ["latency_ms"]
        records.append({
            "persona_id": persona.id, "title": persona.title, "category": persona.category,
            "check_in_answers": persona.check_in_answers,
            "onboarding_goal": persona.onboarding_goal, "journal_texts": persona.journal_texts,
            "relevance_scores": persona.relevance_scores,
            "comfort_preferences": persona.comfort_preferences,
            "excluded_exercise_ids": persona.excluded_exercise_ids,
            "contraindication_signals": persona.contraindication_signals,
            **{key: float(np.mean([run[key] for run in runs])) for key in keys},
            "runs": runs,
        })
    metric_keys = list(score_ranking([], personas[0]))
    summary = {
        "model_name": model_name,
        **{key: round(float(np.mean([record[key] for record in records])), 4) for key in metric_keys},
        "catalog_coverage": round(compute_catalog_coverage(all_ids, set(EXERCISE_MAP)), 2),
        "mean_latency_ms": round(float(np.mean(latencies)), 3),
        "p50_latency_ms": round(float(np.percentile(latencies, 50)), 3),
        "p95_latency_ms": round(float(np.percentile(latencies, 95)), 3),
        "timed_runs": len(latencies),
        "confidence_intervals_95": {
            key: bootstrap_interval([record[key] for record in records], seed)
            for key in ["precision_at_4", "ndcg_at_4", "safety_violation_rate"]
        },
    }
    return summary, records


def validate_benchmark(personas: list[BenchmarkPersona] = BENCHMARK_PERSONAS) -> None:
    ids = set(EXERCISE_MAP)
    if len(ids) != len(BENCHMARK_CATALOG):
        raise ValueError("Duplicate catalog IDs")
    if len({p.id for p in personas}) != len(personas):
        raise ValueError("Duplicate persona IDs")
    for persona in personas:
        if set(persona.relevance_scores) != ids:
            raise ValueError(f"{persona.id}: labels must cover the complete catalog")
        if set(persona.relevance_scores.values()) - {-1, 0, 1, 2, 3}:
            raise ValueError(f"{persona.id}: invalid relevance labels")


def run_full_ablation(backend: str = "lexical", runs: int = 10, seed: int = 42,
                      output: Path = Path(__file__).with_name("evaluation_results.json"),
                      suite: str = "original") -> dict:
    if backend not in {"lexical", "onnx"} or runs < 1:
        raise ValueError("Choose lexical or onnx and a positive run count")
    from evaluation.production_personas import production_personas
    personas = BENCHMARK_PERSONAS if suite == "original" else production_personas(suite)
    validate_benchmark(personas)
    platform_description = platform.platform()
    # Explicit experiment configuration. ONNX runs must never silently fall back.
    os.environ["RECOMMENDER_EMBEDDING_BACKEND"] = backend
    os.environ["ALLOW_LEXICAL_FALLBACK"] = "false"
    _, actual_backend = encode(["benchmark initialization"])
    model_hashes = {}
    if backend == "onnx":
        for filename in ["tokenizer.json", "onnx/model.onnx"]:
            with (Path(MODEL_PATH) / filename).open("rb") as source:
                model_hashes[filename] = hashlib.file_digest(source, "sha256").hexdigest()
    models = [
        ("Random Baseline", rank_random),
        (f"Text Similarity ({backend})", rank_semantic_only),
        ("Rules + Eligibility", rank_rule_only),
        ("Holistic Mind Hybrid", rank_proposed_hybrid),
    ]
    data = {
        "schema_version": 2, "personas_count": len(personas),
        "catalog_count": len(BENCHMARK_CATALOG), "summary": [], "models": {},
        "catalog": [item.model_dump() for item in BENCHMARK_CATALOG],
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "suite": suite, "journal_history_used": suite == "original",
            "requested_backend": backend, "actual_backend": actual_backend,
            "engine_version": "hybrid-v4", "python": platform.python_version(),
            "numpy": np.__version__, "platform": platform_description,
            "runs_per_persona": runs, "seed": seed,
            "strategy": "content-based-cold-start",
            "model_file_hashes": model_hashes,
            "source_hashes": {
                name: hashlib.sha256((_ROOT / name).read_bytes()).hexdigest()
                for name in ["app/engine.py", "app/schemas.py", "evaluation/evaluate.py",
                             "evaluation/benchmark_personas.py", "evaluation/catalog.py", "evaluation/metrics.py",
                             "evaluation/production_personas.py", "../backend/src/data/comfortPreferences.ts"]
            },
            "limitations": [
                "Authored synthetic scenarios; labels have not been independently clinically validated.",
                "Original persona inputs and labels are unchanged. Journal-only contraindications are not reliably detected; remaining label violations are reported.",
                "Fixed 14-exercise catalog and cold-start contexts; no live catalog, collaborative quality or longitudinal rotation measurement.",
                "Production suite removes journals but retains original labels. Comfort suite adds declared user choices; it is a separate restriction stress test, not a paired overall quality comparison.",
                "Comfort-suite relevance labels are unchanged even for excluded items; recall and ideal NDCG are not preference-adjusted. Read explicit exclusion violations separately.",
                "Text-only and random baselines omit suitability rules; all approaches honor explicit exclusions and deduplicate candidates.",
                "Rules and hybrid enforce known contraindications before ranking and may return fewer than four items.",
                "Latency is warm in-process ranking across every persona; excludes startup, model loading, database, network and app time.",
                "Random seeds vary by persona and repeat. Metrics average repeats within personas, then weight personas equally.",
                f"95% bootstrap intervals resample these {len(personas)} scenarios; they do not establish real-world or clinical effectiveness.",
                "Lexical mode uses hashed word counts, not MiniLM semantic embeddings." if backend == "lexical" else "ONNX mode is strict: model-loading failures abort the run.",
            ],
        },
    }
    for name, fn in models:
        print(f"Evaluating {name} ({runs} runs/persona)…", flush=True)
        summary, records = evaluate_model(name, fn, personas, runs, seed)
        data["summary"].append(summary)
        data["models"][name] = records
        print(f"  P@4 {summary['precision_at_4']:.4f} | NDCG@4 {summary['ndcg_at_4']:.4f} | label violations {summary['safety_violation_rate']:.2f}%")
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2, allow_nan=False) + "\n", encoding="utf-8")
    from evaluation.report import write_report
    from evaluation.plot import write_figures
    write_report(data, output.with_suffix(".html"))
    write_figures(data, output.with_suffix(""))
    print(f"Results: {output}\nDashboard: {output.with_suffix('.html')}")
    return data


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--suite", choices=["original", "production", "comfort"], default="original")
    parser.add_argument("--backend", choices=["lexical", "onnx"], default="lexical")
    parser.add_argument("--runs", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args()
    if args.runs < 1:
        parser.error("--runs must be at least 1")
    output = args.output or Path(__file__).with_name(
        "evaluation_results.json" if args.suite == "original" else f"evaluation_results_{args.suite}_{args.backend}.json")
    run_full_ablation(args.backend, args.runs, args.seed, output, args.suite)
