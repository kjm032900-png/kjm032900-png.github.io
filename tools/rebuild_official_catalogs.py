#!/usr/bin/env python3
"""Build real full-page catalogue photos from Mercedes-Benz Korea's official PDFs.

Examples:
  python tools/rebuild_official_catalogs.py --groups e-class electric-g-class amg-g-class

The script fails closed: no synthetic substitution, model-year guessing, or
cropping of option text. It commits nothing itself. The GitHub workflow handles
publication only after successful validation.
"""
import argparse
import json
import re
import urllib.parse
from collections import defaultdict
from pathlib import Path

import fitz
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "catalog-colors.json"
OFFICIAL = "https://www.mercedes-benz.co.kr/content/dam/south-korea/passenger-cars/model/catalog/2026/"
LATEST_G63 = "The new Mercedes-AMG G-Class_Catalogue_20261029.pdf"
HEADERS = {"exterior": "외장 컬러", "seats": "실내 시트", "interiorTrims": "인테리어 트림"}

def fetch(session, filename, target):
    if target.is_file() and target.stat().st_size > 200000:
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    url = OFFICIAL + urllib.parse.quote(filename)
    with session.get(url, stream=True, timeout=(30, 180)) as response:
        response.raise_for_status()
        with target.open("wb") as output:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    output.write(chunk)
    if target.stat().st_size < 200000 or target.read_bytes()[:4] != b"%PDF":
        target.unlink(missing_ok=True)
        raise RuntimeError("Not a usable official PDF: " + filename)

def render(pdf, page_number, target, width):
    if target.is_file() and target.stat().st_size > 5000:
        return
    page = pdf[page_number - 1]
    factor = width / page.rect.width
    pix = page.get_pixmap(matrix=fitz.Matrix(factor, factor), alpha=False, colorspace=fitz.csRGB)
    img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    target.parent.mkdir(parents=True, exist_ok=True)
    img.save(target, "WEBP", quality=91, method=1)

def items_for_old_groups(group, pdf):
    mapping = defaultdict(list)
    for kind in HEADERS:
        for item in group.get(kind, []):
            page = str(item.get("sourcePage", "")).strip()
            if not page.isdecimal() or not (1 <= int(page) <= len(pdf)):
                continue
            # Source labels were collected from the same official catalogue;
            # insist that the page contains the expected option code before publishing.
            if item.get("code") and item["code"].lower() not in pdf[int(page)-1].get_text().lower():
                print("SKIP incorrect page mapping:", kind, item["code"], page, flush=True)
                continue
            mapping[int(page)].append(item)
    return mapping

def rebuild_g63(group, pdf):
    # This is the new 27MY official AMG G-Class PDF, never the older 25MY upload.
    groups = {key: [] for key in HEADERS}
    for number, page in enumerate(pdf, 1):
        text = page.get_text()
        # A G-Class catalogue has repeated navigation headings on each page.
        # Require actual equipment codes, not a navigation heading alone.
        kind = None
        if re.search(r"(?<![A-Z0-9])\\d{3}U\\s*[-–]", text):
            kind = "exterior"
        elif re.search(r"(?<![A-Z0-9])\\d{3}A\\s*[-–]", text):
            kind = "seats"
        elif re.search(r"(?<![A-Z0-9])(?:ZG\\d|VA\\d|H\\d{2})\\s*[-–]", text):
            kind = "interiorTrims"
        if kind is None:
            continue
        group_items = groups[kind]
        group_items.append({
            "code": "",
            "name": HEADERS[kind] + " · 공식 원본 " + str(len(group_items) + 1),
            "sourcePage": str(number),
            "sourceDocumentLabel": "Mercedes-AMG G-Class 공식 27MY 카탈로그",
        })
    if any(not values for values in groups.values()):
        raise RuntimeError("G 63 27MY: failed to identify all three groups; not publishing unverified catalogue.")
    for kind, items in groups.items():
        group[kind] = items
    group["sourceFileName"] = LATEST_G63
    group["sourceEdition"] = "2026년 10월 29일, 27년식"
    group["sourceDocumentUrl"] = OFFICIAL + urllib.parse.quote(LATEST_G63)
    group["reviewStatus"] = "verified"
    group["verificationNote"] = "27MY Mercedes-AMG G-Class 공식 원본 페이지. 옵션 코드는 사진 내부 원문 참조."
    return items_for_old_groups(group, pdf)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--groups", nargs="+", required=True)
    parser.add_argument("--width", type=int, default=1920)
    args = parser.parse_args()
    if args.width < 1600:
        raise SystemExit("High-resolution original pages must be rendered at least 1600px wide.")
    data = json.loads(DATA.read_text(encoding="utf-8"))
    with requests.Session() as session:
        session.headers.update({"User-Agent": "Mozilla/5.0 (compatible; CatalogReference/1.0)"})
        for key in args.groups:
            group = data["catalogGroups"].get(key)
            if not group:
                raise RuntimeError("Unknown catalogue group: " + key)
            filename = LATEST_G63 if key == "amg-g-class" else group.get("sourceFileName")
            if not filename:
                print("SKIP no official source:", key, flush=True)
                continue
            local = ROOT / ".catalog-downloads" / filename
            print("Downloading", key, filename, flush=True)
            fetch(session, filename, local)
            with fitz.open(local) as pdf:
                mapping = rebuild_g63(group, pdf) if key == "amg-g-class" else items_for_old_groups(group, pdf)
                if not mapping:
                    raise RuntimeError("No verified page mappings for " + key)
                for number, items in sorted(mapping.items()):
                    rel = f"images/catalog-originals/{key}/page-{number:03d}.webp"
                    render(pdf, number, ROOT / rel, args.width)
                    for item in items:
                        item["originalImage"] = rel
                        item["originalApproved"] = True
                print("Rendered", key, len(mapping), "full pages", flush=True)
        DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
