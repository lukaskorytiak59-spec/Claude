# AI Virtuálna Influencerka — starter kit

Základná kostra na vytvorenie AI-generovanej virtuálnej postavy (persona + konzistentné obrázky).

## Obsah

- `persona.md` — persona a obsahová stratégia (meno, štýl, cieľová skupina, publikačný plán, etické poznámky)
- `config/persona.yaml` — technická konfigurácia postavy (vizuálny fingerprint pre prompty)
- `scripts/generate_images.py` — CLI skript na generovanie obrázkov cez OpenAI, Stability AI alebo Leonardo.ai

## Nastavenie

```bash
pip install -r requirements.txt
cp .env.example .env
# doplň OPENAI_API_KEY, STABILITY_API_KEY alebo LEONARDO_API_KEY do .env
```

## Použitie

1. Uprav `persona.md` a `config/persona.yaml` podľa vlastnej vízie postavy.
2. Generuj obrázky:

```bash
python scripts/generate_images.py --scene "sitting in a cafe, holding a coffee cup" --count 2
python scripts/generate_images.py --scene "beach at sunset, casual summer dress" --provider stability
python scripts/generate_images.py --provider leonardo --count 3
```

Obrázky sa uložia do `output/`.

## Dôležité

Prečítaj si sekciu **"Dôležité — transparentnosť a etika"** v `persona.md` pred publikovaním obsahu —
väčšina platforiem (Meta, TikTok, YouTube) a EÚ AI Act vyžadujú označovanie AI-generovaného obsahu.
