/**
 * JapaneseAudioPool - Quản lý âm thanh phát âm bằng Audio Buffer Pool
 * Giải quyết vấn đề rò rỉ bộ nhớ (Memory Leak) và kích hoạt Major GC khi gọi new Audio() liên tục.
 * Căn cứ: planning/06_PHASE_6_PERFORMANCE_OPTIMIZATION_AND_SRE.md (Mục 5.2)
 */

export class JapaneseAudioPool {
  private static instance: HTMLAudioElement | null = null;
  private static audioCache = new Map<string, HTMLAudioElement>();
  private static readonly MAX_CACHED_ELEMENTS = 10;

  /**
   * Khởi tạo hoặc lấy thể hiện Audio singleton dùng chung
   */
  private static getInstance(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    if (!this.instance) {
      try {
        this.instance = new Audio();
        this.instance.preload = 'auto';
      } catch (e) {
        console.warn('[JapaneseAudioPool] Không thể khởi tạo HTMLAudioElement:', e);
        return null;
      }
    }
    return this.instance;
  }

  /**
   * Phát âm thanh từ URL hoặc Blob với tái sử dụng thể hiện Audio
   * @param url Đường dẫn âm thanh (mp3, wav, ogg)
   */
  public static play(url: string): Promise<void> {
    return new Promise((resolve) => {
      const audio = this.getInstance();
      if (!audio) {
        resolve();
        return;
      }

      try {
        // Dừng âm thanh đang phát trước đó nếu có
        if (!audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }

        audio.src = url;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => resolve())
            .catch((err) => {
              // Xử lý an toàn khi trình duyệt chặn autoplay hoặc URL hỏng
              console.warn('[JapaneseAudioPool] Không thể phát âm thanh:', err.message);
              resolve();
            });
        } else {
          resolve();
        }
      } catch (err) {
        console.warn('[JapaneseAudioPool] Lỗi thực thi audio:', err);
        resolve();
      }
    });
  }

  /**
   * Nạp trước (Preload) âm thanh vào cache để giảm độ trễ khi lật thẻ
   */
  public static preload(url: string): void {
    if (typeof window === 'undefined') return;

    if (!this.audioCache.has(url)) {
      if (this.audioCache.size >= this.MAX_CACHED_ELEMENTS) {
        const firstKey = this.audioCache.keys().next().value;
        if (firstKey) {
          const oldAudio = this.audioCache.get(firstKey);
          if (oldAudio) {
            oldAudio.src = '';
          }
          this.audioCache.delete(firstKey);
        }
      }

      try {
        const preloaded = new Audio();
        preloaded.preload = 'auto';
        preloaded.src = url;
        this.audioCache.set(url, preloaded);
      } catch {
        // Bỏ qua lỗi trong môi trường không hỗ trợ Audio
      }
    }
  }

  /**
   * Giải phóng tài nguyên Audio Pool
   */
  public static clear(): void {
    if (this.instance) {
      this.instance.pause();
      this.instance.src = '';
      this.instance = null;
    }
    this.audioCache.forEach((a) => {
      a.pause();
      a.src = '';
    });
    this.audioCache.clear();
  }
}
