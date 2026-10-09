/**
 * 🌸 Multimodal Asset Type Definitions (記憶道 · Multimodal Data Contracts)
 *
 * Provides strict TypeScript contracts for Google Drive assets across all 8 domains:
 * - kanji: Stroke order animated SVG vectors (111 items)
 * - vocab_audio: Tokyo native & Tatoeba pronunciation MP3s (291+ items)
 * - illustration: Irasutoya Master PNGs (1200px) & Minna SVG illustrations (31+ items)
 * - grammar_infographic: Mindmaps and grammar infographics (5 items)
 * - ielts_audio: Oxford & Cambridge studio lossy pronunciation and exam audio (53+ items)
 * - immersion_clip: Japanese conversational audio with synchronized bilingual subtitles (19+ items)
 * - jlpt_choukai: Official JLPT Choukai listening exam audio questions (9+ items)
 * - pubmed_corpus: Bilingual biomedical & cognitive neuroscience literature corpus (33+ items)
 */

/**
 * All 8 recognized domains/categories in the multimodal asset repository
 */
export type AssetCategory =
  | 'kanji'
  | 'vocab_audio'
  | 'illustration'
  | 'grammar_infographic'
  | 'ielts_audio'
  | 'immersion_clip'
  | 'jlpt_choukai'
  | 'pubmed_corpus';

/**
 * Metadata for Kanji stroke order animated SVG assets
 */
export interface KanjiMetadata {
  kanji?: string;
  strokes?: number;
  meaning?: string;
  onReading?: string[];
  kunReading?: string[];
  level?: string;
  strokeSvg?: string;
  [key: string]: any;
}

/**
 * Metadata for Tokyo Native vocabulary audio MP3 assets
 */
export interface VocabAudioMetadata {
  word?: string;
  reading?: string;
  meaning?: string;
  pitch?: number | string;
  audioSource?: string;
  level?: string;
  accentMora?: number;
  [key: string]: any;
}

/**
 * Metadata for Irasutoya PNG and Minna visual illustrations
 */
export interface IllustrationMetadata {
  title?: string;
  category?: string;
  resolution?: string;
  source?: string;
  artist?: string;
  sourceUrl?: string;
  word?: string;
  meaning?: string;
  [key: string]: any;
}

/**
 * Metadata for Grammar mindmaps and infographic SVGs
 */
export interface GrammarInfographicMetadata {
  patternKey?: string;
  title?: string;
  level?: string;
  summary?: string;
  formula?: string;
  lesson?: number | string;
  [key: string]: any;
}

/**
 * Metadata for Oxford & Cambridge academic pronunciation and IELTS exam practice audio
 */
export interface IeltsAudioMetadata {
  word?: string;
  phonetic?: string;
  quality?: string;
  title?: string;
  sectionNumber?: number;
  sectionType?: string;
  transcript?: string;
  questionsSummary?: string;
  source?: string;
  sourceUrl?: string;
  [key: string]: any;
}

/**
 * Subtitle sync segment for Immersion dialogue clips
 */
export interface SubtitleSyncItem {
  start: number;
  end: number;
  text: string;
  vi?: string;
  en?: string;
}

/**
 * Metadata for Anime and immersion conversational dialogue sentence audio clips
 */
export interface ImmersionClipMetadata {
  keyword?: string;
  topic?: string;
  level?: string;
  japanese?: string;
  translationVi?: string;
  translationEn?: string;
  speaker?: string;
  tatoebaSentenceId?: number;
  tatoebaAudioId?: number;
  subtitlesSync?: SubtitleSyncItem[];
  source?: string;
  sourceUrl?: string;
  [key: string]: any;
}

/**
 * Metadata for official JLPT Choukai listening examination questions
 */
export interface JlptChoukaiMetadata {
  level?: string;
  mondai?: number;
  mondaiName?: string;
  questionNumber?: number;
  title?: string;
  question?: string;
  options?: string[];
  correctOption?: number;
  script?: string;
  explanationVi?: string;
  officialSource?: string;
  source?: string;
  sourceUrl?: string;
  [key: string]: any;
}

/**
 * Metadata for PubMed and J-STAGE cognitive neuroscience / bilingual corpus records
 */
export interface PubMedCorpusMetadata {
  pmid?: string;
  doi?: string;
  title?: string;
  pubYear?: string | number;
  topic?: string;
  source?: string;
  abstract?: string;
  journal?: string;
  [key: string]: any;
}

/**
 * Union of all specialized category metadata interfaces
 */
export type CategoryMetadata =
  | KanjiMetadata
  | VocabAudioMetadata
  | IllustrationMetadata
  | GrammarInfographicMetadata
  | IeltsAudioMetadata
  | ImmersionClipMetadata
  | JlptChoukaiMetadata
  | PubMedCorpusMetadata;

/**
 * Standard multimodal asset metadata with common indexed fields
 */
export interface AssetMetadata {
  kanji?: string;
  strokes?: number;
  word?: string;
  reading?: string;
  meaning?: string;
  level?: string;
  title?: string;
  japanese?: string;
  pmid?: string;
  transcript?: string;
  [key: string]: any;
}

/**
 * Core MultimodalAsset representation across the application
 */
export interface MultimodalAsset {
  key: string;
  category: AssetCategory;
  fileName: string;
  mimeType: string;
  fileId: string;
  driveUrl: string;
  cdnUrl: string; // lh3 for visual, drive.google.com/uc for audio
  sizeBytes: number;
  updatedAt?: string;
  metadata?: AssetMetadata;
}

/**
 * Input descriptor for resolving direct CDN URLs
 */
export interface AssetCdnResolvable {
  fileId: string;
  mimeType?: string;
  category?: string;
}

/**
 * Summary metrics of the multimodal asset collection
 */
export interface MultimodalSummary {
  totalAssets: number;
  categories: Record<string, number>;
  lastUpdated: string;
}
