import vocabularySource from '../../../data/jpd133_vocab.json';

interface SourceVocabularyItem {
  raw_word?: string;
  word: string;
  reading?: string;
  meaning: string;
  topic?: string;
  page: number;
}

export interface JPD133VocabularyItem {
  id: string;
  kanji: string;
  reading?: string;
  vietnameseMeaning: string;
  topic?: string;
  sourcePage: number;
  contextSentenceJa?: string;
  contextSentenceVn?: string;
}

export interface JPD133SlotDefinition {
  slotId: string;
  slotNumber: number;
  titleVn: string;
  titleJa: string;
  sourcePage: number;
  vocabularyList: JPD133VocabularyItem[];
}

/**
 * Recovery note:
 * Phase 10 documented eight JPD133 slots numbered 1,2,3,4,5,6,8,10.
 * The committed source dataset exposes a numeric `page` field but no durable
 * slot identifier. For the recovery branch we therefore use the only
 * deterministic mapping supported by repository data: slot N -> source page N.
 * This mapping is intentionally isolated here so it can be redesigned after review.
 */
const SLOT_METADATA: ReadonlyArray<Omit<JPD133SlotDefinition, 'vocabularyList'>> = [
  { slotId: 'jpd133-slot-1', slotNumber: 1, titleVn: 'Gia đình & nơi ở', titleJa: '家族・友達', sourcePage: 1 },
  { slotId: 'jpd133-slot-2', slotNumber: 2, titleVn: 'Ngoại hình & đặc điểm', titleJa: 'こんな人', sourcePage: 2 },
  { slotId: 'jpd133-slot-3', slotNumber: 3, titleVn: 'Đồ vật & cho/nhận', titleJa: 'プレゼント', sourcePage: 3 },
  { slotId: 'jpd133-slot-4', slotNumber: 4, titleVn: 'Sở thích & hoạt động', titleJa: '趣味・活動', sourcePage: 4 },
  { slotId: 'jpd133-slot-5', slotNumber: 5, titleVn: 'Động từ thể từ điển', titleJa: '辞書形', sourcePage: 5 },
  { slotId: 'jpd133-slot-6', slotNumber: 6, titleVn: 'Khả năng & tiềm năng', titleJa: '可能・能力', sourcePage: 6 },
  { slotId: 'jpd133-slot-8', slotNumber: 8, titleVn: 'Hành động nối tiếp', titleJa: 'て形・連続動作', sourcePage: 8 },
  { slotId: 'jpd133-slot-10', slotNumber: 10, titleVn: 'Chỉ dẫn, quy tắc & xin phép', titleJa: '注意・許可', sourcePage: 10 },
];

const source = vocabularySource as SourceVocabularyItem[];

function vocabularyForPage(page: number): JPD133VocabularyItem[] {
  return source
    .filter((item) => item.page === page)
    .map((item, index) => ({
      id: `jpd133-p${page}-${index + 1}`,
      kanji: item.word,
      reading: item.reading,
      vietnameseMeaning: item.meaning,
      topic: item.topic,
      sourcePage: item.page,
    }));
}

const slots: JPD133SlotDefinition[] = SLOT_METADATA.map((slot) => ({
  ...slot,
  vocabularyList: vocabularyForPage(slot.sourcePage),
}));

export function getAllJPD133Slots(): JPD133SlotDefinition[] {
  return slots.map((slot) => ({
    ...slot,
    vocabularyList: slot.vocabularyList.map((item) => ({ ...item })),
  }));
}

export function getJPD133Slot(slot: string | number): JPD133SlotDefinition | undefined {
  const number = Number(slot);
  const found = slots.find((item) => item.slotNumber === number);
  if (!found) return undefined;
  return {
    ...found,
    vocabularyList: found.vocabularyList.map((item) => ({ ...item })),
  };
}
