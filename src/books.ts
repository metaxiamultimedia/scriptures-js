/**
 * Book table: OSIS code (the directory name used by the @metaxia/scriptures-source
 * data packages) and the English book name used by mapVerse().
 */
export interface BookInfo {
  osis: string;
  name: string;
  testament: 'OT' | 'NT';
}

const OT: Array<[string, string]> = [
  ['Gen', 'Genesis'], ['Exod', 'Exodus'], ['Lev', 'Leviticus'], ['Num', 'Numbers'], ['Deut', 'Deuteronomy'],
  ['Josh', 'Joshua'], ['Judg', 'Judges'], ['Ruth', 'Ruth'], ['1Sam', '1 Samuel'], ['2Sam', '2 Samuel'],
  ['1Kgs', '1 Kings'], ['2Kgs', '2 Kings'], ['1Chr', '1 Chronicles'], ['2Chr', '2 Chronicles'],
  ['Ezra', 'Ezra'], ['Neh', 'Nehemiah'], ['Esth', 'Esther'], ['Job', 'Job'], ['Ps', 'Psalms'],
  ['Prov', 'Proverbs'], ['Eccl', 'Ecclesiastes'], ['Song', 'Song of Solomon'], ['Isa', 'Isaiah'],
  ['Jer', 'Jeremiah'], ['Lam', 'Lamentations'], ['Ezek', 'Ezekiel'], ['Dan', 'Daniel'], ['Hos', 'Hosea'],
  ['Joel', 'Joel'], ['Amos', 'Amos'], ['Obad', 'Obadiah'], ['Jonah', 'Jonah'], ['Mic', 'Micah'],
  ['Nah', 'Nahum'], ['Hab', 'Habakkuk'], ['Zeph', 'Zephaniah'], ['Hag', 'Haggai'], ['Zech', 'Zechariah'],
  ['Mal', 'Malachi'],
];

const NT: Array<[string, string]> = [
  ['Matt', 'Matthew'], ['Mark', 'Mark'], ['Luke', 'Luke'], ['John', 'John'], ['Acts', 'Acts'],
  ['Rom', 'Romans'], ['1Cor', '1 Corinthians'], ['2Cor', '2 Corinthians'], ['Gal', 'Galatians'],
  ['Eph', 'Ephesians'], ['Phil', 'Philippians'], ['Col', 'Colossians'], ['1Thess', '1 Thessalonians'],
  ['2Thess', '2 Thessalonians'], ['1Tim', '1 Timothy'], ['2Tim', '2 Timothy'], ['Titus', 'Titus'],
  ['Phlm', 'Philemon'], ['Heb', 'Hebrews'], ['Jas', 'James'], ['1Pet', '1 Peter'], ['2Pet', '2 Peter'],
  ['1John', '1 John'], ['2John', '2 John'], ['3John', '3 John'], ['Jude', 'Jude'], ['Rev', 'Revelation'],
];

export const BOOKS: BookInfo[] = [
  ...OT.map(([osis, name]) => ({ osis, name, testament: 'OT' as const })),
  ...NT.map(([osis, name]) => ({ osis, name, testament: 'NT' as const })),
];

/** Look a book up by OSIS code ("Deut") or English name ("Deuteronomy"). */
export function bookInfo(book: string): BookInfo {
  const found = BOOKS.find((b) => b.osis === book || b.name === book);
  if (!found) throw new Error(`Unknown book: ${book}`);
  return found;
}
