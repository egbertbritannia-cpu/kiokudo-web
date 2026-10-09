import rawVerbsData from '@/data/japanese-verbs.json';

export interface VerbFormDetail {
  kanji: string;
  hiragana: string;
  romaji: string;
}

export interface VerbItem {
  id: string;
  kanji: string;
  hiragana: string;
  romaji: string;
  meaning_vi: string;
  group: 1 | 2 | 3;
  isException?: boolean;
  masu_form: VerbFormDetail;
  te_form: VerbFormDetail;
  ru_form: VerbFormDetail;
  nai_form?: VerbFormDetail;
  example: {
    sentence: string;
    meaning: string;
  };
}

export interface EvaluationResult {
  isCorrect: boolean;
  matchType: 'kanji' | 'hiragana' | 'romaji' | 'none';
  userHiragana: string;
  expectedKanji: string;
  expectedHiragana: string;
  expectedRomaji: string;
  ruleExplanation?: string;
}

// Bảng ánh xạ Romaji sang Hiragana toàn diện (Hepburn & Nihon-shiki)
const ROMAJI_TO_HIRAGANA_MAP: Record<string, string> = {
  // Nguyên âm
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  // Hàng K
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ',
  kya: 'きゃ', kyu: 'きゅ', kyo: 'きょ',
  // Hàng G (Đục)
  ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  gya: 'ぎゃ', gyu: 'ぎゅ', gyo: 'ぎょ',
  // Hàng S
  sa: 'さ', shi: 'し', si: 'し', su: 'す', se: 'せ', so: 'そ',
  sha: 'しゃ', shu: 'しゅ', sho: 'しょ',
  // Hàng Z/J (Đục)
  za: 'ざ', ji: 'じ', zi: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ja: 'じゃ', ju: 'じゅ', jo: 'じょ',
  // Hàng T
  ta: 'た', chi: 'ち', ti: 'ち', tsu: 'つ', tu: 'つ', te: 'て', to: 'と',
  cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ',
  // Hàng D (Đục)
  da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  // Hàng N
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  nya: 'にゃ', nyu: 'にゅ', nyo: 'にょ',
  // Hàng H
  ha: 'は', hi: 'ひ', fu: 'ふ', hu: 'ふ', he: 'へ', ho: 'ほ',
  hya: 'ひゃ', hyu: 'ひゅ', hyo: 'ひょ',
  // Hàng B (Đục)
  ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ',
  bya: 'びゃ', byu: 'びゅ', byo: 'びょ',
  // Hàng P (Bán đục)
  pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  pya: 'ぴゃ', pyu: 'ぴゅ', pyo: 'ぴょ',
  // Hàng M
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も',
  mya: 'みゃ', myu: 'みゅ', myo: 'みょ',
  // Hàng Y
  ya: 'や', yu: 'ゆ', yo: 'よ',
  // Hàng R
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ',
  rya: 'りゃ', ryu: 'りゅ', ryo: 'りょ',
  // Hàng W
  wa: 'わ', wo: 'を',
  // Âm mũi N
  nn: 'ん', "n'": 'ん',
};

/**
 * Chuyển đổi Romaji sang Hiragana mượt mà
 * Hỗ trợ âm ngắt (phụ âm kép: tt, kk, ss, pp, vv) và âm mũi
 */
export function romajiToHiragana(input: string): string {
  if (!input) return '';
  const str = input.toLowerCase().trim();
  let result = '';
  let i = 0;

  while (i < str.length) {
    // 1. Kiểm tra âm ngắt (Sokuon) - hai phụ âm giống nhau liên tiếp (trừ nn) hoặc dạng Hepburn 'tch'
    if (
      (i + 2 < str.length && str.substring(i, i + 3) === 'tch') ||
      (i + 1 < str.length && str.substring(i, i + 2) === 'tc')
    ) {
      result += 'っ';
      i++;
      continue;
    }

    if (
      i + 1 < str.length &&
      str[i] === str[i + 1] &&
      !['a', 'i', 'u', 'e', 'o', 'n'].includes(str[i])
    ) {
      result += 'っ';
      i++;
      continue;
    }

    // 2. Kiểm tra chuỗi 3 ký tự (kya, shu, cho, ...)
    if (i + 3 <= str.length) {
      const chunk3 = str.substring(i, i + 3);
      if (ROMAJI_TO_HIRAGANA_MAP[chunk3]) {
        result += ROMAJI_TO_HIRAGANA_MAP[chunk3];
        i += 3;
        continue;
      }
    }

    // 3. Kiểm tra chuỗi 2 ký tự (ka, sa, te, ...)
    if (i + 2 <= str.length) {
      const chunk2 = str.substring(i, i + 2);
      if (ROMAJI_TO_HIRAGANA_MAP[chunk2]) {
        result += ROMAJI_TO_HIRAGANA_MAP[chunk2];
        i += 2;
        continue;
      }
    }

    // 4. Kiểm tra chuỗi 1 ký tự (a, i, u, e, o, n)
    const char1 = str[i];
    if (char1 === 'n') {
      // Nếu là n cuối từ hoặc n đứng trước phụ âm (trừ y, a, i, u, e, o)
      if (
        i + 1 === str.length ||
        (!['a', 'i', 'u', 'e', 'o', 'y'].includes(str[i + 1]))
      ) {
        result += 'ん';
        i++;
        continue;
      }
    }

    if (ROMAJI_TO_HIRAGANA_MAP[char1]) {
      result += ROMAJI_TO_HIRAGANA_MAP[char1];
      i++;
      continue;
    }

    // Nếu không khớp bảng Romaji (ký tự Hiragana, Kanji hoặc ký hiệu sẵn có)
    result += char1;
    i++;
  }

  return result;
}

/**
 * Chuẩn hóa chuỗi nhập liệu
 */
export function normalizeString(str: string): string {
  return str.toLowerCase().replace(/[\s\u3000]+/g, '').trim();
}

/**
 * Đánh giá câu trả lời chia động từ của người học
 * Hỗ trợ so khớp: Kanji, Hiragana và Romaji
 */
export function evaluateConjugation(
  userInput: string,
  verb: VerbItem,
  targetForm: 'te' | 'ru'
): EvaluationResult {
  const normalizedRaw = normalizeString(userInput);
  const userAsHiragana = normalizeString(romajiToHiragana(normalizedRaw));

  const targetDetail = targetForm === 'te' ? verb.te_form : verb.ru_form;
  const expectedKanjiNorm = normalizeString(targetDetail.kanji);
  const expectedHiraNorm = normalizeString(targetDetail.hiragana);
  const expectedRomaNorm = normalizeString(targetDetail.romaji);

  // 1. So khớp chữ Hán
  if (normalizedRaw === expectedKanjiNorm) {
    return {
      isCorrect: true,
      matchType: 'kanji',
      userHiragana: userAsHiragana,
      expectedKanji: targetDetail.kanji,
      expectedHiragana: targetDetail.hiragana,
      expectedRomaji: targetDetail.romaji,
    };
  }

  // 2. So khớp Hiragana
  if (normalizedRaw === expectedHiraNorm || userAsHiragana === expectedHiraNorm) {
    return {
      isCorrect: true,
      matchType: normalizedRaw === expectedHiraNorm ? 'hiragana' : 'romaji',
      userHiragana: userAsHiragana,
      expectedKanji: targetDetail.kanji,
      expectedHiragana: targetDetail.hiragana,
      expectedRomaji: targetDetail.romaji,
    };
  }

  // 3. So khớp Romaji trực tiếp
  if (normalizedRaw === expectedRomaNorm) {
    return {
      isCorrect: true,
      matchType: 'romaji',
      userHiragana: userAsHiragana,
      expectedKanji: targetDetail.kanji,
      expectedHiragana: targetDetail.hiragana,
      expectedRomaji: targetDetail.romaji,
    };
  }

  // 4. Nếu sai: Tạo phản hồi lý thuyết ngữ pháp phù hợp để giải thích
  let explanation = '';
  if (targetForm === 'te') {
    if (verb.id === 'v3') {
      explanation = 'Lưu ý ngoại lệ quan trọng: 行く (iku) có đuôi ku nhưng KHÔNG chia là 行いて, mà chia là 行って (促音便 âm ngắt)!';
    } else if (verb.isException && verb.group === 1) {
      explanation = `Chú ý: ${verb.kanji} (${verb.hiragana}) là động từ Nhóm 1 (Godan) có đuôi ru, biến âm ngắt thành ${verb.te_form.hiragana}, không phải Nhóm 2!`;
    } else if (['問う', '乞う'].includes(verb.kanji)) {
      explanation = `Ngoại lệ cổ điển đặc biệt: ${verb.kanji} (${verb.hiragana}) tuy có đuôi [う] nhưng biến âm U thành [うて] (${verb.te_form.hiragana}) chứ không biến âm ngắt!`;
    } else if (verb.group === 1) {
      const lastChar = verb.hiragana.slice(-1);
      if (['う', 'つ', 'る'].includes(lastChar)) {
        explanation = `Quy tắc Nhóm 1: Đuôi [う・つ・る] biến âm ngắt thành [って]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
      } else if (['む', 'ぶ', 'ぬ'].includes(lastChar)) {
        explanation = `Quy tắc Nhóm 1: Đuôi [む・ぶ・ぬ] biến âm mũi thành [んで]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
      } else if (lastChar === 'く') {
        explanation = `Quy tắc Nhóm 1: Đuôi [く] biến âm I thành [いて]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
      } else if (lastChar === 'ぐ') {
        explanation = `Quy tắc Nhóm 1: Đuôi [ぐ] biến âm I đục thành [いで]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
      } else if (lastChar === 'す') {
        explanation = `Quy tắc Nhóm 1: Đuôi [す] biến đổi thành [して]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
      }
    } else if (verb.group === 2) {
      explanation = `Quy tắc Nhóm 2 (Ichidan): Bỏ [る] thêm [て]. Ví dụ: ${verb.kanji} -> ${verb.te_form.hiragana}`;
    } else if (verb.group === 3) {
      explanation = `Động từ bất quy tắc Nhóm 3: ${verb.kanji} (${verb.hiragana}) chia thành ${verb.te_form.hiragana}`;
    }
  } else {
    // Thể Ru
    explanation = `Thể từ điển (Thể Ru): ${verb.kanji} (${verb.hiragana}) thuộc Nhóm ${verb.group}. Dạng nguyên thể là ${verb.ru_form.kanji} (${verb.ru_form.hiragana}).`;
  }

  return {
    isCorrect: false,
    matchType: 'none',
    userHiragana: userAsHiragana,
    expectedKanji: targetDetail.kanji,
    expectedHiragana: targetDetail.hiragana,
    expectedRomaji: targetDetail.romaji,
    ruleExplanation: explanation,
  };
}

/**
 * Trả về danh sách tất cả 50 động từ thông dụng
 */
export function getAllVerbs(): VerbItem[] {
  return rawVerbsData as VerbItem[];
}

/**
 * Lọc danh sách động từ theo nhóm hoặc điều kiện
 */
export function filterVerbsByGroup(group: 1 | 2 | 3 | 'exceptions' | 'all'): VerbItem[] {
  const all = getAllVerbs();
  if (group === 'all') return all;
  if (group === 'exceptions') return all.filter((v) => v.isException);
  return all.filter((v) => v.group === group);
}
