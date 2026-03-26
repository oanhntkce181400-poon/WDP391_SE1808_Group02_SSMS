import { useEffect, useMemo, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import announcementService from '../services/announcementService';

const NOTIFICATIONS_STORAGE_KEY = 'student_notifications';
const ANNOUNCEMENT_IDS_STORAGE_KEY = 'student_seen_announcement_ids';
const MAX_NOTIFICATIONS = 20;
const ANNOUNCEMENT_POLL_INTERVAL_MS = 10000;
export const STUDENT_LOCAL_NOTIFICATION_EVENT = 'student-local-notification';

const CATEGORY_LABELS = {
  hoc_vu: 'Học vụ',
  tai_chinh: 'Tài chính',
  su_kien: 'Sự kiện',
  khac: 'Khác',
  announcement: 'Thông báo',
  general: 'Thông báo',
  notification: 'Thông báo',
  'registration-period': 'Đăng ký',
  'request-created': 'Đơn từ',
  'student-request-status': 'Đơn từ',
};

function readJsonStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors to keep notifications non-blocking.
  }
}

function buildNotificationItem(payload = {}) {
  const sourceId = payload.sourceId || payload.period?._id || payload.period?.id || payload.request?._id || null;
  const sourceType = payload.sourceType || payload.type || 'general';

  return {
    id: payload.id || `${payload.type || 'notification'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: payload.title || 'Thong bao moi',
    message: payload.message || 'Ban co thong bao moi.',
    type: payload.type || 'general',
    typeLabel: payload.typeLabel || CATEGORY_LABELS[payload.type] || 'Thông báo',
    timestamp: payload.timestamp || new Date().toISOString(),
    isRead: Boolean(payload.isRead),
    request: payload.request || null,
    period: payload.period || null,
    sourceId,
    sourceType,
    dedupeKey: payload.dedupeKey || null,
  };
}

function isDuplicateNotification(prevNotifications, nextItem) {
  return prevNotifications.some((item) => {
    if (item.id === nextItem.id) return true;
    if (nextItem.dedupeKey && item.dedupeKey === nextItem.dedupeKey) return true;
    return false;
  });
}

function showBrowserNotification(title, message) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  new Notification(title, {
    body: message,
    tag: 'student-realtime-notification',
  });
}

function stripHtml(content = '') {
  return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildAnnouncementNotification(announcement = {}) {
  const sourceId = announcement._id || announcement.id;
  const plainContent = stripHtml(announcement.content || '');
  const category = announcement.category || 'announcement';

  return buildNotificationItem({
    id: `announcement-${sourceId}`,
    dedupeKey: `announcement:${sourceId}`,
    title: announcement.title || 'Thong bao moi',
    message: plainContent
      ? plainContent.slice(0, 120) + (plainContent.length > 120 ? '...' : '')
      : 'Co tin tuc moi vua duoc dang.',
    type: category,
    typeLabel: CATEGORY_LABELS[category] || 'Thông báo',
    timestamp: announcement.createdAt || announcement.updatedAt || new Date().toISOString(),
    sourceId,
    sourceType: 'announcement',
  });
}

function buildRegistrationPeriodSocketNotification(eventData = {}) {
  const period = eventData.period || eventData.currentPeriod || null;
  const periodId = period?._id || period?.id || 'unknown';
  const action = eventData.action || 'updated';
  const status = period?.status;
  const periodName = period?.periodName || 'mới';
  const timestamp = eventData.timestamp || new Date().toISOString();

  let message = `Đợt đăng ký "${periodName}" vừa được cập nhật.`;

  if (action === 'created') {
    message = `Đã tạo đợt đăng ký mới: "${periodName}".`;
  } else if (action === 'status-updated') {
    if (status === 'active') {
      message = `Đợt đăng ký "${periodName}" đã mở.`;
    } else if (status === 'closed') {
      message = `Đợt đăng ký "${periodName}" đã đóng.`;
    } else if (status === 'cancelled') {
      message = `Đợt đăng ký "${periodName}" đã hủy.`;
    } else if (status === 'upcoming') {
      message = `Đợt đăng ký "${periodName}" đã chuyển sang trạng thái sắp mở.`;
    }
  }

  return buildNotificationItem({
    id: `registration-period-${periodId}-${action}-${timestamp}`,
    dedupeKey: `registration-period:${periodId}:${action}:${status || 'unknown'}`,
    title: 'Thông báo đợt đăng ký',
    message,
    type: 'registration-period',
    typeLabel: CATEGORY_LABELS['registration-period'],
    period,
    sourceType: 'registration-period',
    sourceId: periodId,
    timestamp,
  });
}

function buildStudentRequestStatusSocketNotification(eventData = {}) {
  const request = eventData.request || null;
  const requestId = request?._id || request?.id || eventData.sourceId || 'unknown';
  const requestType = request?.requestType || 'Đơn từ';
  const status = request?.status || 'updated';
  const timestamp = eventData.timestamp || request?.updatedAt || new Date().toISOString();
  const updateStamp = request?.updatedAt
    ? new Date(request.updatedAt).toISOString()
    : new Date(timestamp).toISOString();

  let message = `Đơn "${requestType}" của bạn đã được cập nhật.`;
  if (status === 'Approved') message = `Đơn "${requestType}" của bạn đã được duyệt.`;
  if (status === 'Rejected') message = `Đơn "${requestType}" của bạn đã bị từ chối.`;
  if (status === 'Processing') message = `Đơn "${requestType}" của bạn đang được xử lý.`;

  return buildNotificationItem({
    id: eventData.id || `student-request-status-${requestId}-${status}-${updateStamp}`,
    dedupeKey: eventData.dedupeKey || `student-request-status:${requestId}:${status}:${updateStamp}`,
    title: eventData.title || 'Thông báo xử lý đơn',
    message: eventData.message || message,
    type: 'student-request-status',
    typeLabel: CATEGORY_LABELS['student-request-status'],
    request,
    sourceType: 'request',
    sourceId: requestId,
    timestamp,
  });
}

function mergeAnnouncementNotifications(prevNotifications, announcements) {
  const announcementMap = new Map(
    announcements.map((item) => {
      const sourceId = item?._id || item?.id;
      return [sourceId, buildAnnouncementNotification(item)];
    }),
  );

  return prevNotifications.map((item) => {
    if (item.sourceType !== 'announcement' || !item.sourceId) return item;
    const nextAnnouncement = announcementMap.get(item.sourceId);
    if (!nextAnnouncement) return item;

    return {
      ...nextAnnouncement,
      isRead: item.isRead,
    };
  });
}

export default function useStudentRealtimeNotifications() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState(() =>
    readJsonStorage(NOTIFICATIONS_STORAGE_KEY, []).map((item) => buildNotificationItem(item)),
  );
  const [toast, setToast] = useState(null);
  const [registrationBanner, setRegistrationBanner] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    writeJsonStorage(NOTIFICATIONS_STORAGE_KEY, notifications);
  }, [notifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (payload) => {
      const nextItem = buildNotificationItem(payload);

      setNotifications((prev) => {
        if (isDuplicateNotification(prev, nextItem)) return prev;

        return [nextItem, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
      setToast(nextItem);
      showBrowserNotification(nextItem.title, nextItem.message);

      if (payload?.type === 'registration-period') {
        setRegistrationBanner({
          title: nextItem.title,
          message: nextItem.message,
          timestamp: nextItem.timestamp,
        });
      }
    };

    const handleRegistrationPeriodUpdated = (payload) => {
      const nextItem = buildRegistrationPeriodSocketNotification(payload);

      setNotifications((prev) => {
        if (isDuplicateNotification(prev, nextItem)) return prev;

        return [nextItem, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
      setToast(nextItem);
      showBrowserNotification(nextItem.title, nextItem.message);
      setRegistrationBanner({
        title: nextItem.title,
        message: nextItem.message,
        timestamp: nextItem.timestamp,
      });
    };

    const handleStudentRequestStatusUpdated = (payload) => {
      const nextItem = buildStudentRequestStatusSocketNotification(payload);

      setNotifications((prev) => {
        if (isDuplicateNotification(prev, nextItem)) return prev;
        return [nextItem, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
      setToast(nextItem);
      showBrowserNotification(nextItem.title, nextItem.message);
    };

    socket.on('notification', handleNotification);
    socket.on('registration-period-updated', handleRegistrationPeriodUpdated);
    socket.on('student-request-status-updated', handleStudentRequestStatusUpdated);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('registration-period-updated', handleRegistrationPeriodUpdated);
      socket.off('student-request-status-updated', handleStudentRequestStatusUpdated);
    };
  }, [socket]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleLocalNotification = (event) => {
      const payload = event?.detail;
      if (!payload) return;

      const nextItem = buildNotificationItem(payload);

      setNotifications((prev) => {
        if (isDuplicateNotification(prev, nextItem)) return prev;

        return [nextItem, ...prev].slice(0, MAX_NOTIFICATIONS);
      });
      setToast(nextItem);
      showBrowserNotification(nextItem.title, nextItem.message);
    };

    window.addEventListener(STUDENT_LOCAL_NOTIFICATION_EVENT, handleLocalNotification);

    return () => {
      window.removeEventListener(STUDENT_LOCAL_NOTIFICATION_EVENT, handleLocalNotification);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const syncAnnouncements = async () => {
      try {
        const response = await announcementService.getActiveAnnouncements({
          page: 1,
          limit: 5,
        });
        const announcements = response?.data?.data?.announcements || [];
        const latestIds = announcements
          .map((item) => item?._id || item?.id)
          .filter(Boolean);

        if (latestIds.length === 0) return;

        setNotifications((prev) => mergeAnnouncementNotifications(prev, announcements));

        const storedIds = readJsonStorage(ANNOUNCEMENT_IDS_STORAGE_KEY, []);
        if (storedIds.length === 0) {
          writeJsonStorage(ANNOUNCEMENT_IDS_STORAGE_KEY, latestIds);
          return;
        }

        const newAnnouncements = announcements.filter((item) => {
          const itemId = item?._id || item?.id;
          return itemId && !storedIds.includes(itemId);
        });

        if (!isMounted || newAnnouncements.length === 0) {
          writeJsonStorage(
            ANNOUNCEMENT_IDS_STORAGE_KEY,
            Array.from(new Set([...latestIds, ...storedIds])).slice(0, 50),
          );
          return;
        }

        const announcementNotifications = newAnnouncements
          .slice()
          .reverse()
          .map((item) => buildAnnouncementNotification(item));

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const additions = announcementNotifications.filter((item) => !existingIds.has(item.id));

          if (additions.length === 0) return prev;

          return [...additions.reverse(), ...prev].slice(0, MAX_NOTIFICATIONS);
        });

        const newestAnnouncement = announcementNotifications[announcementNotifications.length - 1];
        if (newestAnnouncement) {
          setToast(newestAnnouncement);
          showBrowserNotification(newestAnnouncement.title, newestAnnouncement.message);
        }

        writeJsonStorage(
          ANNOUNCEMENT_IDS_STORAGE_KEY,
          Array.from(new Set([...latestIds, ...storedIds])).slice(0, 50),
        );
      } catch {
        // Keep bell UI working even if announcement polling fails.
      }
    };

    syncAnnouncements();
    const intervalId = window.setInterval(syncAnnouncements, ANNOUNCEMENT_POLL_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAnnouncements();
      }
    };
    const handleWindowFocus = () => {
      syncAnnouncements();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  function markAllAsRead() {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
  }

  function removeNotification(notificationId) {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
  }

  function closeToast() {
    setToast(null);
  }

  function closeRegistrationBanner() {
    setRegistrationBanner(null);
  }

  return {
    notifications,
    unreadCount,
    toast,
    registrationBanner,
    markAllAsRead,
    removeNotification,
    closeToast,
    closeRegistrationBanner,
  };
}
