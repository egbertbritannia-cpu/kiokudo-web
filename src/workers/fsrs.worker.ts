import { FSRS, generatorParameters, type Card, type RecordLog } from 'ts-fsrs';

/**
 * FSRS Dedicated Web Worker
 * Chuyển toàn bộ gánh nặng tính toán ma trận FSRS (DSR) và 21 trọng số sang luồng riêng,
 * giải phóng Main Thread hoàn toàn để đảm bảo Interaction to Next Paint (INP) < 25ms.
 */

const fsrs = new FSRS(generatorParameters());

export interface FsrsWorkerRequest {
  id: string;
  card: Card;
  now: number;
}

export interface FsrsWorkerResponse {
  id: string;
  nextStates?: RecordLog;
  error?: string;
}

// Lắng nghe yêu cầu tính toán từ Main Thread
addEventListener('message', (event: MessageEvent<FsrsWorkerRequest>) => {
  const { id, card, now } = event.data;

  try {
    const hydratedCard: Card = {
      ...card,
      due: card.due ? new Date(card.due) : new Date(),
      last_review: card.last_review ? new Date(card.last_review) : undefined,
    };
    const schedulingCards = fsrs.repeat(hydratedCard, new Date(now));

    const response: FsrsWorkerResponse = {
      id,
      nextStates: schedulingCards,
    };

    postMessage(response);
  } catch (err: any) {
    postMessage({
      id,
      error: err?.message || 'Lỗi tính toán tham số FSRS',
    });
  }
});
