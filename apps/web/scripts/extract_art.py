"""Extract the site's official artwork from a local copy of the manga (docs/decisions/0010-design.md).

Every image is Hajime Isayama's own colour art (chapter colour pages and volume covers), cropped
clear of lettering and scan watermarks. Credits and spoiler gating live in src/art/manifest.ts;
this script only reproduces the files.

    python apps/web/scripts/extract_art.py "<path to the manga archive>.zip"

Needs Pillow. Writes WebP files to apps/web/public/art/.
"""

import io
import random
import sys
import zipfile
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat

OUT = Path(__file__).resolve().parent.parent / "public" / "art"

# id: (chapter folder prefix, page, crop box (left, top, right, bottom), patches)
# A patch paints out lettering that sits on flat background: (box, sample box).
ART = {
    "mikasa-rooftops": ("0016", "001.jpg", (22, 78, 765, 740), []),
    "colossal-arm": ("0005", "003.jpg", (410, 0, 1200, 330), []),
    "volume-3": (
        "0011",
        "001.jpg",
        (392, 250, 1040, 1015),
        [((418, 250, 528, 402), (532, 262, 566, 380))],
    ),
    "titan-horde": ("0013", "003.jpg", (0, 0, 814, 360), []),
    "walls-map": ("0006", "003.jpg", (640, 0, 1200, 815), []),
}


def find(archive: zipfile.ZipFile, folder: str, page: str) -> str:
    for name in archive.namelist():
        parts = name.split("/")
        if len(parts) == 3 and parts[1].startswith(folder) and parts[2] == page:
            return name
    raise SystemExit(f"{folder}/{page} not found in the archive")


def patch(image: Image.Image, box: tuple, sample: tuple) -> None:
    """Fill `box` with the median colour of `sample`, plus grain so it matches the print."""
    colour = tuple(int(c) for c in ImageStat.Stat(image.crop(sample)).median)
    rng = random.Random(0)
    fill = Image.new("RGB", (box[2] - box[0], box[3] - box[1]))
    fill.putdata(
        [
            tuple(max(0, min(255, c + rng.randint(-6, 6))) for c in colour)
            for _ in range(fill.width * fill.height)
        ]
    )
    image.paste(fill.filter(ImageFilter.GaussianBlur(0.6)), box[:2])


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    OUT.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(sys.argv[1]) as archive:
        for art_id, (folder, page, crop, patches) in ART.items():
            image = Image.open(io.BytesIO(archive.read(find(archive, folder, page)))).convert("RGB")
            for box, sample in patches:
                patch(image, box, sample)
            result = image.crop(crop)
            result.save(OUT / f"{art_id}.webp", quality=84, method=6)
            print(f"{art_id}.webp  {result.width}×{result.height}")


if __name__ == "__main__":
    main()
