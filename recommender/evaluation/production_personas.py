"""Journal-free request fixtures using the application's actual comfort policy.

These remain authored, fixed-catalog, cold-start scenarios, not live-user data.
Original relevance labels are intentionally retained, including disputed labels.
"""
import json
import subprocess
from dataclasses import replace
from pathlib import Path

from evaluation.benchmark_personas import BENCHMARK_PERSONAS, BenchmarkPersona
from evaluation.catalog import BENCHMARK_CATALOG

ROOT = Path(__file__).resolve().parents[2]


def comfort_constraints(preferences: list[list[str]]) -> list[dict]:
    # Execute the shared TypeScript policy instead of maintaining a Python copy.
    result = subprocess.run([
        "node", "--import", "./backend/node_modules/tsx/dist/loader.mjs",
        "--input-type=module", "-e",
        "import {getComfortConstraints} from './backend/src/data/comfortPreferences.ts';"
        "console.log(JSON.stringify(JSON.parse(process.argv[1]).map(getComfortConstraints)));",
        json.dumps(preferences),
    ], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def production_personas(suite: str) -> list[BenchmarkPersona]:
    if suite == "production":
        # Paired comparison: only remove journal text; do not invent user choices.
        return [replace(p, journal_texts=[]) for p in BENCHMARK_PERSONAS]
    if suite != "comfort":
        raise ValueError(f"Unknown production suite: {suite}")
    cases = [
        ("P27", ["self_touch"]),
        ("P29", ["head_scanning"]),
        # This is a NEW explicit-preference variant, not a fix for P07's label.
        ("P07", ["body_scans"]),
        ("P15", ["breath_holds"]),
        ("P01", []),
        ("P01", ["self_touch", "breath_holds", "head_scanning", "body_scans"]),
        ("P27", ["self_touch", "body_scans"]),
        ("P29", ["head_scanning", "breath_holds"]),
    ]
    originals = {p.id: p for p in BENCHMARK_PERSONAS}
    constraints = comfort_constraints([preferences for _, preferences in cases])
    result = []
    for index, ((source, preferences), policy) in enumerate(zip(cases, constraints)):
        excluded = set(policy["excludedIds"])
        if policy["avoidBreathHolds"]:
            excluded.update(ex.id for ex in BENCHMARK_CATALOG if ex.breath_hold_required)
        result.append(replace(
            originals[source], id=f"C{index + 1:02d}-{source}",
            title=f"{originals[source].title} [preferences: {', '.join(preferences) or 'none'}]",
            journal_texts=[], comfort_preferences=preferences,
            excluded_exercise_ids=sorted(excluded), contraindication_signals=policy["signals"],
        ))
    return result
