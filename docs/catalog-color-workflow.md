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
- 34 group PDFs located in the user's Library (listed under `sourceFileName` only; private Library identifiers must never be published); these are source **candidates**, not automatically verified publication assets.
- `e-class` (26MY, 2026-04-24): 10 exterior colours, 13 upholstery entries, 8 interior trim / console / roof-liner entries from pages 44–74. `reviewStatus: text_verified`.
- `c-class` (26MY, 2026-04-24): 12 exterior colours, 7 upholstery entries, 7 trim/console/roof-liner entries from pages 27–52. `reviewStatus: text_verified`.
- All 57 options are linked to catalogue page numbers. The wording and code are taken from the source PDFs. Price and applicability statements are only retained where explicitly printed.
- Colour/seat photographs have **not** been posted to GitHub. Source Library PDF bytes could not be materialized by the present tool, and public website redistribution permission was not verified.
- The remaining 39 brochure groups remain pending source text and image verification, including seven without a matched current PDF candidate: eqa, eqs-suv, amg-a-class, amg-s-class, amg-glb, amg-gls, amg-g-class. A 2025 AMG G-Class PDF exists but must **not** be used for the 27MY G 63.
- This text-only preview is still **not ready to merge**; photographs are required for the user's intended customer consultation workflow.

## Current blockers

- The catalogue PDFs exist in Library and are readable for selected text ranges, but the tooling denies raw-byte materialization of these Project files. This prevents reproducing individual original brochure images using the cropping script from the existing Library links.
- To finish the photo gallery, source PDF bytes and permission to republish its vehicle/seat images must be established; then extract only each image, not whole PDF pages.
- Some MY27 models have only older source brochures in the Library. Display exact source edition and avoid silently applying MY26 colours as MY27 guaranteed availability.
- Test all tabs, visual fidelity and mobile widths on the completed image data before any deployment.

All changes remain in Draft PR #4. Existing live `main` prices, promotions, GA4 and search engine setup must be left untouched until verification and explicit approval.
