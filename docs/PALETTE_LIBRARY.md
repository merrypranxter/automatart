# Astral Trash Palette Library — portable v1

The file [`src/palettes/astral-trash-palettes.json`](../src/palettes/astral-trash-palettes.json) is a standalone, framework-independent data asset for reuse in future art apps.

## The source of truth (initial import)
- **26 authentic It's a Moiré palettes** imported intact and in their original order from [`merrypranxter/itsamoire/engine.js`](https://github.com/merrypranxter/itsamoire/blob/main/engine.js). Each has the original name, key and all **12** hex stops; none have been reduced to 6.
- **5 existing Automatart palettes** kept with their 6 hex stops.
- **31 total presets**, uniquely identified by stable namespaced IDs such as `itsamoire/opal`, `automatart/astral-jewelry`.

## Schema
```json
{
  "schema": "astral-trash/palette-library/v1",
  "version": "1.0.0",
  "palettes": [
    {
      "id": "itsamoire/opal",
      "name": "Opal prism",
      "source": "itsamoire",
      "colors": ["#ffffff", "#e8f6ff"]
    }
  ]
}
```

Each palette contains 2–32 hex colors (`#rrggbb`). The example above truncates the 12-stop palette for brevity; **the actual asset contains all twelve**.

## How to reuse in another application
Copy the JSON file to the target app and import it, or use it as a versioned package in a later phase. For JavaScript:
```js
import library from './astral-trash-palettes.json';
const entries = library.palettes; // [{id,name,source,colors}, ...]
```

Importing color data across programs should not require a backend or paid API. Apps can decide how to interpolate, animate, or quantize these color stops without modifying the shared palette definitions.

## Automatart Phase 2A — shipped controls
- Cyclic or continuous palette rotation by generation, palette reverse and offset.
- Full 12-color editable swatches for Moiré palettes, rather than reducing or approximating them.
- Saturation, contrast, brightness and fluorescent bloom.
- New signal-to-color routing: radial distance, horizontal position, mixed activity.
- User-editable Life-like birth/survival counts from 0–8.
- Moore eight-neighbor and Von Neumann four-neighbor options.
- Checkerboard spores, spiral arms and lattice web starting patterns.
- Trail persistence control for non-cyclic simulation families.
- Rule and appearance updates do not restart the current universe unless world geometry or initial seed changes.

## Future shared package
This JSON is a **portable source asset** in Automatart today, not a published npm package yet. Eventually it can become an independent, versioned module shared with It's a Moiré, Ding Wings, Sparkle Bae, and other art apps; synchronized palette updates can be addressed once that workflow is approved.
