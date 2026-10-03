"""Export report-ready benchmark charts using Matplotlib; no network required."""
import argparse
import json
import os
from pathlib import Path
import tempfile

os.environ.setdefault("MPLCONFIGDIR", str(Path(tempfile.gettempdir()) / "holistic-mind-matplotlib"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


def write_figures(data: dict, prefix: Path) -> None:
    labels = ["Random", "Text similarity", "Rules + eligibility", "Hybrid"]
    colors = ["#869b88", "#bda187", "#8b82a3", "#38644f"]
    fig, axes = plt.subplots(2, 2, figsize=(11, 8), layout="constrained")
    fig.set_facecolor("#f7f5ef")
    specs = [("precision_at_4", "Precision@4 · higher is better", 1),
             ("ndcg_at_4", "NDCG@4 · higher is better", 1),
             ("safety_violation_rate", "Benchmark-label violations (%) · lower is better", None),
             ("mean_latency_ms", "Warm ranking time (ms) · lower is better", None)]
    for ax, (key, title, maximum) in zip(axes.flat, specs):
        values = np.array([s[key] for s in data["summary"]])
        intervals = [s["confidence_intervals_95"].get(key) for s in data["summary"]]
        bars = ax.bar(labels, values, color=colors, width=0.6)
        if all(interval is not None for interval in intervals):
            # Plot endpoints directly: no assumption that a percentile interval contains its point estimate.
            for index, interval in enumerate(intervals):
                if interval is not None:
                    ax.vlines(index, interval[0], interval[1], color="#253d36", linewidth=1)
                    ax.hlines(interval, index-0.08, index+0.08, color="#253d36", linewidth=1)
        tops = [max(float(value), interval[1] if interval is not None else 0)
                for value, interval in zip(values, intervals)]
        upper = maximum * 1.12 if maximum else max(max(tops), 0.1) * 1.25
        for index, (value, top) in enumerate(zip(values, tops)):
            ax.text(index, top + upper * 0.025, f"{value:.3f}" if maximum else f"{value:.2f}",
                    ha="center", va="bottom", fontsize=9)
        ax.set_title(title, fontsize=11, loc="left", pad=14)
        ax.set_facecolor("#fffefa")
        ax.set_ylim(0, upper)
        ax.tick_params(axis="x", labelsize=9, rotation=12)
        ax.spines[["top", "right"]].set_visible(False)
        ax.grid(axis="y", alpha=0.15)
        ax.set_axisbelow(True)
    fig.suptitle("Holistic Mind · Recommendation benchmark\n"
                 f"{data['metadata']['actual_backend']} · {data['personas_count']} synthetic personas · "
                 f"{data['metadata']['runs_per_persona']} runs/persona", fontsize=16)
    fig.supxlabel("Intervals: 95% bootstrap over personas. Author-assigned labels; not clinical validation.\n"
                  "Timing excludes model loading, database, network and app time.", fontsize=9)
    for extension in ["svg", "png"]:
        fig.savefig(str(prefix) + "_charts." + extension, dpi=180)
    plt.close(fig)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", nargs="?", type=Path, default=Path(__file__).with_name("evaluation_results.json"))
    args = parser.parse_args()
    write_figures(json.loads(args.results.read_text()), args.results.with_suffix(""))
