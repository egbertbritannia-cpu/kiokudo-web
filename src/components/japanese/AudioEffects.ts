/**
 * Web Audio API Synthesizer & Japanese Speech Synthesis for SRS
 * Zero external audio files required - pure native browser synthesis!
 */

class JapaneseAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isSpeaking: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.isMuted = localStorage.getItem('japanese_srs_muted') === 'true';
      } catch {
        this.isMuted = false;
      }
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('japanese_srs_muted', muted ? 'true' : 'false');
        window.dispatchEvent(new CustomEvent('japanese_audio_mute_change', { detail: { muted } }));
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Mở khóa AudioContext khi người dùng tương tác lần đầu (BUG-AUD-01)
   */
  public unlockAudioContext() {
    if (typeof window === 'undefined') return;
    const ctx = this.getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  }

  /**
   * Tiếng gõ phách gỗ Hyoshigi (拍子木) của nghệ thuật kịch Kabuki
   * Tạo âm gõ gỗ đanh, sắc nét khi bấm nút hoặc đánh giá lại (Again)
   * Tự động ducking khi đang phát âm giọng nói (WBS-04.1)
   */
  playHyoshigi() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const duckFactor = this.isSpeaking ? 0.25 : 1.0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Note A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3 * duckFactor, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    } catch {
      // Audio not supported or blocked by policy
    }
  }

  /**
   * Tiếng chuông đền Thần đạo Suzu (鈴) ngân vang
   * Dùng khi hoàn thành mục tiêu ngày hoặc trả lời Good / Easy
   * Tự động ducking khi đang phát âm giọng nói (WBS-04.1)
   */
  playSuzuBell() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const duckFactor = this.isSpeaking ? 0.25 : 1.0;
      const freqs = [1760, 2640, 3520]; // Các họa âm thanh khiết của chuông đồng
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        const initialGain = (0.15 / (idx + 1)) * duckFactor;
        gain.gain.setValueAtTime(initialGain, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      });
    } catch {
      // Audio not supported
    }
  }

  /**
   * Tiếng gảy đàn tranh Koto (箏) theo điệu thức cổ Hirajoshi (平調子)
   * Tự động ducking khi đang phát âm giọng nói (WBS-04.1)
   */
  playKotoPluck() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const duckFactor = this.isSpeaking ? 0.25 : 1.0;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(580, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.25 * duckFactor, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.42);
    } catch {
      // Audio not supported
    }
  }

  /**
   * Âm thanh lật giấy xột xoạt Washi (和紙) khi trượt thẻ hoặc hoàn tác
   */
  playWashiPaper() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const bufferSize = Math.floor(ctx.sampleRate * 0.08);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio not supported
    }
  }

  /**
   * Phát âm tiếng Nhật tự nhiên thông qua Web Speech API (Dual Coding)
   * Đồng thời đồng bộ callback onEnd với giao diện và Sound Orchestrator Ducking (BUG-AUD-05, WBS-04.1)
   */
  speak(text: string, onEnd?: () => void) {
    if (this.isMuted) {
      if (onEnd) onEnd();
      return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    try {
      window.speechSynthesis.cancel(); // Dừng câu trước đó nếu đang đọc
      this.isSpeaking = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.88; // Tốc độ chuẩn cho người học tiếng Nhật
      utterance.pitch = 1.05; // Cao độ tự nhiên, rõ ràng

      const handleSpeechFinish = () => {
        this.isSpeaking = false;
        if (onEnd) onEnd();
      };

      utterance.onend = handleSpeechFinish;
      utterance.onerror = handleSpeechFinish;
      window.speechSynthesis.speak(utterance);
    } catch {
      this.isSpeaking = false;
      if (onEnd) onEnd();
    }
  }
}

export const japaneseAudio = new JapaneseAudioEngine();

// Tự động mở khóa AudioContext trên cử chỉ chạm/click đầu tiên (BUG-AUD-01)
if (typeof window !== 'undefined') {
  const unlock = () => {
    japaneseAudio.unlockAudioContext();
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('click', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('click', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}
