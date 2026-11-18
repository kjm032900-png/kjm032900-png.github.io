# Official Mercedes-Benz Korea catalogue colour guide — data workflow

This is a **draft** workflow for the salesperson's private-branch consultation UI. No catalogue pages, photographs or color options are fabricated.

## Authoritative source
- Catalogue index: https://www.mercedes-benz.co.kr/passengercars/models/catalog.html
- Work from the actual document linked by that index, not from another salesperson's website or an older overseas brochure.
- Record the catalogue title, issue/edition date and a stable source PDF URL in `catalog-colors.json`.
- E 200, E 220 d and E 350 e share the general E-Class catalogue. AMG E 53 must use the separate AMG E-Class brochure.
- Some homepage model families combine multiple official brochures: AMG CLE Coupé vs Cabriolet; AMG GT Coupé vs GT 4-Door Coupé. The UI now explicitly distinguishes them.
- A dedicated AMG S-Class or AMG GLS brochure was **not observed** in the current catalogue index; do not silently copy general S/GLS data.

## For each official catalogue
1. Download the PDF; verify the document's edition and its relevant `Colours`, `Upholstery`, and `Trim` pages visually.
2. List every option in the original order. Copy Korean option name and option code **character for character**; record the source page number.
3. Record explicit applicability and cost notation only where stated by the brochure. Do not infer '무료' from the absence of a paid label.
4. Review rectangles around each vehicle-colour image / seat image / trim image; do not show the full PDF page to the customer.
5. If confirmed redistribution rights exist, use `scripts/catalog_crop.py` and a manually reviewed crop manifest to produce individual WebP images in `images/catalog-colors/<group>/`.
6. Record `image` and `assetApproved: true` **only after** checking ownership/reuse permission and visual correspondence. The image crop receipt saves the SHA-256 of its source PDF and crop rectangle.
7. Set `reviewStatus: verified` only after `sourceEdition`, `sourceDocumentUrl`, and required data are verified. Then run `node scripts/verify-catalog-colors.mjs` and review PC/tablet/mobile UI before merge.

## Example data entry (illustrative field shapes; NOT a real option)
```json
{
  "code": "EXAMPLE-CODE",
  "name": "COPY EXACTLY FROM A VERIFIED CATALOGUE",
  "priceStatus": "unknown",
  "applicability": "COPY OFFICIAL APPLICABILITY IF GIVEN",
  "sourcePage": "42",
  "image": "images/catalog-colors/e-class/EXAMPLE.webp",
  "assetApproved": false
}
```
Do not commit the example as a live colour. Values for real items must come from the selected official catalogue.

## Progress log — 2026-11-18

- 41 brochure groups across 44 model families. A combined home-page family can point to multiple brochure groups when required.
- 37 group PDFs located in the user's Library (listed under `sourceFileName` only; private Library identifiers must never be published); these are source **candidates**, not automatically verified publication assets.
- `e-class` (26MY, 2026-04-24): 10 exterior colours, 13 upholstery entries, 8 interior trim / console / roof-liner entries from pages 44–74. `reviewStatus: text_verified`.
- `c-class` (26MY, 2026-04-24): 12 exterior colours, 7 upholstery entries, 7 trim/console/roof-liner entries from pages 27–52. `reviewStatus: text_verified`.
- All 57 options are linked to catalogue page numbers. The wording and code are taken from the source PDFs. Price and applicability statements are only retained where explicitly printed.
- Colour/seat photographs have **not** been posted to GitHub. Source Library PDF bytes could not be materialized by the present tool, and public website redistribution permission was not verified.
- The remaining 39 brochure groups remain pending source text and image verification, including four without a matched current PDF candidate: amg-a-class, amg-s-class, amg-gls, amg-g-class. A 2025 AMG G-Class PDF exists but must **not** be used for the 27MY G 63.
- This text-only preview is still **not ready to merge**; photographs are required for the user's intended customer consultation workflow.

## Maybach source-PDF upload — 2026-11-18
- Four original user-uploaded PDFs are directly readable for text and rendered-page inspection: Mercedes-Maybach S-Class **27MY**, GLS **26MY**, EQS SUV **26MY**, SL **26MY**.
- Official-source colours, upholstery and interior finishes were manually cross-checked against page renderings and PDF code strings. All 98 code occurrences matched source pages: 96 paint/seat/trim entries + 2 SL exterior detail options.
- S-Class (pages 40–49): 30 exterior (including two-tone), 9 seat, 6 interior = **45 items**.
- GLS (pages 39–55): 9 exterior, 2 seat, 6 interior = **17 items**.
- EQS SUV (pages 20–26): 16 exterior (including two-tone), 3 seat, 10 interior = **29 items**.
- SL (pages 27–32): 2 exterior, 1 seat, 2 interior = **5 items**, plus 756 soft top and 327 patterned bonnet as related exterior details.
- All four groups are `text_verified`. Source PDFs are SHA-256-pinned in `catalog-colors.json`. For each group, a reproducible crop manifest in `docs/crop-manifests/` identifies each source page, colour/seat/trim code and image rectangle. A selected set of colour-by-car crops was visually checked locally. All other image rectangles require further QA.
- Combined verified text tally so far: 6 groups, **79 exterior**, **35 seats**, **39 interior finishes** = **153 items**, plus 2 SL exterior construction details.
- **No photographs have been committed** to public GitHub: reuse / redistribution permission for the dealer's public website has not been established. This draft is not production ready.

## AMG official-PDF upload — 2026-11-18

- 13 Mercedes-AMG official PDF catalogues received as original files and checked for catalogue date/MY.
- 11 showroom-mapped AMG catalogue groups now hold verified textual options:
  - AMG A-Class hatchback 26MY: 7 exterior / 5 seats / 3 trims
  - AMG CLA 26MY: 3 exterior / 5 seats / 1 trim
  - AMG E-Class 26MY: 10 exterior / 4 seats / 2 trims
  - AMG GLB 26MY: 7 exterior / 4 seats / 4 trims
  - AMG GLC & Coupé 26MY: 22 exterior image entries (11 SUV + 11 Coupé), 1 seat / 4 trims
  - AMG GLE & Coupé 26MY: 10 exterior image entries (5 SUV + 5 Coupé), 4 seats / 4 trims
  - AMG GT 4-Door 26MY: 19 exterior / 12 seats / 4 trims
  - AMG SL 27MY: 20 exterior / 7 seats / 7 trims; four soft tops as exterior details
  - AMG CLE Coupé 27MY: 7 exterior / 4 seats / 2 documented finishes; H44 trim needs extra source inspection
  - AMG CLE Cabriolet 27MY: 7 exterior / 4 seats / 2 documented finishes; three soft tops as exterior details, H44 needs extra inspection
  - AMG GT Coupé **25MY**: 21 exterior / 14 seats / 9 trims, but homepage lists certain GT Coupé variants as 27MY; **show an explicit MY mismatch warning**
- The Mercedes-AMG A-Class Sedan 25MY PDF is **not** substituted for the A 45 S hatchback; the AMG G-Class 25MY PDF is **not** applied to current 27MY G 63. They are recorded as historic/other-body references only.
- Brochure text is extracted only where readable and visually confirmed. No photo or body style is invented.
- **Combined text-sourced registered total: 17 catalogue groups, 212 exterior image entries, 99 upholstery entries, 81 interior finishes = 392 items**, plus 9 optional exterior-detail records. Of 41 total catalogue groups, 24 remain pending text verification. 3 are still missing current-matching PDF candidates (AMG S-Class, AMG GLS and AMG G-Class 27MY).
- Source PDFs are individually SHA-256 pinned. AMG GLC/GLE codes repeat for SUV and Coupé as *separate image entries* because each body has its own vehicle photograph in the official brochure.
- The current customer-facing UI displays verified names, codes, catalogue page numbers and stated price/applicability. Images remain restricted pending explicit redistribution approval and full visual QA.

## Current blockers

- Older Library PDFs remain restricted for raw-byte materialization, but the four Maybach PDFs were uploaded directly in this conversation and their original bytes can now be used for local image crops. This does not grant public redistribution rights.
- To finish the photo gallery, source PDF bytes and permission to republish its vehicle/seat images must be established; then extract only each image, not whole PDF pages.
- Some MY27 models have only older source brochures in the Library. Display exact source edition and avoid silently applying MY26 colours as MY27 guaranteed availability.
- Test all tabs, visual fidelity and mobile widths on the completed image data before any deployment.

All changes remain in Draft PR #4. Existing live `main` prices, promotions, GA4 and search engine setup must be left untouched until verification and explicit approval.
