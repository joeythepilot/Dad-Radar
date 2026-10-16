"""Offline delivery encoding only; no application renderer or Pillow dependency.

Run with Pillow supporting exact lossless WebP. Approved originals are untouched.
Every output is decoded and compared byte-for-byte (including alpha/hidden RGB).
"""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / "assets/mobile-optimized"
SOURCES = [
    "hardware/HomingBeacon_Mobile_SplitFlap_Landscape_Native_v8.png",
    "hardware/HomingBeacon_Mobile_SplitFlap_Portrait_Native_v8.png",
    "hardware/HomingBeacon_Walnut_Overlay_Landscape_v2.png",
    "hardware/HomingBeacon_Walnut_Overlay_Portrait_v2.png",
    "hardware/HomingBeacon_Mobile_Clock_Source_v6.png",
    "hardware/HomingBeacon_Approved_Instrument_Plate_Transparent_v1.png",
    "hardware/clock-drum-mechanism.png",
    "hardware/weekly-overnight/weekly-overnight-module.png",
    "maps/aged-chart-paper.png",
    "ui/today-duty-card-weekly-paper.png",
]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    entries = {}
    for name in SOURCES:
        source = ROOT / "assets" / name
        original = source.read_bytes()
        source_hash = digest(original)
        target = OUTPUT / f"{source.stem}-{source_hash[:12]}.webp"
        with Image.open(source) as image:
            rgba = image.convert("RGBA")
            rgba.save(target, "WEBP", lossless=True, exact=True, method=6,
                      icc_profile=image.info.get("icc_profile", b""))
            with Image.open(target) as encoded:
                assert encoded.size == rgba.size
                assert encoded.convert("RGBA").tobytes() == rgba.tobytes(), name
            data = target.read_bytes()
            assert len(data) < len(original), f"No delivery saving: {name}"
            entries["/assets/" + name] = {
                "file": str(target.relative_to(ROOT)).replace("\\", "/"),
                "sourceSha256": source_hash, "sha256": digest(data),
                "rgbaSha256": digest(rgba.tobytes()),
                "width": rgba.width, "height": rgba.height,
                "sourceBytes": len(original), "bytes": len(data),
            }
            print(f"{name}: {len(original)} -> {len(data)} bytes; exact RGBA", flush=True)
    (OUTPUT / "manifest.json").write_text(json.dumps({"version": 1, "encoding": "lossless-webp-exact-rgba", "entries": entries}, indent=2) + "\n")

if __name__ == "__main__":
    main()
