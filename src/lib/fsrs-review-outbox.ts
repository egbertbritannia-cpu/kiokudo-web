/**
 * Staging-only FSRS outbox domain. No HTTP client or UI activation lives here.
 * ownerKey is a cache partition, NOT proof of authentication. Only an independently
 * verified Web/Core principal may enable a future network sender.
 */
export type ReviewRating = 'Again' | 'Hard' | 'Good' | 'Easy';
export type ReviewOutboxStatus = 'pending' | 'in_flight' | 'uncertain' | 'blocked_auth' | 'rejected' | 'acknowledged';

export interface CanonicalReview {
  eventId: string;
  status: 'applied' | 'duplicate';
  data: {
    cardId: string;
    rating: ReviewRating;
    state: string;
    stability: number;
    difficulty: number;
    scheduledDays: number;
    nextReviewDate: string;
  };
}

export interface ReviewOutboxEvent {
  schemaVersion: 1;
  eventId: string;
  ownerKey: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  responseTimeMs?: number;
  status: ReviewOutboxStatus;
  attempts: number;
  nextAttemptAt: number;
  attemptToken?: string;
  leaseUntil?: number;
  lastError?: string;
  canonical?: CanonicalReview;
}

export type ReviewResolution = {
  status: 'uncertain' | 'blocked_auth' | 'rejected' | 'acknowledged';
  nextAttemptAt: number;
  lastError?: string;
  canonical?: CanonicalReview;
};

/** claim, settle and cancelUnsent MUST be atomic compare-and-swap operations. */
export interface ReviewOutboxStore {
  enqueue(event: ReviewOutboxEvent): Promise<void>;
  list(ownerKey: string): Promise<ReviewOutboxEvent[]>;
  claim(ownerKey: string, eventId: string, now: number, leaseMs: number): Promise<ReviewOutboxEvent | null>;
  settle(ownerKey: string, eventId: string, attemptToken: string, result: ReviewResolution): Promise<boolean>;
  cancelUnsent(ownerKey: string, eventId: string): Promise<boolean>;
}

export function prepareReviewEvent(
  input: { ownerKey: string; cardId: string; rating: ReviewRating; reviewedAt?: string; responseTimeMs?: number },
  eventId: string = crypto.randomUUID(),
): ReviewOutboxEvent {
  if (!input.ownerKey.trim() || !input.cardId.trim() || !eventId.trim()) throw new Error('Missing owner/card/event identity');
  if (!['Again', 'Hard', 'Good', 'Easy'].includes(input.rating)) throw new Error('Invalid FSRS rating');
  if (input.cardId.length > 256 || eventId.length > 256) throw new Error('Identifier too long');
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(reviewedAt))) throw new Error('Invalid review timestamp');
  if (input.responseTimeMs !== undefined && (!Number.isFinite(input.responseTimeMs) || input.responseTimeMs < 0)) {
    throw new Error('Invalid response time');
  }
  return {
    schemaVersion: 1, eventId, ownerKey: input.ownerKey, cardId: input.cardId,
    rating: input.rating, reviewedAt: new Date(reviewedAt).toISOString(),
    responseTimeMs: input.responseTimeMs, status: 'pending', attempts: 0, nextAttemptAt: 0,
  };
}

export function isCanonicalAck(body: unknown, event: ReviewOutboxEvent): body is CanonicalReview {
  if (!body || typeof body !== 'object') return false;
  const response = body as Record<string, unknown>;
  if (response.eventId !== event.eventId || !['applied', 'duplicate'].includes(String(response.status))) return false;
  if (!response.data || typeof response.data !== 'object') return false;
  const data = response.data as Record<string, unknown>;
  return data.cardId === event.cardId && data.rating === event.rating &&
    typeof data.state === 'string' && data.state.length > 0 &&
    ['stability', 'difficulty', 'scheduledDays'].every(key => typeof data[key] === 'number' && Number.isFinite(data[key])) &&
    typeof data.nextReviewDate === 'string' && Number.isFinite(Date.parse(data.nextReviewDate));
}

export function retryDelayMs(attempts: number, random: () => number = Math.random): number {
  const base = Math.min(60_000, 1_000 * 2 ** Math.min(6, Math.max(0, attempts - 1)));
  return Math.floor(base * (0.8 + 0.2 * Math.min(1, Math.max(0, random()))));
}

export type ReviewSender = (payload: {
  eventId: string; cardId: string; rating: ReviewRating; reviewedAt: string; responseTimeMs?: number;
}) => Promise<{ httpStatus: number; body: unknown }>;

export type ReplayOutcome = 'acknowledged' | 'deferred' | 'uncertain' | 'blocked_auth' | 'rejected';

/** One event at a time. Never invent a new eventId on retry or trust client FSRS calculations. */
export async function replayOne(
  store: ReviewOutboxStore, ownerKey: string, eventId: string, send: ReviewSender,
  options: { now?: number; random?: () => number; leaseMs?: number } = {},
): Promise<ReplayOutcome> {
  const now = options.now ?? Date.now();
  const event = await store.claim(ownerKey, eventId, now, options.leaseMs ?? 30_000);
  if (!event || !event.attemptToken) return 'deferred';
  let resolution: ReviewResolution;
  try {
    const response = await send({
      eventId: event.eventId, cardId: event.cardId, rating: event.rating,
      reviewedAt: event.reviewedAt, responseTimeMs: event.responseTimeMs,
    });
    if (response.httpStatus >= 200 && response.httpStatus < 300 && isCanonicalAck(response.body, event)) {
      resolution = { status: 'acknowledged', nextAttemptAt: 0, canonical: response.body, lastError: undefined };
    } else if (response.httpStatus === 401 || response.httpStatus === 403) {
      resolution = { status: 'blocked_auth', nextAttemptAt: 0, lastError: `http_${response.httpStatus}`, canonical: undefined };
    } else if ([400, 404, 409, 422].includes(response.httpStatus)) {
      resolution = { status: 'rejected', nextAttemptAt: 0, lastError: `http_${response.httpStatus}`, canonical: undefined };
    } else {
      // A 2xx with malformed JSON is uncertain: Core may already have committed.
      resolution = { status: 'uncertain', nextAttemptAt: now + retryDelayMs(event.attempts, options.random),
        lastError: 'unverified_response', canonical: undefined };
    }
  } catch {
    // Lost response and lost request are indistinguishable: retry SAME eventId.
    resolution = { status: 'uncertain', nextAttemptAt: now + retryDelayMs(event.attempts, options.random),
      lastError: 'transport_uncertain', canonical: undefined };
  }
  const committed = await store.settle(ownerKey, eventId, event.attemptToken, resolution);
  // A stale attempt must not report success if another tab took ownership.
  return committed ? (resolution.status === 'acknowledged' ? 'acknowledged' : resolution.status) : 'deferred';
}

/** Preserve chronological order: stop on a blocked/uncertain older event. */
export async function replayOwner(
  store: ReviewOutboxStore, ownerKey: string, send: ReviewSender,
  options: { now?: number; random?: () => number; maxEvents?: number } = {},
): Promise<{ acknowledged: number; stoppedAt?: string; outcome?: ReplayOutcome }> {
  const events = (await store.list(ownerKey)).sort((a, b) =>
    a.reviewedAt.localeCompare(b.reviewedAt) || a.eventId.localeCompare(b.eventId));
  let acknowledged = 0;
  for (const event of events) {
    if (event.status === 'acknowledged') continue;
    if (acknowledged >= (options.maxEvents ?? 200)) break;
    if (event.status === 'blocked_auth' || event.status === 'rejected') {
      return { acknowledged, stoppedAt: event.eventId, outcome: event.status };
    }
    const outcome = await replayOne(store, ownerKey, event.eventId, send, options);
    if (outcome !== 'acknowledged') return { acknowledged, stoppedAt: event.eventId, outcome };
    acknowledged++;
  }
  return { acknowledged };
}
