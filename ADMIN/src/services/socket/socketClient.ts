/**
 * ============================================================================
 * FILE: ADMIN/src/services/socket/socketClient.ts
 * ============================================================================
 * MỤC TIÊU:
 * - Singleton quản lý kết nối Socket.IO Client cho giao diện Quản trị (ADMIN).
 * - Kết nối tới URL Backend an toàn:
 *   + Hỗ trợ biến môi trường VITE_SOCKET_URL hoặc VITE_API_BASE_URL.
 *   + Mặc định fallback tới window.location.origin (qua Vite proxy) hoặc http://localhost:5001.
 * - Tự động đính kèm JWT token từ `authToken.get()` qua handshake auth.
 * - Cấu hình tự động kết nối lại (`reconnection: true`, `reconnectionDelay: 1000`).
 * - Đảm bảo an toàn (Fail-safe): Không làm gián đoạn hay crash app nếu server chưa bật hoặc rớt mạng.
 * ============================================================================
 */

import { io, Socket } from 'socket.io-client';
import { authToken } from '../api/httpClient';

let socketInstance: Socket | null = null;

/**
 * Xác định URL Backend phù hợp để kết nối Socket.IO
 */
export function resolveSocketUrl(): string {
  // 1. Ưu tiên biến cấu hình socket riêng nếu có
  const envSocketUrl = import.meta.env.VITE_SOCKET_URL;
  if (envSocketUrl && typeof envSocketUrl === 'string') {
    return envSocketUrl.replace(/\/+$/, '');
  }

  // 2. Kiểm tra VITE_API_BASE_URL
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl && typeof envApiUrl === 'string' && envApiUrl.startsWith('http')) {
    try {
      const parsed = new URL(envApiUrl);
      return parsed.origin;
    } catch {
      return envApiUrl.replace(/\/+$/, '');
    }
  }

  // 3. Fallback tới window.location.origin nếu chạy trên trình duyệt (được Vite proxy chuyển tiếp)
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  // 4. Mặc định cho môi trường phát triển cục bộ
  return 'http://localhost:5000';
}

/**
 * Lấy hoặc khởi tạo singleton Socket.IO instance
 */
export function getSocket(): Socket {
  if (!socketInstance) {
    const socketUrl = resolveSocketUrl();

    socketInstance = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
      // Hàm auth động luôn lấy token mới nhất từ localStorage/sessionStorage
      auth: (cb) => {
        const token = authToken.get() || '';
        cb({ token });
      },
    });

    socketInstance.on('connect', () => {
      console.log(
        `⚡ [AdminSocket] Kết nối Socket.IO thành công (id=${socketInstance?.id}) tới ${socketUrl}`
      );
    });

    socketInstance.on('connect_error', (error) => {
      console.warn('⚠️ [AdminSocket] Lỗi kết nối Socket.IO:', error.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('⚡ [AdminSocket] Đã ngắt kết nối Socket.IO:', reason);
    });

    socketInstance.on('reconnect', (attempt) => {
      console.log(`⚡ [AdminSocket] Kết nối lại Socket.IO thành công sau ${attempt} lần thử`);
    });

    if (typeof window !== 'undefined') {
      (window as any).__adminSocket = socketInstance;
    }
  }

  return socketInstance;
}

/**
 * Kích hoạt kết nối Socket.IO với token hiện tại
 */
export function connectSocket(): Socket {
  const socket = getSocket();
  const token = authToken.get();

  if (token) {
    socket.auth = { token };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

/**
 * Ngắt kết nối Socket.IO
 */
export function disconnectSocket(): void {
  if (socketInstance && socketInstance.connected) {
    socketInstance.disconnect();
  }
}

/**
 * Kiểm tra trạng thái kết nối hiện tại
 */
export function isSocketConnected(): boolean {
  return !!socketInstance?.connected;
}

export default {
  resolveSocketUrl,
  getSocket,
  connectSocket,
  disconnectSocket,
  isSocketConnected,
};
