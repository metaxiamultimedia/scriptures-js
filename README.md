# scriptures-js

**A batteries-included JavaScript library for working with biblical scriptures, morphology, and lexicons.**

This package provides a complete, ready-to-use solution for scripture analysis by bundling the core library with all official data sources.

## Included Packages

| Package | Description |
|---------|-------------|
| [`@metaxia/scriptures-core`](https://github.com/metaxiamultimedia/scriptures-js-core) | Core API, gematria, morphology parsing, registry |
| [`@metaxia/scriptures-source-openscriptures-ohb`](https://github.com/metaxiamultimedia/scriptures-js-source-openscriptures-ohb) | Hebrew Bible (Open Scriptures Project) |
| [`@metaxia/scriptures-source-crosswire-kjv`](https://github.com/metaxiamultimedia/scriptures-js-source-crosswire-kjv) | King James Version (CrossWire) |
| [`@metaxia/scriptures-source-byztxt-tr`](https://github.com/metaxiamultimedia/scriptures-js-source-byztxt-tr) | Greek New Testament (Byzantine Textus Receptus) |
| [`@metaxia/scriptures-source-huggingface-hmcgovern-original-language-bibles-greek-stepbible-tagnt-tr`](https://github.com/metaxiamultimedia/scriptures-js-source-huggingface-hmcgovern-original-language-bibles-greek-stepbible-tagnt-tr) | Greek New Testament (STEP Bible TAGNT Textus Receptus) |
| [`@metaxia/scriptures-source-stepbible-lexicon`](https://github.com/metaxiamultimedia/scriptures-js-source-stepbible-lexicon) | Hebrew & Greek lexicons (STEP Bible) |

## Installation

```bash
npm install @metaxia/scriptures
```

## Usage

```typescript
import { getVerse, gematria, lookupStrongs } from '@metaxia/scriptures';

// All sources are auto-registered and ready to use
const verse = await getVerse('Genesis', 1, 1, { edition: 'openscriptures-OHB' });
const value = gematria.compute(verse.text, { language: 'hebrew', method: 'standard' });
const definition = await lookupStrongs('H7225');
```

## Gematria

The gematria system supports Hebrew, Greek, and English calculations with multiple methods.

### Hebrew Gematria

| Method | Hebrew Name | Description |
|--------|-------------|-------------|
| Standard | Mispar Hechrachi | Traditional letter values (א=1, י=10, ק=100, etc.) |
| Ordinal | Mispar Siduri | Alphabetic position (1-22) |
| Reduced | Mispar Katan | Each letter reduced to single digit, then summed |

Example: **בראשית** (Bereshit) = **913** standard, **76** ordinal, **13** reduced

### Greek Isopsephy

| Method | Description |
|--------|-------------|
| Standard | Traditional Greek numeral values (α=1, ι=10, ρ=100, etc.) |
| Ordinal | Alphabetic position (1-24) |
| Reduced | Digital root of standard value (always 1-9) |

Example: **λογος** (logos) = **373** standard, **62** ordinal, **4** reduced

### English Gematria

| Method | Description |
|--------|-------------|
| Ordinal | A=1 through Z=26 |

## For Advanced Users

If you only need specific sources or want finer control over bundle size, install `@metaxia/scriptures-core` directly and add only the sources you need:

```bash
npm install @metaxia/scriptures-core @metaxia/scriptures-source-crosswire-kjv
```

```typescript
import '@metaxia/scriptures-source-crosswire-kjv';
import { getVerse } from '@metaxia/scriptures-core';

const verse = await getVerse('Genesis', 1, 1, { edition: 'crosswire-KJV' });
```

## License

MIT
