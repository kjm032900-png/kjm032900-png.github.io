#!/usr/bin/env python3
"""Crop manually verified catalogue regions into separate WebP images.

Requires: pip install pymupdf pillow
Usage: python scripts/catalog_crop.py --pdf /path/to/official.pdf --manifest crops.json --out-dir images/catalog-colors

crops.json: {"group":"e-class","pdf_sha256":"...","crops":[{"page":42,"rect":[50,80,290,240],"filename":"149u-polar-white"}]}
The rectangle uses original PDF page points. This creates local assets only and does not publish them.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
from pathlib import Path

try:
    import fitz
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Install PyMuPDF and Pillow first") from exc

SAFE = re.compile(r"^[a-z0-9][a-z0-9-]{0,90}$")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--pdf", type=Path, required=True)
    ap.add_argument("--manifest", type=Path, required=True)
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--dpi", type=int, default=180)
    args = ap.parse_args()
    spec = json.loads(args.manifest.read_text(encoding="utf-8"))
    group = spec["group"]
    if not SAFE.fullmatch(group):
        raise SystemExit("Invalid group")
    sha = hashlib.sha256(args.pdf.read_bytes()).hexdigest()
    if spec.get("pdf_sha256") and spec["pdf_sha256"] != sha:
        raise SystemExit("PDF differs from verified source")
    if not 72 <= args.dpi <= 350:
        raise SystemExit("DPI must be 72..350")
    output = args.out_dir / group
    output.mkdir(parents=True, exist_ok=True)
    receipts = []
    with fitz.open(args.pdf) as doc:
        for item in spec["crops"]:
            filename = item["filename"]
            page_no = int(item["page"])
            if not SAFE.fullmatch(filename) or not 1 <= page_no <= doc.page_count:
                raise SystemExit("Invalid crop filename/page")
            coords = item["rect"]
            if not isinstance(coords, list) or len(coords) != 4:
                raise SystemExit("Invalid crop coordinates")
            page = doc[page_no - 1]
            rect = fitz.Rect(*(float(n) for n in coords))
            if rect.is_empty or rect.is_infinite or not page.rect.contains(rect):
                raise SystemExit("Crop out of page bounds")
            pix = page.get_pixmap(clip=rect, dpi=args.dpi, alpha=False)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            target = output / (filename + ".webp")
            image.save(target, "WEBP", quality=88, method=6)
            receipts.append({"file": str(target), "source_page": page_no, "rect": list(rect), "source_sha256": sha})
    (output / "_crop_receipt.json").write_text(json.dumps(receipts, ensure_ascii=False, indent=2), encoding="utf-8")
    print("Created", len(receipts), "crops; visually review and verify reuse rights before publication.")


if __name__ == "__main__":
    main()
