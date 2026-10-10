/** Separate Dexie database. Never replay legacy pendingReviews into Core. */
import Dexie, { type Table } from 'dexie';
import type { ReviewOutboxEvent, ReviewOutboxStore, ReviewResolution } from './fsrs-review-outbox';

export class IndexedDbReviewOutbox extends Dexie implements ReviewOutboxStore {
  events!: Table<ReviewOutboxEvent, string>;

  constructor() {
    super('KiokudoFsrsReviewOutboxV2');
    this.version(1).stores({ events: 'eventId, ownerKey, status, reviewedAt' });
  }

  async enqueue(event: ReviewOutboxEvent): Promise<void> {
    if (event.status !== 'pending' || event.attempts !== 0 || !event.ownerKey) {
      throw new Error('Only fresh, scoped events may be enqueued');
    }
    await this.events.add(event);
  }

  async list(ownerKey: string): Promise<ReviewOutboxEvent[]> {
    if (!ownerKey) throw new Error('Owner scope required');
    return this.events.where('ownerKey').equals(ownerKey).toArray();
  }

  async claim(ownerKey: string, eventId: string, now: number, leaseMs: number): Promise<ReviewOutboxEvent | null> {
    if (!ownerKey || leaseMs <= 0) return null;
    return this.transaction('rw', this.events, async () => {
      const event = await this.events.get(eventId);
      if (!event || event.ownerKey !== ownerKey) return null;
      const available = event.status === 'pending' || event.status === 'uncertain' ||
        (event.status === 'in_flight' && (event.leaseUntil ?? Infinity) <= now);
      if (!available || event.nextAttemptAt > now) return null;
      const claimed: ReviewOutboxEvent = {
        ...event, status: 'in_flight', attempts: event.attempts + 1,
        attemptToken: crypto.randomUUID(), leaseUntil: now + leaseMs,
      };
      await this.events.put(claimed);
      return claimed;
    });
  }

  async settle(ownerKey: string, eventId: string, attemptToken: string, result: ReviewResolution): Promise<boolean> {
    if (!ownerKey || !attemptToken) return false;
    return this.transaction('rw', this.events, async () => {
      const current = await this.events.get(eventId);
      if (!current || current.ownerKey !== ownerKey || current.status !== 'in_flight' ||
          current.attemptToken !== attemptToken) return false;
      await this.events.put({ ...current, ...result, attemptToken: undefined, leaseUntil: undefined });
      return true;
    });
  }

  /** Requeue auth-blocked events only after a freshly verified online owner session. */
  async rearmAfterAuthentication(ownerKey:string):Promise<void> {
    if(!ownerKey)throw new Error('owner_required');
    await this.transaction('rw',this.events,async()=>{
      const events=await this.events.where('ownerKey').equals(ownerKey).toArray();
      for(const event of events){
        if(event.status!=='blocked_auth')continue;
        await this.events.put({...event,status:'uncertain',nextAttemptAt:0,
          attemptToken:undefined,leaseUntil:undefined,lastError:undefined});
      }
    });
  }

  async cancelUnsent(ownerKey: string, eventId: string): Promise<boolean> {
    if (!ownerKey) return false;
    return this.transaction('rw', this.events, async () => {
      const current = await this.events.get(eventId);
      if (!current || current.ownerKey !== ownerKey || current.status !== 'pending' || current.attempts !== 0) return false;
      await this.events.delete(eventId);
      return true;
    });
  }
}
