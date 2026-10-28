import { describe, it, expect } from 'vitest';
import { computeGreek } from '@metaxia/scriptures-core';
import { headwordsForSStrong, eStrongOfTag, eStrongOfGreekWord, sStrongOf } from '../src/index.js';
import { lexiconRows } from '../src/data.js';

const nfc = (s: string) => s.normalize('NFC');

describe('headwordsForSStrong: Greek headwords from TBESG', () => {
  it('sStrongOf keeps the language; no prefix is Hebrew', () => {
    expect(sStrongOf('G02424')).toBe('G2424');
    expect(sStrongOf('G2424G')).toBe('G2424');
    expect(sStrongOf('G21477')).toBe('G21477');
    expect(sStrongOf('1004')).toBe('H1004');
  });

  it('G2424: Ἰησοῦς Iēsous = 888, the lemma, not the first occurrence (Ἰησοῦ = 688)', () => {
    const hw = headwordsForSStrong('G02424');
    expect(hw.map((h) => h.eStrong)).toEqual(['G2424']);
    expect(hw[0].forms.map((f) => [nfc(f.lemma), f.transliteration])).toEqual([[nfc('Ἰησοῦς'), 'Iēsous']]);
    expect(hw[0].forms[0].variants[0].gematria.standard).toBe(888);
    expect(computeGreek('Ἰησοῦ').standard).toBe(688);
    expect(hw[0].dStrongs).toEqual(['G2424G', 'G2424H', 'G2424I', 'G2424J', 'G2424K']);
    expect(headwordsForSStrong('G2424')).toEqual(hw);
  });

  it('G5547 Χριστός = 1480; G3004 λέγω = 838', () => {
    expect(headwordsForSStrong('G5547')[0].forms[0].variants[0].gematria.standard).toBe(1480);
    expect(nfc(headwordsForSStrong('G3004')[0].forms[0].lemma)).toBe(nfc('λέγω'));
    expect(headwordsForSStrong('G3004')[0].forms[0].variants[0].gematria.standard).toBe(838);
  });

  it('gematria is computeGreek of the lemma (the same function as word gematria)', () => {
    const [h] = headwordsForSStrong('G2316');
    expect(nfc(h.forms[0].lemma)).toBe(nfc('θεός'));
    expect(h.forms[0].variants[0].gematria).toEqual(computeGreek(h.forms[0].lemma));
  });

  it('a comma-list lemma lists each variant with its own gematria, never a sum (G4672)', () => {
    const [h] = headwordsForSStrong('G4672');
    expect(h.forms.map((f) => [nfc(f.lemma), f.transliteration, f.dStrongs])).toEqual([
      [nfc('Σολομών, Σαλωμών'), 'Solomōn, Salōmōn', ['G4672G']],
      [nfc('Σολομών'), 'Solomōn, Salōmōn', ['G4672H']],
    ]);
    expect(h.forms[0].variants.map((v) => [nfc(v.text), v.gematria.standard])).toEqual([
      [nfc('Σολομών'), computeGreek('Σολομών').standard],
      [nfc('Σαλωμών'), computeGreek('Σαλωμών').standard],
    ]);
  });

  it('rows TBESG gives as "[unnamed]" (a relative of the named person) are listed as sourced (G4074)', () => {
    const [h] = headwordsForSStrong('G4074');
    expect(h.forms.map((f) => [nfc(f.lemma), f.dStrongs])).toEqual([[nfc('Πέτρος'), ['G4074G']], ['[unnamed]', ['G4074H', 'G4074I']]]);
  });

  it('two lemmas on one eStrong are both listed (G1086 Γερασηνός, Γεργεσηνός)', () => {
    const [h] = headwordsForSStrong('G1086');
    expect(h.forms.map((f) => nfc(f.lemma))).toEqual([nfc('Γερασηνός'), nfc('Γεργεσηνός')]);
  });

  it('TBESG (lexicon 2.2.0) has one eStrong per G number; 10 eStrongs give more than one lemma', () => {
    const nums = new Set<string>();
    for (const row of Object.values(lexiconRows('stepbible-tbesg'))) nums.add(sStrongOf(row.strongsExtended)!);
    let multiForm = 0;
    for (const n of nums) {
      const hw = headwordsForSStrong(n);
      expect(hw).toHaveLength(1);
      if (hw[0].forms.length > 1) multiForm++;
    }
    expect(nums.size).toBe(10847);
    expect(multiForm).toBe(10);
  });

  it('eStrongOfTag / eStrongOfGreekWord: TAGNT\'s dStrong through TBESG, else TAGNT\'s eStrong', () => {
    expect(eStrongOfTag('G2424G')).toBe('G2424');
    // TBESG files G2491K (Jonah, father of Simon Peter) under eStrong G2495.
    expect(eStrongOfTag('G2491K')).toBe('G2495');
    expect(eStrongOfGreekWord({ strongs: ['G2424G'], metadata: { extendedStrongs: 'G2424' } })).toBe('G2424');
    // TBESG has G2453G/H but no bare G2453 row: falls back to the extended number.
    expect(eStrongOfGreekWord({ strongs: ['G2453'], metadata: { extendedStrongs: 'G2453' } })).toBe('G2453');
    expect(eStrongOfGreekWord({ strongs: ['G9999999'], metadata: { extendedStrongs: 'G1161_A' } })).toBeUndefined();
    // Hebrew unchanged.
    expect(eStrongOfTag('H1004A')).toBe('H1004a');
  });
});

describe('a lemma scriptures-core cannot compute', () => {
  it('G5516 χξϛ ("666") is listed without gematria (the stigma has no ordinal)', () => {
    const [h] = headwordsForSStrong('G5516');
    expect(h.forms[0].variants).toEqual([{ text: 'χξϛ' }]);
  });
});
