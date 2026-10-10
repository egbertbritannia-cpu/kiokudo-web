import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareReviewEvent, isCanonicalAck, replayOne, replayOwner,
  type ReviewOutboxEvent, type ReviewOutboxStore, type ReviewResolution,
} from '../src/lib/fsrs-review-outbox.js';

class MemoryStore implements ReviewOutboxStore {
  readonly records: Map<string, ReviewOutboxEvent>;
  constructor(records = new Map<string, ReviewOutboxEvent>()) { this.records = records; }
  async enqueue(event: ReviewOutboxEvent) {
    if (this.records.has(event.eventId)) throw new Error('ConstraintError');
    this.records.set(event.eventId, structuredClone(event));
  }
  async list(ownerKey: string) {
    return [...this.records.values()].filter(x => x.ownerKey === ownerKey).map(x => structuredClone(x));
  }
  async claim(ownerKey: string, eventId: string, now: number, leaseMs: number) {
    const current = this.records.get(eventId);
    if (!current || current.ownerKey !== ownerKey) return null;
    const available = ['pending', 'uncertain'].includes(current.status) ||
      (current.status === 'in_flight' && (current.leaseUntil ?? Infinity) <= now);
    if (!available || current.nextAttemptAt > now) return null;
    const claimed: ReviewOutboxEvent = { ...current, status: 'in_flight', attempts: current.attempts + 1,
      attemptToken: crypto.randomUUID(), leaseUntil: now + leaseMs };
    this.records.set(eventId, claimed);
    return structuredClone(claimed);
  }
  async settle(ownerKey: string, eventId: string, token: string, result: ReviewResolution) {
    const current = this.records.get(eventId);
    if (!current || current.ownerKey !== ownerKey || current.status !== 'in_flight' || current.attemptToken !== token) return false;
    this.records.set(eventId, { ...current, ...result, attemptToken: undefined, leaseUntil: undefined });
    return true;
  }
  async cancelUnsent(ownerKey: string, eventId: string) {
    const current = this.records.get(eventId);
    if (!current || current.ownerKey !== ownerKey || current.status !== 'pending' || current.attempts !== 0) return false;
    this.records.delete(eventId);
    return true;
  }
}
const owner = 'fixture-learner-A';
const reviewedAt = '2026-10-08T10:00:00.000Z';
function make(id = 'event-A', overrides: Partial<Parameters<typeof prepareReviewEvent>[0]> = {}) {
  return prepareReviewEvent({ ownerKey: owner, cardId: 'card-A', rating: 'Good', reviewedAt, ...overrides }, id);
}
function ack(e: ReviewOutboxEvent, status: 'applied' | 'duplicate' = 'applied') {
  return { eventId: e.eventId, status, data: {
    cardId: e.cardId, rating: e.rating, state: 'Review', stability: 1.5,
    difficulty: 5, scheduledDays: 1, nextReviewDate: '2026-10-09T10:00:00.000Z',
  } };
}

test('stable event schema and invalid inputs', () => {
  const event = make();
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.reviewedAt, reviewedAt);
  assert.equal(event.status, 'pending');
  assert.ok(!('scheduledDays' in event));
  assert.throws(() => make('bad', { rating: 'INVALID' as never }), /rating/);
  assert.throws(() => make('bad', { reviewedAt: 'garbage' }), /timestamp/);
  assert.throws(() => make('bad', { ownerKey: '' }), /identity/);
});

test('event ID uniqueness and owner scoping', async () => {
  const store = new MemoryStore();
  await store.enqueue(make());
  await assert.rejects(store.enqueue(make()), /ConstraintError/);
  assert.equal((await store.list('fixture-learner-B')).length, 0);
  assert.equal(await store.claim('fixture-learner-B', 'event-A', 1000, 1000), null);
  assert.equal(await store.cancelUnsent('fixture-learner-B', 'event-A'), false);
});

test('canonical acknowledgement requires matching ID, rating and FSRS fields', () => {
  const event = make();
  assert.equal(isCanonicalAck(ack(event), event), true);
  assert.equal(isCanonicalAck({ ...ack(event), eventId: 'other' }, event), false);
  assert.equal(isCanonicalAck({ ...ack(event), data: { ...ack(event).data, rating: 'Hard' } }, event), false);
  assert.equal(isCanonicalAck({ ...ack(event), data: { ...ack(event).data, stability: NaN } }, event), false);
});

test('lost response retry reuses same immutable event identity', async () => {
  const store = new MemoryStore(); const event = make(); await store.enqueue(event);
  const sent: unknown[] = [];
  let attempt = 0;
  const send = async (payload: Parameters<Parameters<typeof replayOne>[3]>[0]) => {
    sent.push(payload);
    if (attempt++ === 0) throw new Error('lost response');
    return { httpStatus: 200, body: ack(event, 'duplicate') };
  };
  assert.equal(await replayOne(store, owner, event.eventId, send, { now: 1000, random: () => 0 }), 'uncertain');
  assert.equal(await replayOne(store, owner, event.eventId, send, { now: 1500 }), 'deferred');
  assert.equal(await replayOne(store, owner, event.eventId, send, { now: 2000 }), 'acknowledged');
  assert.deepEqual(sent[0], sent[1]);
  assert.equal(store.records.get(event.eventId)?.canonical?.status, 'duplicate');
  assert.equal(store.records.get(event.eventId)?.attempts, 2);
});

test('auth failures block and conflict rejects without deleting event', async () => {
  for (const [httpStatus, expected] of [[401, 'blocked_auth'], [403, 'blocked_auth'], [409, 'rejected']] as const) {
    const store = new MemoryStore(); await store.enqueue(make());
    assert.equal(await replayOne(store, owner, 'event-A', async () => ({ httpStatus, body: {} }), { now: 100 }), expected);
    assert.equal((await store.list(owner))[0].status, expected);
  }
});

test('malformed success is uncertain, not saved', async () => {
  const store = new MemoryStore(); await store.enqueue(make());
  assert.equal(await replayOne(store, owner, 'event-A', async () => ({
    httpStatus: 200, body: { success: true },
  }), { now: 100 }), 'uncertain');
  assert.equal(store.records.get('event-A')?.canonical, undefined);
});

test('restart-like shared storage replays chronologically', async () => {
  const records = new Map<string, ReviewOutboxEvent>();
  const first = new MemoryStore(records);
  await first.enqueue(make('late', { reviewedAt: '2026-10-09T10:00:00.000Z' }));
  await first.enqueue(make('early'));
  const seen: string[] = [];
  const result = await replayOwner(new MemoryStore(records), owner, async payload => {
    seen.push(payload.eventId);
    return { httpStatus: 200, body: ack(records.get(payload.eventId)!) };
  }, { now: 1000 });
  assert.deepEqual(result, { acknowledged: 2 });
  assert.deepEqual(seen, ['early', 'late']);
});

test('uncertain oldest event stops newer replay', async () => {
  const store = new MemoryStore(); await store.enqueue(make('early'));
  await store.enqueue(make('late', { reviewedAt: '2026-10-09T10:00:00.000Z' }));
  const sent: string[] = [];
  const result = await replayOwner(store, owner, async payload => {
    sent.push(payload.eventId); throw new Error('offline');
  }, { now: 1000, random: () => 0 });
  assert.deepEqual(result, { acknowledged: 0, stoppedAt: 'early', outcome: 'uncertain' });
  assert.deepEqual(sent, ['early']);
});

test('undo cancels only never-sent events', async () => {
  const store = new MemoryStore(); await store.enqueue(make('never'));
  assert.equal(await store.cancelUnsent(owner, 'never'), true);
  await store.enqueue(make('attempted'));
  const claimed = await store.claim(owner, 'attempted', 1000, 1000);
  assert.equal(await store.cancelUnsent(owner, 'attempted'), false);
  assert.equal(await store.settle(owner, 'attempted', claimed!.attemptToken!, {
    status: 'uncertain', nextAttemptAt: 5000, lastError: 'transport_uncertain',
  }), true);
  assert.equal(await store.cancelUnsent(owner, 'attempted'), false);
});

test('lease claim is exclusive and stale acknowledgement rejected', async () => {
  const store = new MemoryStore(); await store.enqueue(make());
  const a = await store.claim(owner, 'event-A', 1000, 500);
  assert.ok(a);
  assert.equal(await store.claim(owner, 'event-A', 1200, 500), null);
  const b = await store.claim(owner, 'event-A', 1500, 500);
  assert.ok(b);
  assert.notEqual(a!.attemptToken, b!.attemptToken);
  assert.equal(await store.settle(owner, 'event-A', a!.attemptToken!, {
    status: 'acknowledged', nextAttemptAt: 0, canonical: ack(make()),
  }), false);
});
