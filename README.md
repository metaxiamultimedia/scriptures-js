# scriptures-js

**A batteries-included JavaScript library for working with biblical scriptures, morphology, and lexicons.**

This package provides a complete, ready-to-use solution for scripture analysis by bundling the core library with all official data sources.

## Included Packages

| Package | Description |
|---------|-------------|
| `@metaxia/scriptures-core` | Core API, gematria, morphology parsing, registry |
| `@metaxia/scriptures-source-openscriptures-ohb` | Hebrew Bible (Open Scriptures Project) |
| `@metaxia/scriptures-source-crosswire-kjv` | King James Version (CrossWire) |
| `@metaxia/scriptures-source-byztxt-tr` | Greek New Testament (Byzantine Textus Receptus) |
| `@metaxia/scriptures-source-stepbible-lexicon` | Hebrew & Greek lexicons (STEP Bible) |

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
