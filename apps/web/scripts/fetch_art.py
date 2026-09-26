"""Download and convert the site's official character/Titan renders and volume covers (decision 0010).

Sources (approved by the project owner, 2026-09-25):
- Anime character renders (Wit Studio / MAPPA), as hosted on attackontitan.fandom.com
- Japanese volume covers by Hajime Isayama (Kodansha), as hosted on volumecovers.fandom.com

Only chapter-50-era ("850") renders are used, so no later looks or backstory leak. Credits and
spoiler gating live in src/art/manifest.ts; this script only reproduces the files.

    python apps/web/scripts/fetch_art.py [cache dir]

Needs Pillow. Writes WebP files to apps/web/public/art/{characters,covers}/.
"""

import io
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "art"
AGENT = {"User-Agent": "Mozilla/5.0 (PATHS non-commercial fan project)"}

# entity id -> wiki file title
RENDERS = {
    "character_annie_leonhart": "Annie Leonhart character image (850).png",
    "character_armin_arlert": "Armin Arlert character image (850).png",
    "character_bertholdt_hoover": "Bertholdt Hoover (Anime) character image.png",
    "character_carla_yeager": "Carla Jaeger (Anime) character image.png",
    "character_connie_springer": "Connie Springer character image (850).png",
    "character_darius_zackly": "Dhalis Zachary (Anime) character image.png",
    "character_dot_pixis": "Dot Pixis character image.png",
    "character_dr_yeager": "Grisha Jaeger (Anime) character image.png",
    "character_eren_yeager": "Eren Jaeger (Anime) character image (850).png",
    "eren-titan": "Attack Titan (Anime) character image (Eren Jaeger).png",
    "character_erwin_smith": "Erwin Smith character image.png",
    "character_hange_zoe": "Hange Zoë character image (850).png",
    "character_hannes": "Hannes character image.png",
    "character_jean_kirstein": "Jean Kirstein character image (850).png",
    # Krista has no safe render: the "850" image shows a crown from a much later arc.
    "character_levi": "Levi Ackermann (Anime) character image (850).png",
    "character_marco_bott": "Marco Bott character image.png",
    "character_mikasa_ackerman": "Mikasa Ackerman character image (850).png",
    "character_mike_zacharias": "Mike Zacharias character image.png",
    "character_reiner_braun": "Reiner Braun character image (850).png",
    "character_sasha_blouse": "Sasha Braus (Anime) character image (850).png",
    "character_smiling_titan": "Dina Fritz character image (Titan).png",
    "character_thomas_wagner": "Thomas Wagner character image.png",
    "character_ymir_104th": "Ymir character image.png",
    "titan_armored": "Armored Titan character image (Reiner Braun).png",
    "titan_colossal": "Colossal Titan (Anime) character image (Bertholdt Hoover).png",
    "titan_female": "Female Titan character image (Annie Leonhart).png",
}
COVERS = {f"volume-{n:02d}": f"AoTVol{n:02d}.png" for n in range(1, 14)}

WIKIS = {
    "characters": ("https://attackontitan.fandom.com/api.php", RENDERS, 1080),
    "covers": ("https://volumecovers.fandom.com/api.php", COVERS, 1000),
}


def url_of(api: str, title: str) -> str:
    query = urllib.parse.urlencode(
        {"action": "query", "titles": f"File:{title}", "prop": "imageinfo", "iiprop": "url", "format": "json"}
    )
    with urllib.request.urlopen(urllib.request.Request(f"{api}?{query}", headers=AGENT), timeout=30) as r:
        page = next(iter(json.load(r)["query"]["pages"].values()))
    return page["imageinfo"][0]["url"]


def fetch(url: str, cache: Path) -> bytes:
    path = cache / urllib.parse.quote(url.split("/revision")[0].rsplit("/", 1)[-1], safe="")
    if not path.exists():
        with urllib.request.urlopen(urllib.request.Request(url, headers=AGENT), timeout=60) as r:
            path.write_bytes(r.read())
    return path.read_bytes()


def main() -> None:
    cache = Path(sys.argv[1] if len(sys.argv) > 1 else ".art-cache")
    cache.mkdir(parents=True, exist_ok=True)
    for folder, (api, files, max_side) in WIKIS.items():
        (OUT / folder).mkdir(parents=True, exist_ok=True)
        for art_id, title in files.items():
            image = Image.open(io.BytesIO(fetch(url_of(api, title), cache)))
            image = image.convert("RGBA" if image.mode in ("RGBA", "LA", "P") else "RGB")
            image.thumbnail((max_side, max_side * 2) if folder == "covers" else (max_side, max_side))
            # Trim fully transparent margins so renders sit tight in their frames.
            if image.mode == "RGBA" and (box := image.getchannel("A").getbbox()):
                image = image.crop(box)
            target = OUT / folder / f"{art_id}.webp"
            image.save(target, quality=82, method=6)
            print(f"{folder}/{art_id}.webp  {image.width}x{image.height}  {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
