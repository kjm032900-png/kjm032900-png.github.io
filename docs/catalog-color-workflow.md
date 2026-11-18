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

## Current blockers
The official index's dynamic download buttons have been identified, but the exact original PDF download URLs and document editions still need direct verification. Thus **all 41 catalogue group entries currently remain pending** and are deliberately invisible as options in the public UI. This is a safeguard, not a completed colour library.

All changes remain in Draft PR #4. Existing live `main` prices, promotions, GA4 and search engine setup must be left untouched until verification and explicit approval.
