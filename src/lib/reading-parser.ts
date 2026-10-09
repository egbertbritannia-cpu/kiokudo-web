/**
 * reading-parser.ts — Trình phân tích cú pháp cách đọc (Kun/On) và ngữ nghĩa thẻ học Nhật Bản
 *
 * Chuyển đổi các định dạng chuỗi thô (như "うち, いえ (On: カ, ケ)") thành cấu trúc dữ liệu rõ ràng,
 * tách biệt Kun-yomi, On-yomi, Âm Hán Việt và nghĩa tiếng Việt thuần khiết.
 */

export interface ParsedCardDetails {
  isKanji: boolean;
  kunYomi: string[];
  onYomi: string[];
  pureReading: string;
  hanViet: string;
  cleanMeaning: string;
  hasDetailedReadings: boolean;
  hasRealSentence: boolean;
  cleanSentence: string;
}

/**
 * Phân tích chi tiết thẻ học để phục vụ giao diện mặt sau Karuta
 */
export function parseCardDetails(params: {
  type?: string;
  reading?: string;
  meaning?: string;
  kanji?: string;
  deckName?: string;
  sentence?: string;
}): ParsedCardDetails {
  const {
    type = '',
    reading = '',
    meaning = '',
    kanji = '',
    deckName = '',
    sentence = '',
  } = params;

  const isExplicitKanji =
    type === 'Kanji' || (deckName && (deckName.includes('Hán Tự') || deckName.includes('Kanji')));

  // 1. Trích xuất Âm Hán Việt
  let hanViet = '';
  const hvMatch =
    meaning.match(/Âm Hán:\s*([^\-)]+)/i) ||
    meaning.match(/Hán Việt:\s*([^\-)]+)/i);
  if (hvMatch) {
    hanViet = hvMatch[1].trim();
  }

  // 2. Làm sạch nghĩa tiếng Việt (loại bỏ các cụm ngoặc Âm Hán / Chữ Hán)
  let cleanMeaning = meaning
    .replace(/\s*\([^)]*Âm Hán:[^)]*\)/gi, '')
    .replace(/\s*\([^)]*Chữ Hán:[^)]*\)/gi, '')
    .replace(/\s*\(Chữ Hán:[^)]*\)/gi, '')
    .trim();

  // 3. Phân tách âm Kun và âm On
  const hasOn = /On:/i.test(reading);
  const hasKun = /Kun:/i.test(reading);
  const hasKanjiReadingPattern =
    hasOn || hasKun || (isExplicitKanji && reading.includes('('));

  let kunYomi: string[] = [];
  let onYomi: string[] = [];

  if (hasKanjiReadingPattern) {
    // Trích xuất On-yomi
    const onMatch = reading.match(/On:\s*([^)/]+)/i);
    if (onMatch) {
      onYomi = onMatch[1]
        .split(/[,、/]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    // Trích xuất Kun-yomi
    const kunMatch = reading.match(/Kun:\s*([^)/]+)/i);
    if (kunMatch) {
      kunYomi = kunMatch[1]
        .split(/[,、/]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      // Phần nằm trước dấu ngoặc '(' là Kun-yomi
      const beforeParen = reading.split('(')[0].trim();
      if (beforeParen) {
        kunYomi = beforeParen
          .split(/[,、/]/)
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
  } else if (isExplicitKanji && (reading.includes(',') || reading.includes('、'))) {
    // Nếu là Kanji card nhưng chỉ liệt kê phẩy mà không ghi On/Kun
    kunYomi = reading
      .split(/[,、]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const hasDetailedReadings = kunYomi.length > 0 || onYomi.length > 0;
  const pureReading = reading.replace(/\s*\(.*?\)/g, '').trim();

  // 4. Kiểm tra câu ví dụ có thật sự là một câu ngữ cảnh hay chỉ là từ đơn độc
  const strippedSentence = sentence.replace(/\{\{c\d+::([^:}]+)(?:::[^}]*)?\}\}/g, '$1').trim();
  const hasRealSentence = Boolean(
    sentence &&
      strippedSentence.length > kanji.length + 1 &&
      strippedSentence !== kanji
  );

  return {
    isKanji: Boolean(isExplicitKanji || hasKanjiReadingPattern),
    kunYomi,
    onYomi,
    pureReading,
    hanViet,
    cleanMeaning: cleanMeaning || meaning,
    hasDetailedReadings,
    hasRealSentence,
    cleanSentence: sentence,
  };
}
