#!/usr/bin/env python3
"""Run OpenMontage's local VideoAnalyzer for one reference URL and emit JSON."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "vendor" / "OpenMontage"
if not UPSTREAM.is_dir():
    raise SystemExit("OpenMontage submodule is missing. Clone with --recurse-submodules.")
sys.path.insert(0, str(UPSTREAM))

from tools.analysis.video_analyzer import VideoAnalyzer  # noqa: E402

def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: openmontage_reference_analyzer.py URL OUTPUT_DIR MAX_KEYFRAMES", file=sys.stderr)
        return 2
    url, output_dir, max_frames = sys.argv[1], sys.argv[2], int(sys.argv[3])
    result = VideoAnalyzer().execute({
        "source": url,
        "analysis_depth": "standard",
        "max_keyframes": max_frames,
        "output_dir": output_dir,
    })
    if not result.success:
        print(result.error or "OpenMontage VideoAnalyzer failed", file=sys.stderr)
        return 1
    print(json.dumps(result.data, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
