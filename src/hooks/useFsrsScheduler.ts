'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { FSRS, generatorParameters, type Card, type RecordLog } from 'ts-fsrs';
import type { FsrsWorkerRequest, FsrsWorkerResponse } from '@/workers/fsrs.worker';

interface RequestHandler {
  resolve: (result: RecordLog) => void;
  reject: (err: any) => void;
  card: Card;
  now: number;
}

/**
 * useFsrsScheduler Hook
 * Cung cấp cầu nối bất đồng bộ giữa React Component và FSRS Web Worker:
 * - Tự động khởi tạo và dọn dẹp Web Worker
 * - Cơ chế fallback tự động về Main Thread nếu môi trường không hỗ trợ Web Worker (SSR/Test) hoặc khi Worker lỗi (BUG-FSRS-03)
 * - Tối ưu hóa INP < 25ms khi người dùng chấm điểm thẻ (Again, Hard, Good, Easy)
 */
export function useFsrsScheduler() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequests = useRef<Map<string, RequestHandler>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const fallbackFsrsRef = useRef<FSRS | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      fallbackFsrsRef.current = new FSRS(generatorParameters());
      setIsReady(true);
      return;
    }

    try {
      const worker = new Worker(
        new URL('../workers/fsrs.worker.ts', import.meta.url),
        { type: 'module' }
      );

      worker.onmessage = (event: MessageEvent<FsrsWorkerResponse>) => {
        const { id, nextStates, error } = event.data;
        const handler = pendingRequests.current.get(id);
        if (handler) {
          pendingRequests.current.delete(id);
          if (!error && nextStates) {
            handler.resolve(nextStates);
          } else {
            console.warn('[FSRS Worker Message Error, falling back to main thread]', error);
            try {
              if (!fallbackFsrsRef.current) {
                fallbackFsrsRef.current = new FSRS(generatorParameters());
              }
              const result = fallbackFsrsRef.current.repeat(handler.card, new Date(handler.now));
              handler.resolve(result);
            } catch (fbErr) {
              handler.reject(fbErr);
            }
          }
        }
      };

      worker.onerror = (err) => {
        console.warn('[FSRS Worker Error, falling back to main thread]', err);
        if (!fallbackFsrsRef.current) {
          fallbackFsrsRef.current = new FSRS(generatorParameters());
        }
        for (const [, handler] of pendingRequests.current.entries()) {
          try {
            const result = fallbackFsrsRef.current.repeat(handler.card, new Date(handler.now));
            handler.resolve(result);
          } catch (fbErr) {
            handler.reject(fbErr);
          }
        }
        pendingRequests.current.clear();
      };

      workerRef.current = worker;
      setIsReady(true);

      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch (e) {
      console.warn('[FSRS Worker Init Failed, falling back to main thread]', e);
      fallbackFsrsRef.current = new FSRS(generatorParameters());
      setIsReady(true);
    }
  }, []);

  const calculateNextReview = useCallback(
    (card: Card, now: number = Date.now()): Promise<RecordLog> => {
      return new Promise((resolve, reject) => {
        if (workerRef.current) {
          const requestId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random()}`;

          pendingRequests.current.set(requestId, { resolve, reject, card, now });

          workerRef.current.postMessage({
            id: requestId,
            card,
            now,
          } as FsrsWorkerRequest);

          // Timeout an toàn 3s ngăn ngừa treo Promise vĩnh viễn (BUG-FSRS-03)
          setTimeout(() => {
            const handler = pendingRequests.current.get(requestId);
            if (handler) {
              pendingRequests.current.delete(requestId);
              try {
                if (!fallbackFsrsRef.current) {
                  fallbackFsrsRef.current = new FSRS(generatorParameters());
                }
                const result = fallbackFsrsRef.current.repeat(card, new Date(now));
                handler.resolve(result);
              } catch (err) {
                handler.reject(err);
              }
            }
          }, 3000);
        } else {
          try {
            if (!fallbackFsrsRef.current) {
              fallbackFsrsRef.current = new FSRS(generatorParameters());
            }
            const result = fallbackFsrsRef.current.repeat(card, new Date(now));
            resolve(result);
          } catch (err) {
            reject(err);
          }
        }
      });
    },
    []
  );

  return { calculateNextReview, isReady };
}
