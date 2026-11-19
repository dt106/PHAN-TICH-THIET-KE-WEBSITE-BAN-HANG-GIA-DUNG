/**
 * ============================================================================
 * FILE: FRONT_END/src/utils/chatSound.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Phát âm thanh chuông báo "Ting!" nhẹ nhàng khi khách hàng nhận được tin nhắn
 *   từ tư vấn viên CSKH.
 * - Sử dụng Web Audio API Oscillator nguyên bản không cần nạp file mp3 ngoài,
 *   đảm bảo 100% không phụ thuộc đường dẫn, hoạt động an toàn và offline.
 * ============================================================================
 */

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === "closed") {
      sharedAudioContext = new AudioContextClass();
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Phát âm thanh chuông "Ting!" hai nốt nhẹ nhàng (E5 659.25Hz -> A5 880Hz)
 */
export function playNotificationChime(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.debug("Không thể phát âm thanh thông báo:", err);
  }
}
