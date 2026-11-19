/**
 * ============================================================================
 * FILE: ADMIN/src/utils/chatSound.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Tiện ích phát âm thanh thông báo chuông "Ting!" sử dụng Web Audio API (Oscillator).
 * - Hoàn toàn không phụ thuộc file MP3 bên ngoài, không lo lỗi đường dẫn 404 hoặc CORS.
 * - Hỗ trợ lưu trữ trạng thái Bật / Tắt chuông báo trong localStorage.
 * ============================================================================
 */

const CHAT_SOUND_STORAGE_KEY = 'admin_chat_sound_enabled';

/**
 * Kiểm tra cấu hình âm thanh có đang được bật hay không.
 * Mặc định: true (Bật chuông)
 */
export function isChatSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(CHAT_SOUND_STORAGE_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

/**
 * Cập nhật cấu hình Bật / Tắt âm thanh
 */
export function setChatSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHAT_SOUND_STORAGE_KEY, String(enabled));
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioContextClass();
    }

    return sharedAudioContext;
  } catch {
    return null;
  }
}

/**
 * Phát âm thanh chuông "Ting!" nhẹ nhàng khi nhận tin nhắn mới từ khách hàng
 * Chuông hai âm: E5 (659.25Hz) trượt lên A5 (880Hz) với độ trễ giảm dần
 */
export function playNotificationChime(): void {
  if (!isChatSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
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
    console.debug('Không thể phát âm thanh chuông thông báo:', err);
  }
}

/**
 * Phát âm thanh thông báo khi có ca hỗ trợ mới (pending) cần tiếp nhận
 * Hợp âm 3 nốt: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz)
 */
export function playNewConversationAlert(): void {
  if (!isChatSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.08);
    osc.frequency.setValueAtTime(783.99, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  } catch (err) {
    console.debug('Không thể phát âm thanh thông báo ca mới:', err);
  }
}
