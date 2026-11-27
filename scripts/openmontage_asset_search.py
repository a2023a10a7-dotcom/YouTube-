#!/usr/bin/env python3
"""Call OpenMontage DirectClipSearch for AI-directed documentary scene queries."""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = ROOT / "vendor" / "OpenMontage"
if not UPSTREAM.is_dir():
    raise SystemExit("OpenMontage submodule is missing. Clone with --recurse-submodules.")
sys.path.insert(0, str(UPSTREAM))
from tools.video.direct_clip_search import DirectClipSearch  # noqa: E402

def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: openmontage_asset_search.py INPUT_JSON OUTPUT_DIR", file=sys.stderr)
        return 2
    request = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    result = DirectClipSearch().execute({
        "output_dir": sys.argv[2],
        "queries": request["queries"],
        "clips_per_query": int(request.get("clipsPerQuery", 2)),
        "filters": {"orientation": "landscape", "min_width": 1280, "min_duration": 3},
        "extract_thumbnails": True,
        "timeout_seconds": int(request.get("timeoutSeconds", 600)),
    })
    if not result.success:
        print(result.error or "OpenMontage DirectClipSearch failed", file=sys.stderr)
        if result.data:
            print(json.dumps(result.data, ensure_ascii=False), file=sys.stderr)
        return 1
    print(json.dumps(result.data, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
