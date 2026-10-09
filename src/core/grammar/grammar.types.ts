/**
 * Domain Types for Grammar Engine (文法エンジン)
 * Japanese SRS System — Zero-Backend-Regression
 */

export interface GrammarStructureSlot {
  label: string;
  role: 'subject' | 'target' | 'object' | 'particle' | 'core_verb' | 'auxiliary' | 'adjective' | 'noun' | 'clause';
  color: string; // Hex color from Nippon Colors palette
  required: boolean;
  allowedTypes?: string[];
  note?: string;
}

export interface GrammarExampleSentence {
  ja: string;
  furigana: string;
  romaji?: string;
  vi: string;
  highlight: string;
  highlightType: 'pattern_core' | 'particle' | 'slot';
  audioUrl?: string;
  contextNote?: string;
}

export interface GrammarLesson {
  id: string;
  lessonNumber: number;
  titleJa: string;
  titleVi: string;
  themeJa?: string;
  themeVi?: string;
  patternRange: string;
  patternCount: number;
  accentColor: string;
  wagara?: string;
  inkanChar?: string;
  description: string;
  sortOrder: number;
  createdAt: Date;
  patterns?: GrammarPattern[];
}

export interface GrammarPattern {
  id: string;
  lessonId: string;
  patternNumber: number;
  jlptLevel: 'N5' | 'N4' | 'N3';
  difficultyScore: number; // 1 to 5
  patternTemplate: string;
  structureSlots: GrammarStructureSlot[];
  meaningVi: string;
  meaningJa?: string;
  usageNote?: string;
  examples: GrammarExampleSentence[];
  verbTypes?: string[];
  relatedPatternIds?: string[];
  createdAt: Date;
  updatedAt: Date;
  exercises?: GrammarExercise[];
}

export type GrammarExerciseType = 
  | 'cloze' 
  | 'multiple_choice' 
  | 'fill_blank' 
  | 'translation_vi_to_ja' 
  | 'jumble';

export interface GrammarExercise {
  id: string;
  patternId: string;
  exerciseType: GrammarExerciseType;
  difficulty: number;
  sentenceWithCloze?: string;
  question?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: 'A' | 'B' | 'C' | 'D';
  promptText?: string;
  answerText: string;
  alternateAnswers?: string[];
  explanationVi?: string;
  explanationJa?: string;
  sourceRef?: string;
  sortOrder: number;
  createdAt: Date;
}

export interface GrammarCardGenerationSpec {
  pattern: GrammarPattern;
  deckId: string;
  cardTypes: Array<'recognition' | 'production' | 'cloze' | 'contrast'>;
}

export interface GrammarDrillSession {
  lessonId?: string;
  exercises: GrammarExercise[];
  currentIndex: number;
  totalCount: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  sessionStartedAt: Date;
  cardGrades: Record<string, 'Again' | 'Hard' | 'Good' | 'Easy'>;
}
