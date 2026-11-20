"""Build four approved model-specific gallery assets from linked official brochures.
Only use when redistribution permission for brochure-derived artwork is in place.
The images are vehicle cutouts, not copied website screenshots.
"""
from __future__ import annotations
import json, pathlib, time, urllib.request
import fitz
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOGS = json.loads((ROOT / "catalog-links.json").read_text("utf-8"))["catalogs"]
FILES = {
 "gle": ("gle", 1, (1920, 1080)),
 "gle-coupe": ("gle", 43, (1807, 1016)),
 "gls": ("gls", 1, (1920, 1080)),
 "amg-cle": ("amg-cle-coupe", 1, (1536, 745)),
}
def get_pdf(key):
 url = CATALOGS[key]["url"]
 if not url.startswith("https://www.mercedes-benz.co.kr/") or not url.endswith(".pdf"):
  raise ValueError("Not an approved official catalogue URL")
 for attempt in range(3):
  try:
   req = urllib.request.Request(url, headers={
    "User-Agent":"Mozilla/5.0 (compatible; Mercedes-Benz-Model-Gallery/1.0)",
    "Accept":"application/pdf,*/*"
   })
   with urllib.request.urlopen(req, timeout=100) as response:
    data = response.read(95_000_000)
   if not data.startswith(b"%PDF") or len(data)<2_000_000:
    raise ValueError("Invalid PDF from official catalogue")
   return fitz.open(stream=data, filetype="pdf")
  except Exception:
   if attempt==2: raise
   time.sleep(4*(attempt+1))
def main():
 documents={key:get_pdf(key) for key in {v[0] for v in FILES.values()}}
 folder=ROOT/"images"/"official-gallery"
 folder.mkdir(parents=True,exist_ok=True)
 for name,(key,page_no,dimensions) in FILES.items():
  doc=documents[key]
  if page_no>=len(doc): raise ValueError("Missing page for "+name)
  images=[im for im in doc[page_no].get_images(full=True) if (im[2],im[3])==dimensions and im[1]>0]
  if len(images)!=1: raise ValueError(f"Could not uniquely identify {name} photo: {len(images)}")
  xref,mask=images[0][:2]
  rgba=fitz.Pixmap(fitz.Pixmap(doc,xref),fitz.Pixmap(doc,mask))
  if rgba.n!=4:raise ValueError("Expected alpha-masked vehicle")
  image=Image.frombytes("RGBA",(rgba.width,rgba.height),rgba.samples)
  image.thumbnail((1040,590),Image.Resampling.LANCZOS)
  if image.width<900 or image.height<450:raise ValueError("Vehicle image too small: "+name)
  result=folder/(name+"-27my.webp")
  image.save(result,"WEBP",quality=78,method=6)
  if not 15000<=result.stat().st_size<=250000:raise ValueError("Unexpected bytes in "+name)
  print("CREATED",result,image.size,result.stat().st_size)
if __name__=="__main__":main()
