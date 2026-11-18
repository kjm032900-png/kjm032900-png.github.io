#!/usr/bin/env python3
"""Render intact official catalogue pages at readable resolution.

Usage:
  pip install pymupdf pillow
  python tools/build_catalog_originals.py --pdf-dir /path/to/catalogues --only e-class
  python tools/build_catalog_originals.py --pdf-dir /path/to/catalogues --apply

Place the exact PDFs listed in catalog-colors.json in --pdf-dir.
The default is a dry run. No source catalogue text is cropped or rewritten.
"""
import argparse
import json
import re
from pathlib import Path

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-dir", type=Path, required=True)
    parser.add_argument("--only", action="append", default=[], help="catalog group key, repeatable")
    parser.add_argument("--apply", action="store_true", help="render and update catalog-colors.json")
    parser.add_argument("--width", type=int, default=1920, help="output page width in pixels")
    parser.add_argument("--quality", type=int, default=92)
    args = parser.parse_args()
    if args.width < 1400:
        parser.error("--width must be >= 1400 to preserve small catalogue lettering")
    try:
        import fitz
        from PIL import Image
    except ImportError as exc:
        parser.error("Install dependencies: pip install pymupdf pillow (" + str(exc) + ")")
    root = Path(__file__).resolve().parents[1]
    source = root / "catalog-colors.json"
    data = json.loads(source.read_text(encoding="utf-8"))
    result = []
    for key, group in data["catalogGroups"].items():
        if args.only and key not in args.only:
            continue
        pdfname = group.get("sourceFileName")
        if not pdfname:
            result.append((key, "SKIP", "no verified PDF filename"))
            continue
        pdfpath = args.pdf_dir / Path(pdfname).name
        if not pdfpath.is_file():
            result.append((key, "MISSING", str(pdfpath)))
            continue
        with fitz.open(pdfpath) as pdf:
            page_to_items = {}
            for tab in ("exterior", "seats", "interiorTrims"):
                for item in group.get(tab, []):
                    page = str(item.get("sourcePage", "")).strip()
                    if not re.fullmatch(r"[0-9]+", page):
                        continue
                    number = int(page)
                    if number < 1 or number > len(pdf):
                        result.append((key, "BAD_PAGE", tab + ":" + page))
                        continue
                    page_to_items.setdefault(number, []).append(item)
            for number, items in sorted(page_to_items.items()):
                # Each source page is rendered ONCE, even when it describes multiple codes.
                destination = root / "images" / "catalog-originals" / key / (f"page-{number:03d}.webp")
                rel = destination.relative_to(root).as_posix()
                if args.apply:
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    p = pdf[number - 1]
                    matrix = fitz.Matrix(args.width / p.rect.width, args.width / p.rect.width)
                    pix = p.get_pixmap(matrix=matrix, alpha=False, colorspace=fitz.csRGB)
                    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                    img.save(destination, "WEBP", quality=args.quality, method=6)
                    for item in items:
                        item["originalImage"] = rel
                        item["originalApproved"] = True
                result.append((key, "RENDER" if args.apply else "PLAN", f"{number} -> {rel}"))
    if args.apply:
        source.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    counts = {}
    for _, status, _ in result:
        counts[status] = counts.get(status, 0) + 1
    print(json.dumps({"counts": counts, "items": result}, ensure_ascii=False, indent=2))
    if any(s == "MISSING" for _, s, _ in result):
        print("WARNING: Some source PDFs are missing; those entries were left unchanged.")

if __name__ == "__main__":
    main()
