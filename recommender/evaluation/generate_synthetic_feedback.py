"""Generate fictional exercise sessions for pipeline testing, never efficacy evidence."""
import argparse
import csv
import hashlib
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.engine import eligible_candidates
from evaluation.benchmark_personas import BENCHMARK_PERSONAS
from evaluation.catalog import BENCHMARK_CATALOG
from evaluation.production_personas import comfort_constraints


def clamp(value, low, high):
    return max(low, min(high, value))


def generate(output: Path, seed: int = 42, participants: int = 120, sessions: int = 10):
    if participants < 10 or sessions < 1:
        raise ValueError("Use at least 10 fictional participants and one session each")
    rng = random.Random(seed)
    options = ["self_touch", "breath_holds", "head_scanning", "body_scans"]
    preferences = [[option for option in options if rng.random() < 0.18]
                   for _ in range(participants)]
    policies = comfort_constraints(preferences)
    participant_order = list(range(participants))
    rng.shuffle(participant_order)
    splits = {person: ("development" if i < int(participants * .7) else
                       "validation" if i < int(participants * .85) else "test")
              for i, person in enumerate(participant_order)}
    rows = []
    for person in range(participants):
        # Fictional stable individual variation, unrelated to engine scores.
        affinity = {ex.id: rng.uniform(-1, 1) for ex in BENCHMARK_CATALOG}
        policy = policies[person]
        excluded = set(policy["excludedIds"])
        if policy["avoidBreathHolds"]:
            excluded.update(ex.id for ex in BENCHMARK_CATALOG if ex.breath_hold_required)
        for session in range(sessions):
            persona = rng.choice(BENCHMARK_PERSONAS)
            context = persona.to_context().model_copy(update={
                "journal_texts": [], "excluded_exercise_ids": sorted(excluded),
                "contraindication_signals": policy["signals"],
            })
            candidates = eligible_candidates(context)
            exercise = rng.choice(candidates)
            support = persona.check_in_answers["support"].lower().replace(" ", "_")
            goal_match = support in exercise.support_goals
            stress_range = {"None": (0, 2), "A little": (3, 6), "Very stressed": (7, 10)}
            before = rng.randint(*stress_range[persona.check_in_answers["stress"]])
            discomfort = rng.random() < .10
            stopped = discomfort and rng.random() < .65
            missing = rng.random() < .08
            # Explicitly invented outcome model; no claim these effects exist.
            change = .4 + .8 * goal_match + affinity[exercise.id] + rng.gauss(0, 1.5)
            if rng.random() < .15:
                change = 0
            if discomfort:
                change -= 2
            after = int(clamp(round(before - change), 0, 10))
            helpfulness = int(clamp(round(3 + .6 * (before - after) + rng.gauss(0, .8)), 1, 5))
            planned = rng.choice([60, 120, 180, 300])
            actual = rng.randint(10, planned - 1) if stopped else planned
            rows.append({
                "data_origin": "SYNTHETIC_NOT_REAL_PARTICIPANTS",
                "generator_version": "synthetic-feedback-v1", "seed": seed,
                "session_id": f"SYN-{person + 1:03d}-{session + 1:02d}",
                "participant_id": f"SYN-P{person + 1:03d}", "split": splits[person],
                "session_number": session + 1, "source_scenario_id": persona.id,
                **persona.check_in_answers,
                "comfort_preferences": "|".join(preferences[person]),
                "excluded_exercise_ids": "|".join(sorted(excluded)),
                "exercise_id": exercise.id, "exercise_title": exercise.title,
                "selection_method": "uniform_random_among_engine_eligible",
                "eligible_count": len(candidates),
                "selection_probability": round(1 / len(candidates), 8),
                "planned_duration_seconds": planned, "actual_duration_seconds": actual,
                "stress_before_0_10": before,
                "feedback_missing": missing,
                "stress_after_0_10": "" if missing else after,
                "stress_reduction": "" if missing else before - after,
                "helpfulness_1_5": "" if missing else helpfulness,
                "discomfort_reported": discomfort, "stopped_early": stopped,
                "would_use_again": "" if missing else helpfulness >= 4 and not discomfort,
            })
    output.mkdir(parents=True, exist_ok=True)
    path = output / "synthetic_feedback.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    metadata = {
        "data_origin": "SYNTHETIC_NOT_REAL_PARTICIPANTS",
        "purpose": "Software and analysis testing only; not rule justification or efficacy evidence",
        "seed": seed, "participants": participants, "sessions_per_participant": sessions,
        "rows": len(rows), "csv_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "source_hashes": {str(p.relative_to(ROOT.parent)): hashlib.sha256(p.read_bytes()).hexdigest()
                          for p in [Path(__file__), ROOT / "app/engine.py",
                                    ROOT / "evaluation/catalog.py", ROOT / "evaluation/benchmark_personas.py",
                                    ROOT / "evaluation/production_personas.py",
                                    ROOT.parent / "backend/src/data/comfortPreferences.ts"]},
        "split_participants": {split: sum(v == split for v in splits.values())
                               for split in ["development", "validation", "test"]},
        "missing_feedback_rows": sum(r["feedback_missing"] for r in rows),
        "discomfort_rows": sum(r["discomfort_reported"] for r in rows),
        "stopped_rows": sum(r["stopped_early"] for r in rows),
        "unchanged_stress_rows": sum(r["stress_reduction"] == 0 for r in rows),
        "worse_stress_rows": sum(isinstance(r["stress_reduction"], int) and r["stress_reduction"] < 0 for r in rows),
    }
    (output / "manifest.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({k: v for k, v in metadata.items() if k != "source_hashes"}, indent=2))
    return rows


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--participants", type=int, default=120)
    parser.add_argument("--sessions", type=int, default=10)
    parser.add_argument("--output", type=Path, default=Path(__file__).with_name("synthetic_feedback"))
    args = parser.parse_args()
    generate(args.output, args.seed, args.participants, args.sessions)
