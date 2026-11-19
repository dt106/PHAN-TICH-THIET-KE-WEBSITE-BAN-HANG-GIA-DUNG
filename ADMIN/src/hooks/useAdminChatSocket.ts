/**
 * ============================================================================
 * FILE: ADMIN/src/hooks/useAdminChatSocket.ts
 * ============================================================================
 * MỤC TIÊU:
 * - React Hook quản lý Socket.IO Client dành cho màn hình Quản lý hội thoại CSKH (ADMIN).
 * - Tự động kết nối, quản lý trạng thái `isConnected`.
 * - Lắng nghe 4 sự kiện Real-Time:
 *   1. `new_message`: Thêm tin nhắn mới vào `messages` nếu đúng ca đang mở (không trùng lặp).
 *   2. `conversation_updated`: Cập nhật preview, badge unread, thời gian và đẩy ca lên đầu danh sách `conversations`.
 *   3. `kpi_updated`: Cập nhật trực tiếp 4 thẻ KPI Dashboard (total, open, pending, unread).
 *   4. `conversation_status_changed`: Cập nhật trạng thái `status` ca chat (đóng/mở).
 * - Tự động `join_conversation` khi chọn một ca chat và `leave_conversation` khi chuyển ca hoặc unmount.
 * - An toàn (Fail-safe): Tự động vô hiệu hóa khi ở chế độ fallback hoặc khi socket ngắt kết nối.
 * ============================================================================
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, connectSocket, isSocketConnected } from '../services/socket/socketClient';
import { playNotificationChime, playNewConversationAlert } from '../utils/chatSound';
import type {
  ConversationListItem,
  ConversationSenderRole,
  ConversationStatus,
  MessageType,
  MessageView,
} from '../types/conversation.types';

export interface KpiStats {
  total: number;
  open: number;
  pending: number;
  unread: number;
}

export interface SocketMessagePayload {
  id?: string | number;
  _id?: string | number;
  conversation_id?: string | number;
  conversationId?: string | number;
  sender_id?: string | number;
  senderId?: string | number;
  sender_name?: string;
  senderName?: string;
  sender_role?: string;
  senderRole?: string;
  message_type?: string;
  messageType?: string;
  content?: string | null;
  attachments?: string | null;
  is_read?: boolean;
  isRead?: boolean;
  read_at?: string | null;
  readAt?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface SocketConversationPayload {
  id?: string | number;
  _id?: string | number;
  customer_id?: string | number;
  customerId?: string | number;
  customer_name?: string;
  customerName?: string;
  customer_email?: string;
  customerEmail?: string;
  customer_avatar?: string | null;
  customerAvatar?: string | null;
  assigned_admin_id?: string | number | null;
  assignedAdminId?: string | number | null;
  assigned_admin_name?: string | null;
  assignedAdminName?: string | null;
  subject?: string | null;
  status?: string;
  last_message_at?: string | null;
  lastMessageAt?: string | null;
  last_message_preview?: string | null;
  lastMessagePreview?: string | null;
  customer_unread_count?: number;
  customerUnreadCount?: number;
  admin_unread_count?: number;
  adminUnreadCount?: number;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface SocketKpiPayload {
  total?: number;
  open?: number;
  pending?: number;
  unread?: number;
  [key: string]: unknown;
}

export interface SocketStatusChangePayload {
  conversationId?: string | number;
  id?: string | number;
  status?: string;
  timestamp?: string;
}

export interface SocketUserTypingPayload {
  userId: string | number;
  userName?: string;
  role?: string;
  conversationId?: string | number;
  isTyping: boolean;
}

export interface PartnerTypingState {
  isTyping: boolean;
  userName: string;
  conversationId: string;
}

export interface UseAdminChatSocketOptions {
  selectedId: string | number | null;
  setMessages: React.Dispatch<React.SetStateAction<MessageView[]>>;
  setConversations: React.Dispatch<React.SetStateAction<ConversationListItem[]>>;
  setKpiStats: React.Dispatch<React.SetStateAction<KpiStats>>;
  isFallback?: boolean;
}

export interface UseAdminChatSocketReturn {
  isConnected: boolean;
  socket: Socket | null;
  joinConversation: (conversationId: string | number) => void;
  leaveConversation: (conversationId: string | number) => void;
  partnerTyping: PartnerTypingState | null;
  sendTypingStart: (conversationId: string | number) => void;
  sendTypingStop: (conversationId: string | number) => void;
}

export function useAdminChatSocket({
  selectedId,
  setMessages,
  setConversations,
  setKpiStats,
  isFallback = false,
}: UseAdminChatSocketOptions): UseAdminChatSocketReturn {
  const [isConnected, setIsConnected] = useState<boolean>(() => !isFallback && isSocketConnected());
  const [partnerTyping, setPartnerTyping] = useState<PartnerTypingState | null>(null);

  // Dùng refs được cập nhật trong useEffect để tránh render violation
  const selectedIdRef = useRef<string | number | null>(selectedId);
  const isFallbackRef = useRef<boolean>(isFallback);
  const previousSelectedIdRef = useRef<string | number | null>(null);
  const partnerTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    selectedIdRef.current = selectedId;
    // Đổi ca hội thoại -> reset trạng thái đối tác đang gõ
    setPartnerTyping(null);
    if (partnerTypingTimerRef.current) {
      clearTimeout(partnerTypingTimerRef.current);
    }
  }, [selectedId]);

  useEffect(() => {
    isFallbackRef.current = isFallback;
  }, [isFallback]);

  // ==========================================================================
  // HÀM TIỆN ÍCH JOIN / LEAVE ROOM THỦ CÔNG & EMIT TYPING
  // ==========================================================================
  const joinConversation = useCallback((conversationId: string | number) => {
    const socket = getSocket();
    if (socket.connected && conversationId) {
      socket.emit('join_conversation', {
        conversationId: String(conversationId),
      });
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string | number) => {
    const socket = getSocket();
    if (socket.connected && conversationId) {
      socket.emit('leave_conversation', {
        conversationId: String(conversationId),
      });
    }
  }, []);

  const sendTypingStart = useCallback((conversationId: string | number) => {
    const socket = getSocket();
    if (socket.connected && conversationId) {
      socket.emit('typing_start', {
        conversationId: String(conversationId),
      });
    }
  }, []);

  const sendTypingStop = useCallback((conversationId: string | number) => {
    const socket = getSocket();
    if (socket.connected && conversationId) {
      socket.emit('typing_stop', {
        conversationId: String(conversationId),
      });
    }
  }, []);

  // ==========================================================================
  // XỬ LÝ SỰ KIỆN: join_conversation & leave_conversation KHI ĐỔI CA
  // ==========================================================================
  useEffect(() => {
    if (isFallback) return;

    const socket = getSocket();
    const prevId = previousSelectedIdRef.current;

    if (socket.connected) {
      // Rời khỏi phòng cũ nếu có
      if (prevId !== null && String(prevId) !== String(selectedId)) {
        socket.emit('leave_conversation', {
          conversationId: String(prevId),
        });
      }

      // Tham gia phòng mới
      if (selectedId !== null) {
        socket.emit('join_conversation', {
          conversationId: String(selectedId),
        });
      }
    }

    previousSelectedIdRef.current = selectedId;
  }, [selectedId, isFallback]);

  // ==========================================================================
  // ĐĂNG KÝ CÁC SỰ KIỆN SOCKET.IO
  // ==========================================================================
  useEffect(() => {
    if (isFallback) {
      queueMicrotask(() => {
        setIsConnected(false);
      });
      return;
    }

    const socket = connectSocket();

    // 1. Quản lý trạng thái kết nối
    const handleConnect = () => {
      setIsConnected(true);
      if (selectedIdRef.current !== null) {
        socket.emit('join_conversation', {
          conversationId: String(selectedIdRef.current),
        });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    // Nếu socket đã kết nối từ trước, đồng bộ trạng thái qua microtask
    if (socket.connected) {
      queueMicrotask(() => {
        setIsConnected(true);
      });
      if (selectedIdRef.current !== null) {
        socket.emit('join_conversation', {
          conversationId: String(selectedIdRef.current),
        });
      }
    }

    // 2. Sự kiện: new_message
    const handleNewMessage = (rawMessage: SocketMessagePayload) => {
      if (isFallbackRef.current || !rawMessage) return;

      const currentSelectedId = selectedIdRef.current;
      const rawConvId =
        rawMessage.conversation_id || rawMessage.conversationId;

      const validConvId = rawConvId !== undefined ? rawConvId : '';
      const validId = rawMessage.id !== undefined ? rawMessage.id : (rawMessage._id ?? '');
      const validSenderId = rawMessage.sender_id !== undefined ? rawMessage.sender_id : (rawMessage.senderId ?? '');

      const formattedMessage: MessageView = {
        id: validId,
        conversation_id: validConvId,
        sender_id: validSenderId,
        sender_name:
          rawMessage.sender_name || rawMessage.senderName || 'Người dùng',
        sender_role: (rawMessage.sender_role ||
          rawMessage.senderRole ||
          'customer') as ConversationSenderRole,
        message_type: (rawMessage.message_type ||
          rawMessage.messageType ||
          'text') as MessageType,
        content: rawMessage.content ?? '',
        attachments: rawMessage.attachments || null,
        is_read: Boolean(rawMessage.is_read || rawMessage.isRead),
        read_at: rawMessage.read_at || rawMessage.readAt || null,
        created_at:
          rawMessage.created_at ||
          rawMessage.createdAt ||
          new Date().toISOString(),
        updated_at:
          rawMessage.updated_at ||
          rawMessage.updatedAt ||
          new Date().toISOString(),
      };

      // Nếu tin nhắn đến từ khách hàng, phát âm thanh chuông Ting!
      if (formattedMessage.sender_role === 'customer') {
        playNotificationChime();
      }

      // Nếu tin nhắn thuộc ca đang được chọn -> thêm vào messages
      if (
        currentSelectedId !== null &&
        String(formattedMessage.conversation_id) === String(currentSelectedId)
      ) {
        // Tắt chỉ báo đang gõ khi đã nhận tin nhắn mới
        setPartnerTyping(null);
        if (partnerTypingTimerRef.current) {
          clearTimeout(partnerTypingTimerRef.current);
        }

        setMessages((current) => {
          // Tránh thêm trùng lặp nếu đã tồn tại
          if (
            current.some((msg) => String(msg.id) === String(formattedMessage.id))
          ) {
            return current;
          }
          return [...current, formattedMessage];
        });
      }
    };

    // 3. Sự kiện: conversation_updated
    const handleConversationUpdated = (updatedConv: SocketConversationPayload) => {
      if (isFallbackRef.current || !updatedConv) return;

      const convId = updatedConv.id || updatedConv._id;
      if (!convId) return;

      const currentSelectedId = selectedIdRef.current;
      const isCurrentlyViewing =
        currentSelectedId !== null && String(currentSelectedId) === String(convId);

      setConversations((current) => {
        const existingIndex = current.findIndex(
          (item) => String(item.id) === String(convId),
        );

        if (existingIndex !== -1) {
          const existing = current[existingIndex];
          // Nếu ca cũ vừa chuyển thành pending, phát chuông báo ca mới
          if (updatedConv.status === 'pending' && existing.status !== 'pending') {
            playNewConversationAlert();
          }

          const merged: ConversationListItem = {
            ...existing,
            ...updatedConv,
            id: existing.id,
            customer_id:
              updatedConv.customer_id ||
              updatedConv.customerId ||
              existing.customer_id,
            customer_name:
              updatedConv.customer_name ||
              updatedConv.customerName ||
              existing.customer_name,
            customer_email:
              updatedConv.customer_email ||
              updatedConv.customerEmail ||
              existing.customer_email,
            customer_avatar:
              updatedConv.customer_avatar !== undefined
                ? updatedConv.customer_avatar
                : updatedConv.customerAvatar !== undefined
                  ? updatedConv.customerAvatar
                  : existing.customer_avatar,
            assigned_admin_id:
              updatedConv.assigned_admin_id !== undefined
                ? updatedConv.assigned_admin_id
                : updatedConv.assignedAdminId !== undefined
                  ? updatedConv.assignedAdminId
                  : existing.assigned_admin_id,
            assigned_admin_name:
              updatedConv.assigned_admin_name !== undefined
                ? updatedConv.assigned_admin_name
                : updatedConv.assignedAdminName !== undefined
                  ? updatedConv.assignedAdminName
                  : existing.assigned_admin_name,
            subject:
              updatedConv.subject !== undefined
                ? updatedConv.subject
                : existing.subject,
            last_message_preview:
              updatedConv.last_message_preview ??
              updatedConv.lastMessagePreview ??
              existing.last_message_preview,
            last_message_at:
              updatedConv.last_message_at ??
              updatedConv.lastMessageAt ??
              new Date().toISOString(),
            customer_unread_count:
              updatedConv.customer_unread_count ??
              updatedConv.customerUnreadCount ??
              existing.customer_unread_count,
            admin_unread_count: isCurrentlyViewing
              ? 0
              : typeof updatedConv.admin_unread_count === 'number'
                ? updatedConv.admin_unread_count
                : typeof updatedConv.adminUnreadCount === 'number'
                  ? updatedConv.adminUnreadCount
                  : existing.admin_unread_count + 1,
            status:
              (updatedConv.status as ConversationStatus) || existing.status,
            created_at:
              updatedConv.created_at ||
              updatedConv.createdAt ||
              existing.created_at,
            updated_at:
              updatedConv.updated_at ??
              updatedConv.updatedAt ??
              new Date().toISOString(),
          };

          // Đẩy ca này lên đầu danh sách
          const rest = current.filter((_, idx) => idx !== existingIndex);
          return [merged, ...rest];
        } else {
          // Ca hội thoại mới toanh chưa có trong state -> phát chuông báo ca mới
          playNewConversationAlert();

          const newItem: ConversationListItem = {
            id: convId,
            customer_id:
              updatedConv.customer_id || updatedConv.customerId || '',
            customer_name:
              updatedConv.customer_name ||
              updatedConv.customerName ||
              'Khách hàng',
            customer_email:
              updatedConv.customer_email || updatedConv.customerEmail || '',
            customer_avatar:
              updatedConv.customer_avatar ||
              updatedConv.customerAvatar ||
              null,
            assigned_admin_id:
              updatedConv.assigned_admin_id ||
              updatedConv.assignedAdminId ||
              null,
            assigned_admin_name:
              updatedConv.assigned_admin_name ||
              updatedConv.assignedAdminName ||
              null,
            subject: updatedConv.subject || 'Hỗ trợ khách hàng',
            status: (updatedConv.status as ConversationStatus) || 'pending',
            last_message_at:
              updatedConv.last_message_at ||
              updatedConv.lastMessageAt ||
              new Date().toISOString(),
            last_message_preview:
              updatedConv.last_message_preview ||
              updatedConv.lastMessagePreview ||
              null,
            customer_unread_count:
              updatedConv.customer_unread_count || 0,
            admin_unread_count: isCurrentlyViewing
              ? 0
              : (updatedConv.admin_unread_count ??
                updatedConv.adminUnreadCount ??
                1),
            created_at:
              updatedConv.created_at ||
              updatedConv.createdAt ||
              new Date().toISOString(),
            updated_at:
              updatedConv.updated_at ||
              updatedConv.updatedAt ||
              new Date().toISOString(),
          };
          return [newItem, ...current];
        }
      });
    };

    // 4. Sự kiện: kpi_updated
    const handleKpiUpdated = (stats: SocketKpiPayload) => {
      if (isFallbackRef.current || !stats) return;

      setKpiStats((prev) => ({
        total: typeof stats.total === 'number' ? stats.total : prev.total,
        open: typeof stats.open === 'number' ? stats.open : prev.open,
        pending: typeof stats.pending === 'number' ? stats.pending : prev.pending,
        unread: typeof stats.unread === 'number' ? stats.unread : prev.unread,
      }));
    };

    // 5. Sự kiện: conversation_status_changed
    const handleConversationStatusChanged = (payload: SocketStatusChangePayload) => {
      if (isFallbackRef.current || !payload) return;

      const convId = payload.conversationId || payload.id;
      const newStatus = payload.status as ConversationStatus;
      if (!convId || !newStatus) return;

      setConversations((current) =>
        current.map((item) =>
          String(item.id) === String(convId)
            ? {
                ...item,
                status: newStatus,
                updated_at: payload.timestamp || new Date().toISOString(),
              }
            : item,
        ),
      );
    };

    // 6. Sự kiện: user_typing (Chỉ báo đối tác đang gõ phím)
    const handleUserTyping = (payload: SocketUserTypingPayload) => {
      if (isFallbackRef.current || !payload) return;

      const currentSelectedId = selectedIdRef.current;
      const convId = payload.conversationId;

      // Chỉ hiển thị typing nếu đúng là cuộc hội thoại đang xem
      if (
        !currentSelectedId ||
        !convId ||
        String(convId) !== String(currentSelectedId)
      ) {
        return;
      }

      if (payload.isTyping) {
        setPartnerTyping({
          isTyping: true,
          userName: payload.userName || 'Khách hàng',
          conversationId: String(convId),
        });

        if (partnerTypingTimerRef.current) {
          clearTimeout(partnerTypingTimerRef.current);
        }

        // Tự động hết hạn trạng thái typing sau 3500ms để tránh treo hiệu ứng
        partnerTypingTimerRef.current = setTimeout(() => {
          setPartnerTyping(null);
        }, 3500);
      } else {
        setPartnerTyping(null);
        if (partnerTypingTimerRef.current) {
          clearTimeout(partnerTypingTimerRef.current);
        }
      }
    };

    // Gắn listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('kpi_updated', handleKpiUpdated);
    socket.on('conversation_status_changed', handleConversationStatusChanged);
    socket.on('user_typing', handleUserTyping);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('kpi_updated', handleKpiUpdated);
      socket.off('conversation_status_changed', handleConversationStatusChanged);
      socket.off('user_typing', handleUserTyping);

      if (partnerTypingTimerRef.current) {
        clearTimeout(partnerTypingTimerRef.current);
      }

      // Rời khỏi phòng hiện tại khi hook unmount
      if (selectedIdRef.current !== null && socket.connected) {
        socket.emit('leave_conversation', {
          conversationId: String(selectedIdRef.current),
        });
      }
    };
  }, [isFallback, setMessages, setConversations, setKpiStats]);

  return {
    isConnected,
    socket: getSocket(),
    joinConversation,
    leaveConversation,
    partnerTyping,
    sendTypingStart,
    sendTypingStop,
  };
}

export default useAdminChatSocket;
