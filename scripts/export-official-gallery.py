"""Extract four car photographs from Mercedes-Benz Korea official brochures.

Requires the rights to republish the supplied official catalogue assets.
"""
from __future__ import annotations

import io
import json
import pathlib
import time
import urllib.request

import fitz
from PIL import Image

BASE = pathlib.Path(__file__).resolve().parents[1]
CATALOGS = json.loads((BASE / 'catalog-links.json').read_text('utf-8'))['catalogs']
PHOTOS = {
    'gle': ('gle', 1, (1920, 1080)),
    'gle-coupe': ('gle', 43, (1807, 1016)),
    'gls': ('gls', 1, (1920, 1080)),
    'amg-cle': ('amg-cle-coupe', 1, (1536, 745)),
}


def get_pdf(key: str) -> fitz.Document:
    url = CATALOGS[key]['url']
    if not url.startswith('https://www.mercedes-benz.co.kr/') or not url.endswith('.pdf'):
        raise ValueError('Untrusted source URL: ' + url)
    last_error = None
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/pdf,*/*',
            })
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = response.read(95_000_000)
            if not payload.startswith(b'%PDF') or len(payload) < 2_000_000:
                raise ValueError('Source is not a valid official brochure PDF')
            return fitz.open(stream=payload, filetype='pdf')
        except Exception as error:
            last_error = error
            if attempt < 2:
                time.sleep(3 * (attempt + 1))
    raise RuntimeError('Official brochure not accessible: ' + key + ' ' + str(last_error))


def main():
    documents = {key: get_pdf(key) for key in {'gle', 'gls', 'amg-cle-coupe'}}
    output_dir = BASE / 'images' / 'official-gallery'
    output_dir.mkdir(parents=True, exist_ok=True)
    for name, (key, index, size) in PHOTOS.items():
        matches = [item for item in documents[key][index].get_images(full=True)
                   if (item[2], item[3]) == size and item[1] > 0]
        if not matches:
            raise RuntimeError('Missing expected photo for: ' + name)
        image_xref, mask_xref = matches[0][:2]
        image = fitz.Pixmap(fitz.Pixmap(documents[key], image_xref),
                            fitz.Pixmap(documents[key], mask_xref))
        if image.n != 4:
            raise RuntimeError('Missing image alpha channel for ' + name)
        photo = Image.frombytes('RGBA', (image.width, image.height), image.samples)
        photo.thumbnail((1040, 590), Image.Resampling.LANCZOS)
        if photo.width < 900 or photo.height < 450:
            raise RuntimeError('Insufficient image resolution for ' + name)
        dest = output_dir / (name + '-27my.webp')
        photo.save(dest, 'WEBP', quality=74, method=6)
        if not 15000 < dest.stat().st_size < 250000:
            raise RuntimeError('Unexpected image size: ' + name)
        print('WROTE', dest, photo.size, dest.stat().st_size)


if __name__ == '__main__':
    main()
