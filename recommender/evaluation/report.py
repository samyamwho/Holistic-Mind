"""Build a self-contained offline dashboard from versioned benchmark JSON."""
import argparse
import json
from pathlib import Path


def write_report(data: dict, output: Path) -> None:
    if data.get("schema_version") != 2:
        raise ValueError("Regenerate the benchmark: dashboard requires result schema version 2")
    template = Path(__file__).with_name("dashboard.html").read_text(encoding="utf-8")
    # Keep authored text inert inside the JSON script, including closing script tags.
    payload = json.dumps(data, allow_nan=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    output.write_text(template.replace("__BENCHMARK_DATA__", payload), encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("results", nargs="?", type=Path, default=Path(__file__).with_name("evaluation_results.json"))
    args = parser.parse_args()
    write_report(json.loads(args.results.read_text(encoding="utf-8")), args.results.with_suffix(".html"))
    print(args.results.with_suffix(".html"))
