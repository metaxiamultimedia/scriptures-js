import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { MARK_PROFILES, compareProfiles, getMarks, getMinchatShaiProfile } from '../dist/masoretic-marks.js';

const require = createRequire(import.meta.url);

const cons = (s) => [...s].filter((c) => c >= 'א' && c <= 'ת').join('');
const brief = (ms) => ms.map((m) => [m.wordIndex, m.letterIndex, m.type, m.dot ?? m.placement ?? null]);

test('minchat-shai rows cite him at a Sefaria address; disputes carry his words', () => {
  const p = getMinchatShaiProfile();
  assert.equal(p.profile, 'minchat-shai');
  assert.equal(new Set(p.marks.map((m) => m.id)).size, p.marks.length);
  for (const m of p.marks) {
    assert.equal(m.citation.text, 'Minchat Shai', m.id);
    assert.match(m.citation.section, /^Minchat_Shai_on_.+\.\d+\.\d+\.\d+$/, m.id);
    assert.equal(m.citation.url, `https://www.sefaria.org/${m.citation.section}`, m.id);
    assert.equal(typeof m.disputed, 'boolean', m.id);
    assert.equal(Boolean(m.dispute), m.disputed, m.id);
    if (m.disputed) assert.ok(m.dispute.quote && m.dispute.reasons.length, m.id);
    assert.ok(m.citation.translation.trim(), m.id);
    if (m.dispute) {
      assert.ok(m.dispute.translation.trim(), m.id);
    }
    if (m.type === 'extraordinary-points') {
      for (const d of m.dots) for (const l of d.letters ?? []) assert.equal(cons(d.wordText)[l.letterIndex], l.letter, m.id);
    } else if (m.type !== 'inverted-nun') {
      assert.equal(cons(m.wordText)[m.letterIndex], m.letter, m.id);
    }
  }
});

test('getMarks: minchat-shai is the default profile', () => {
  assert.deepEqual(brief(getMarks('Deut.6.4')), [[1, 2, 'large', null], [6, 2, 'large', null]]);
  assert.equal(getMarks('Deut.6.4')[0].citation.section, 'Minchat_Shai_on_Torah,_Deuteronomy.6.4.1');
  assert.deepEqual(brief(getMarks('Dan.6.20')).sort(), [[3, 2, 'small', null], [3, 4, 'large', null]]);
  const job = getMarks('Job.16.14')[0];
  assert.equal(job.disputed, true);
  assert.deepEqual(job.dispute.reasons, ['some-books']);
  assert.equal(job.citation.aboutVerse, 'Job.16.14');
  assert.equal(getMarks('Gen.23.2')[0].citation.translation, 'And to weep for her. The kaf is small.');
  assert.deepEqual(getMarks('Ps.107.21'), []);
});

test('getMarks: the wlc profile comes from the OHB package', () => {
  assert.deepEqual(brief(getMarks('Deut.6.4', { profile: 'wlc' })), [[1, 2, 'large', null], [6, 2, 'large', null]]);
  // the WLC does not mark the large bet of Gen 1:1
  assert.deepEqual(getMarks('Gen.1.1', { profile: 'wlc' }), []);
  // inverted nuns stand before the verse after the one the WLC writes them at
  assert.deepEqual(brief(getMarks('Ps.107.21', { profile: 'wlc' })), [[1, null, 'inverted-nun', 'before-verse']]);
  assert.deepEqual(brief(getMarks('Num.11.1', { profile: 'wlc' })), [[1, null, 'inverted-nun', 'before-verse']]);
  assert.deepEqual(getMarks('Ps.107.27', { profile: 'wlc' }), []);
  for (const m of getMarks('Gen.18.9', { profile: 'wlc' })) assert.equal(m.disputed, false);
});

test('compareProfiles lines the profiles up', () => {
  assert.deepEqual(MARK_PROFILES, ['minchat-shai', 'wlc']);
  const gen = compareProfiles('Gen.18.9');
  const lamed = gen.rows.find((r) => r.wordIndex === 2 && r.letterIndex === 1);
  assert.equal(lamed.profiles['minchat-shai'], null);
  assert.ok(lamed.profiles.wlc);
  const alef = gen.rows.find((r) => r.wordIndex === 2 && r.letterIndex === 0);
  assert.ok(alef.profiles['minchat-shai'] && alef.profiles.wlc);

  const ps = compareProfiles('Ps.107.27');
  assert.equal(ps.rows.length, 1);
  assert.ok(ps.rows[0].profiles['minchat-shai']);
  assert.equal(ps.rows[0].profiles.wlc, null);

  const deut = compareProfiles('Deut.6.4');
  assert.ok(deut.rows.every((r) => r.profiles['minchat-shai'] && r.profiles.wlc));
});

test('every KJV quotation in the English is verbatim in the bundled KJV', () => {
  const text = JSON.stringify(getMinchatShaiProfile());
  const quotes = [...text.matchAll(/KJV (\S+) (\d+):(\d+): \\"(.*?)\\"/g)];
  assert.ok(quotes.length > 0);
  for (const [, book, ch, v, q] of quotes) {
    const file = require.resolve(`@metaxia/scriptures-source-crosswire-kjv/data/crosswire-KJV/${book}/${ch}/${v}.json`);
    const verse = JSON.parse(readFileSync(file, 'utf-8')).text;
    assert.ok(verse.includes(q), `KJV ${book} ${ch}:${v}: "${q}" not in "${verse}"`);
  }
});

test('every marked letter has an English letterName', () => {
  for (const m of getMinchatShaiProfile().marks) {
    if (m.letter) assert.match(m.letterName, /^[a-z ]+$/, m.id);
    for (const d of m.dots ?? []) for (const l of d.letters ?? []) assert.match(l.letterName, /^[a-z ]+$/, m.id);
  }
  assert.equal(getMarks('Deut.6.4')[0].letterName, 'ayin');
  assert.equal(getMarks('Deut.6.4', { profile: 'wlc' })[0].letterName, 'ayin');
});
