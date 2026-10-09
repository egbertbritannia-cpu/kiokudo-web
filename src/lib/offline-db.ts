/**
 * JapaneseSrsOfflineDatabase - Cơ sở dữ liệu ngoại tuyến IndexedDB (Dexie.js)
 * Cung cấp khả năng Offline-First cho phép học từ vựng khi mất mạng / đứt cáp quang biển.
 * Tự động đồng bộ hai chiều (Offline-First Sync Engine) khi thiết bị phục hồi kết nối.
 * Căn cứ: planning/06_PHASE_6_PERFORMANCE_OPTIMIZATION_AND_SRE.md (Mục 3)
 */

import Dexie, { type Table } from 'dexie';

export interface LocalCard {
  id: string;
  front: string;
  reading?: string;
  meaning: string;
  deckId: string;
  deckName?: string;
  type?: string;
  sentence?: string;
  pitch?: string;
  state?: string;
  due?: number | string | Date;
  stability?: number;
  difficulty?: number;
  updatedAt?: number;
}

export interface PendingReviewLog {
  id: string;
  cardId: string;
  rating: string;
  reviewedAt: number;
  scheduledDays?: number;
  responseTimeMs?: number;
  synced: number; // 0: Chưa đồng bộ, 1: Đã đồng bộ
}

export class JapaneseSrsOfflineDatabase extends Dexie {
  cards!: Table<LocalCard, string>;
  pendingReviews!: Table<PendingReviewLog, string>;

  constructor() {
    super('JapaneseSrsOfflineDB');
    this.version(1).stores({
      cards: 'id, deckId, state, due',
      pendingReviews: 'id, cardId, synced, reviewedAt',
    });
  }
}

// Khởi tạo Singleton Database an toàn cho cả môi trường SSR và Browser
export const offlineDb = new JapaneseSrsOfflineDatabase();

/**
 * Lưu danh sách thẻ bài vào bộ nhớ cục bộ IndexedDB
 */
export async function cacheCardsLocally(cards: LocalCard[]): Promise<void> {
  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') return;
  try {
    await offlineDb.cards.bulkPut(
      cards.map((c) => ({
        ...c,
        due: c.due ? new Date(c.due).getTime() : Date.now(),
        updatedAt: Date.now(),
      }))
    );
  } catch (err) {
    console.warn('[OfflineDB] Lưu cache thẻ bài thất bại:', err);
  }
}

/**
 * Làm mới toàn bộ cache của một bộ thẻ (Cache Invalidation - BUG-OFF-03)
 * Xóa các thẻ cũ đã bị xóa trên máy chủ để không để lại thẻ ma (ghost cards)
 */
export async function syncCardsCacheForDeck(deckId: string, serverCards: LocalCard[]): Promise<void> {
  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') return;
  try {
    await offlineDb.transaction('rw', offlineDb.cards, async () => {
      await offlineDb.cards.where('deckId').equals(deckId).delete();
      await offlineDb.cards.bulkPut(
        serverCards.map((c) => ({
          ...c,
          due: c.due ? new Date(c.due).getTime() : Date.now(),
          updatedAt: Date.now(),
        }))
      );
    });
  } catch (err) {
    console.warn('[OfflineDB] syncCardsCacheForDeck error:', err);
  }
}

/**
 * Đọc danh sách thẻ bài từ IndexedDB khi không có kết nối mạng
 */
export async function getOfflineCards(deckId?: string): Promise<LocalCard[]> {
  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') return [];
  try {
    if (deckId && deckId !== 'all') {
      return await offlineDb.cards.where('deckId').equals(deckId).toArray();
    }
    return await offlineDb.cards.toArray();
  } catch (err) {
    console.warn('[OfflineDB] Đọc thẻ bài ngoại tuyến thất bại:', err);
    return [];
  }
}

/**
 * Ghi nhận log chấm điểm vào hàng đợi ngoại tuyến (synced = 0)
 */
export async function recordPendingReview(
  cardId: string,
  rating: string,
  scheduledDays?: number,
  responseTimeMs: number = 2500,
  eventId?: string,
  reviewedAt: number = Date.now()
): Promise<string> {
  const reviewId =
    eventId ||
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`);

  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') return reviewId;

  try {
    await offlineDb.pendingReviews.put({
      id: reviewId,
      cardId,
      rating,
      reviewedAt,
      scheduledDays,
      responseTimeMs,
      synced: 0,
    });
  } catch (err) {
    console.warn('[OfflineDB] Ghi log ôn tập ngoại tuyến thất bại:', err);
  }

  return reviewId;
}

/**
 * Đếm số lượng lượt ôn tập đang chờ đồng bộ lên máy chủ
 */
export async function getUnsyncedReviewCount(): Promise<number> {
  if (typeof window === 'undefined' && typeof indexedDB === 'undefined') return 0;
  try {
    return await offlineDb.pendingReviews.where('synced').equals(0).count();
  } catch {
    return 0;
  }
}

/**
 * Đồng bộ toàn bộ lượt ôn tập ngoại tuyến lên máy chủ (/api/review hoặc /api/review/batch)
 * - Sử dụng Web Locks API ngăn chặn race condition giữa nhiều tab (BUG-OFF-01)
 * - Ưu tiên đồng bộ hàng loạt Batch Sync thay vì lặp tuần tự (BUG-OFF-02)
 */
export async function syncPendingReviewsToServer(
  endpoint = '/api/review'
): Promise<{ synced: number; failed: number }> {
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  // Khóa Web Locks API để tránh race condition khi nhiều tab cùng online (BUG-OFF-01)
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return await navigator.locks.request('offline_review_sync_lock', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log('[OfflineDB] Một tab khác đang tiến hành đồng bộ, bỏ qua.');
        return { synced: 0, failed: 0 };
      }
      return await executeSyncBatch(endpoint);
    });
  }

  return await executeSyncBatch(endpoint);
}

async function executeSyncBatch(endpoint: string): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  try {
    const pending = await offlineDb.pendingReviews
      .where('synced')
      .equals(0)
      .toArray();

    if (pending.length === 0) {
      return { synced: 0, failed: 0 };
    }

    // 1. Ưu tiên đồng bộ theo lô Batch Sync nếu có nhiều bản ghi (BUG-OFF-02)
    if (pending.length > 1) {
      try {
        const batchEndpoint = endpoint.includes('/batch') ? endpoint : '/api/review/batch';
        const batchRes = await fetch(batchEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviews: pending.map((p) => ({
              id: p.id,
              cardId: p.cardId,
              rating: p.rating,
              scheduledDays: p.scheduledDays,
              reviewTime: p.reviewedAt,
            })),
          }),
        });

        if (batchRes.ok) {
          const body = await batchRes.json();
          const acknowledgedIds = Array.isArray(body.results)
            ? body.results
                .filter((result: any) => result.status === 'applied' || result.status === 'duplicate')
                .map((result: any) => result.eventId)
                .filter(Boolean)
            : [];

          if (acknowledgedIds.length > 0) {
            await offlineDb.pendingReviews.where('id').anyOf(acknowledgedIds).delete();
          }

          return {
            synced: acknowledgedIds.length,
            failed: pending.length - acknowledgedIds.length,
          };
        }
      } catch (batchErr) {
        console.warn('[OfflineDB] Batch sync failed, falling back to individual sync:', batchErr);
      }
    }

    // 2. Fallback: đồng bộ tuần tự từng bản ghi
    for (const item of pending) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            cardId: item.cardId,
            rating: item.rating,
            reviewTime: item.reviewedAt,
            responseTimeMs: item.responseTimeMs || 2500,
            // Retained for wire compatibility only; the server never trusts this value.
            scheduledDays: item.scheduledDays,
          }),
        });

        if (res.ok) {
          await offlineDb.pendingReviews.update(item.id, { synced: 1 });
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    // Dọn dẹp các bản ghi đã đồng bộ thành công sau khi hoàn tất
    if (synced > 0) {
      await offlineDb.pendingReviews.where('synced').equals(1).delete();
    }
  } catch (err) {
    console.warn('[OfflineDB] Lỗi đồng bộ pending reviews:', err);
  }

  return { synced, failed };
}
