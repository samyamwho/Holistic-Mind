import json

import pytest

from app.schemas import RecommendationContext
from evaluation.benchmark_personas import BENCHMARK_PERSONAS
from evaluation.evaluate import evaluate_model, rank_random, run_full_ablation, validate_benchmark
from evaluation.metrics import compute_ndcg, compute_precision_at_k, compute_safety_violation_rate
from evaluation.report import write_report


def test_metric_math_and_short_lists():
    truth = {"best": 3, "good": 2, "weak": 1, "bad": -1}
    assert compute_precision_at_k(["best"], truth) == 0.25
    assert compute_precision_at_k([], truth) == 0
    assert compute_safety_violation_rate(["best", "bad"], truth) == 50
    assert compute_ndcg(["best", "good", "weak", "bad"], truth) == 1
    assert compute_ndcg(["bad", "weak", "good", "best"], truth) < 1


def test_random_repeats_are_reproducible_but_not_identical():
    first, records = evaluate_model("Any display name", rank_random, BENCHMARK_PERSONAS[:3], 3, 8)
    second, repeated = evaluate_model("Any display name", rank_random, BENCHMARK_PERSONAS[:3], 3, 8)
    lists = [tuple(run["recommended_ids"]) for p in records for run in p["runs"]]
    assert len(set(lists)) > 1
    assert lists == [tuple(run["recommended_ids"]) for p in repeated for run in p["runs"]]
    assert first["timed_runs"] == 9
    assert first["precision_at_4"] == second["precision_at_4"]
    assert len({run["seed"] for p in records for run in p["runs"]}) == 9


def test_all_rankers_honor_exclusions_and_duplicates():
    from evaluation.evaluate import rank_semantic_only, rank_rule_only, rank_proposed_hybrid
    context = RecommendationContext.model_validate({
        "user_id": "test", "excluded_exercise_ids": ["blocked"],
        "exercises": [{"id": id, "title": id, "category": "test"}
                      for id in ["blocked", "keep", "keep"]],
    })
    for rank in [rank_random, rank_semantic_only, rank_rule_only, rank_proposed_hybrid]:
        assert rank(context) == ["keep"]


def test_onnx_failure_does_not_write_mislabeled_results(monkeypatch, tmp_path):
    import evaluation.evaluate as evaluator
    def fail(_texts):
        raise RuntimeError("missing model")
    monkeypatch.setattr(evaluator, "encode", fail)
    monkeypatch.setenv("RECOMMENDER_EMBEDDING_BACKEND", "lexical")
    monkeypatch.setenv("ALLOW_LEXICAL_FALLBACK", "true")
    output = tmp_path / "results.json"
    with pytest.raises(RuntimeError, match="missing model"):
        run_full_ablation("onnx", 1, 42, output)
    assert not output.exists()


def test_invalid_benchmark_options():
    validate_benchmark()
    with pytest.raises(ValueError):
        evaluate_model("random", rank_random, [], 1)
    with pytest.raises(ValueError):
        evaluate_model("random", rank_random, BENCHMARK_PERSONAS, 0)


def test_report_escapes_script_in_persona_text(tmp_path):
    report = tmp_path / "report.html"
    write_report({"schema_version": 2, "text": "</script><script>alert(1)</script>"}, report)
    html = report.read_text()
    assert "</script><script>alert(1)" not in html
    assert "\\u003c/script\\u003e" in html
    assert "__BENCHMARK_DATA__" not in html


def test_production_preserves_labels_and_removes_journals():
    from evaluation.production_personas import production_personas
    for old, new in zip(BENCHMARK_PERSONAS, production_personas('production')):
        assert new.id == old.id
        assert new.relevance_scores == old.relevance_scores
        assert new.check_in_answers == old.check_in_answers
        assert new.to_context().journal_texts == []
        assert new.excluded_exercise_ids == []
    assert any(p.journal_texts for p in BENCHMARK_PERSONAS)


def test_actual_comfort_policy_and_rankers():
    from evaluation.production_personas import production_personas
    from evaluation.evaluate import rank_semantic_only, rank_rule_only, rank_proposed_hybrid
    scenarios = production_personas('comfort')
    assert {'self-containment-hold', 'butterfly-hug'} <= set(scenarios[0].excluded_exercise_ids)
    assert 'orienting-exercise' in scenarios[1].excluded_exercise_ids
    assert 'body-scan' in scenarios[2].excluded_exercise_ids
    assert 'box-breathing' in scenarios[3].excluded_exercise_ids
    assert not scenarios[4].excluded_exercise_ids
    assert len(scenarios[5].comfort_preferences) == 4
    for persona in scenarios:
        context = persona.to_context()
        assert context.journal_texts == []
        for ranker in [rank_random, rank_semantic_only, rank_rule_only, rank_proposed_hybrid]:
            assert not set(ranker(context)) & set(context.excluded_exercise_ids)


def test_sparse_and_empty_eligible_pools_do_not_refill_excluded_items():
    from evaluation.production_personas import production_personas
    from evaluation.evaluate import rank_semantic_only, rank_rule_only, rank_proposed_hybrid
    persona = production_personas('comfort')[5]
    context = persona.to_context()
    blocked = [ex for ex in context.exercises if ex.id in context.excluded_exercise_ids]
    keep = next(ex for ex in context.exercises if ex.id == 'five-senses')
    for ranker in [rank_random, rank_semantic_only, rank_rule_only, rank_proposed_hybrid]:
        assert ranker(context.model_copy(update={'exercises': blocked + [keep]})) == ['five-senses']
        assert ranker(context.model_copy(update={'exercises': blocked})) == []
