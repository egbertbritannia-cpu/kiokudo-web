import {
  prepareReviewEvent, replayOwner, type ReviewRating, type ReviewOutboxEvent,
  type ReviewSender,
} from './fsrs-review-outbox';
import { IndexedDbReviewOutbox } from './fsrs-review-outbox-idb';

const CACHE_KEY = 'kiokudo_active_owner_key_v1';
const endpoint = '/api/backend/api/v1/reviews';
const store = () => new IndexedDbReviewOutbox();

/**
 * A local owner key only separates offline records. Never treat it as proof
 * of authorization; Core verifies a signed server session on every request.
 */
export async function activeReviewOwner(): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/session', { cache:'no-store', credentials:'same-origin' });
    if (res.status === 401 || !res.ok) return null;
    const body: unknown = await res.json();
    if (!body || typeof body !== 'object') return null;
    const value = (body as Record<string,unknown>).ownerKey;
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{3,64}$/.test(value)) return null;
    if (typeof window !== 'undefined') localStorage.setItem(CACHE_KEY,value);
    return value;
  } catch {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      const key = localStorage.getItem(CACHE_KEY);
      return key && /^[A-Za-z0-9_-]{3,64}$/.test(key) ? key : null;
    }
    return null;
  }
}

export async function stageReview(
  ownerKey:string, cardId:string, rating:ReviewRating, responseTimeMs:number,
):Promise<ReviewOutboxEvent> {
  if(!ownerKey || !cardId) throw new Error('owner_or_card_missing');
  const event=prepareReviewEvent({ownerKey,cardId,rating,responseTimeMs});
  const db=store();
  try { await db.enqueue(event);return event; }
  finally { db.close(); }
}

export async function pendingReviewCount(ownerKey:string):Promise<number>{
  const db=store();
  try{
    return (await db.list(ownerKey)).filter(x=>x.status!=='acknowledged').length;
  }finally{db.close()}
}

export async function cancelNeverSentReview(ownerKey:string,eventId:string):Promise<boolean>{
  const db=store();
  try{return await db.cancelUnsent(ownerKey,eventId)}
  finally{db.close()}
}

const sendReview:ReviewSender=async body=>{
  const res=await fetch(endpoint,{
    method:'POST',cache:'no-store',credentials:'same-origin',
    headers:{'content-type':'application/json'},
    body:JSON.stringify(body),
  });
  let json:unknown=null;
  try{json=await res.json()}catch{}
  return {httpStatus:res.status,body:json};
};

/** Never send unless the live owner session matches the offline partition. */
export async function replayStoredReviews(ownerKey:string):
  Promise<{acknowledged:number;stoppedAt?:string;outcome?:string}> {
  if(typeof navigator==='undefined'||!navigator.onLine)return {acknowledged:0,outcome:'offline'};
  // Re-authenticate online: a stale localStorage key cannot authorize replay.
  const verified=await activeReviewOwner();
  if(!verified||verified!==ownerKey)return {acknowledged:0,outcome:'blocked_auth'};
  const db=store();
  try {
    if (typeof navigator!=='undefined'&&navigator.locks) {
      return await navigator.locks.request('kiokudo-v2-fsrs-replay',async()=>
        replayOwner(db,ownerKey,sendReview));
    }
    return await replayOwner(db,ownerKey,sendReview);
  }finally{db.close()}
}
