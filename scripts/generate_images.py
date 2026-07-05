#!/usr/bin/env python3
"""Generate consistent character images for the virtual influencer persona.

Usage:
    python scripts/generate_images.py --scene "sitting in a cafe, holding a coffee cup" --count 2
    python scripts/generate_images.py --scene "beach at sunset, casual summer dress" --provider stability
"""
import argparse
import base64
import os
import sys
from datetime import datetime
from pathlib import Path

import requests
import yaml
from dotenv import load_dotenv

load_dotenv()

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "persona.yaml"
OUTPUT_DIR = ROOT / "output"


def load_persona():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def build_prompt(persona, scene):
    return (
        f"{persona['visual_signature'].strip()}, {scene.strip()}, "
        f"{persona['style_keywords'].strip()}"
    )


def generate_openai(prompt, negative_prompt, count, seed):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        sys.exit("Chyba OPENAI_API_KEY v prostredi (.env).")

    resp = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "gpt-image-1",
            "prompt": prompt,
            "n": count,
            "size": "1024x1024",
        },
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()["data"]
    return [base64.b64decode(item["b64_json"]) for item in data]


def generate_stability(prompt, negative_prompt, count, seed):
    api_key = os.environ.get("STABILITY_API_KEY")
    if not api_key:
        sys.exit("Chyba STABILITY_API_KEY v prostredi (.env).")

    images = []
    for i in range(count):
        resp = requests.post(
            "https://api.stability.ai/v2beta/stable-image/generate/core",
            headers={"Authorization": f"Bearer {api_key}", "Accept": "image/*"},
            files={"none": (None, "")},
            data={
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "seed": seed + i,
                "output_format": "png",
            },
            timeout=120,
        )
        resp.raise_for_status()
        images.append(resp.content)
    return images


PROVIDERS = {
    "openai": generate_openai,
    "stability": generate_stability,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--scene",
        default=None,
        help="Popis scény/pózy/outfitu (default: config/persona.yaml -> default_scene)",
    )
    parser.add_argument("--count", type=int, default=1, help="Počet obrázkov")
    parser.add_argument(
        "--provider", choices=PROVIDERS.keys(), default="openai", help="API provider"
    )
    parser.add_argument("--seed", type=int, default=None, help="Override seed z persony")
    args = parser.parse_args()

    persona = load_persona()
    scene = args.scene or persona.get("default_scene")
    if not scene:
        sys.exit("Zadaj --scene alebo nastav default_scene v config/persona.yaml")
    prompt = build_prompt(persona, scene)
    seed = args.seed if args.seed is not None else persona.get("default_seed", 0)

    print(f"Prompt: {prompt}\n")

    images = PROVIDERS[args.provider](
        prompt, persona.get("negative_prompt", ""), args.count, seed
    )

    OUTPUT_DIR.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for idx, img_bytes in enumerate(images):
        out_path = OUTPUT_DIR / f"{timestamp}_{idx}.png"
        out_path.write_bytes(img_bytes)
        print(f"Uložené: {out_path}")


if __name__ == "__main__":
    main()
