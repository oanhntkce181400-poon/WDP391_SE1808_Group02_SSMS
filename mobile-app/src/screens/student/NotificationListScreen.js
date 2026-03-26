import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import announcementService from '../../services/announcementService';
import { useSocket } from '../../contexts/SocketContext';

const CATEGORY_META = {
  hoc_vu: { label: 'Học vụ', color: '#1d4ed8', icon: 'school-outline' },
  tai_chinh: { label: 'Tài chính', color: '#dc2626', icon: 'cash-outline' },
  su_kien: { label: 'Sự kiện', color: '#7c3aed', icon: 'megaphone-outline' },
  khac: { label: 'Khác', color: '#475569', icon: 'notifications-outline' },
};

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không rõ thời gian';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function buildPreview(content) {
  const plainText = stripHtml(content);
  if (!plainText) return 'Chạm để xem chi tiết thông báo.';
  if (plainText.length <= 140) return plainText;
  return `${plainText.slice(0, 137).trim()}...`;
}

function AnnouncementCard({ item, onPress }) {
  const categoryMeta = CATEGORY_META[item.category] || CATEGORY_META.khac;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={[styles.categoryPill, { backgroundColor: `${categoryMeta.color}18` }]}>
          <Ionicons name={categoryMeta.icon} size={14} color={categoryMeta.color} />
          <Text style={[styles.categoryText, { color: categoryMeta.color }]}>
            {categoryMeta.label}
          </Text>
        </View>
        <Text style={styles.timestampText}>{formatDateTime(item.createdAt)}</Text>
      </View>

      <Text style={styles.cardTitle}>{item.title || 'Thông báo mới'}</Text>
      <Text style={styles.cardPreview}>{buildPreview(item.content)}</Text>

      <View style={styles.cardFooter}>
        {/* <View style={styles.authorWrap}>
          <MaterialCommunityIcons name="account-circle-outline" size={18} color="#64748b" />
          <Text style={styles.authorText}>
            {item?.createdBy?.fullName || item?.createdBy?.username || 'Phòng đào tạo'}
          </Text>
        </View> */}

        <View style={styles.detailCta}>
          <Text style={styles.detailCtaText}>Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={16} color="#2563eb" />
        </View>
      </View>
    </Pressable>
  );
}

export default function NotificationListScreen({ onNavigate }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const { socket } = useSocket();

  const loadAnnouncements = useCallback(async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const response = await announcementService.getActiveAnnouncements({ page: 1, limit: 20 });
      setAnnouncements(response?.data?.data?.announcements || []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          'Không thể tải danh sách thông báo. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNotification = (payload) => {
      if (payload?.sourceType === 'announcement' || payload?.eventName === 'announcement-created') {
        loadAnnouncements({ silent: true });
      }
    };

    socket.on('notification', handleNotification);
    socket.on('announcement-created', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('announcement-created', handleNotification);
    };
  }, [loadAnnouncements, socket]);

  if (loading && announcements.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.centeredText}>Đang tải các thông báo mới nhất...</Text>
      </View>
    );
  }

  if (error && announcements.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={() => loadAnnouncements()}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAnnouncements({ silent: true })}
          />
        }
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Notification</Text>
          <Text style={styles.heroTitle}>Thông báo dành cho sinh viên</Text>
          <Text style={styles.heroText}>
            Danh sách này lấy các announcement mới nhất từ backend và tự làm mới khi
            socket báo có thông báo mới.
          </Text>
        </View>

        {!!error && <Text style={styles.inlineError}>{error}</Text>}

        {announcements.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={34} color="#94a3b8" />
            <Text style={styles.emptyTitle}>Chưa có thông báo nào</Text>
            <Text style={styles.emptyText}>
              Khi admin hoặc staff đăng thông báo mới, danh sách này sẽ hiển thị tại đây.
            </Text>
          </View>
        ) : (
          announcements.map((item) => (
            <AnnouncementCard
              key={item._id}
              item={item}
              onPress={() =>
                onNavigate?.('notification-detail', {
                  announcementId: item._id,
                  notification: {
                    title: item.title,
                    createdAt: item.createdAt,
                    category: item.category,
                  },
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 14,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  centeredText: {
    marginTop: 10,
    color: '#475569',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: '#0f172a',
    padding: 18,
  },
  heroEyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  heroText: {
    marginTop: 8,
    color: '#cbd5e1',
    lineHeight: 20,
  },
  inlineError: {
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emptyCard: {
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  emptyTitle: {
    marginTop: 12,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
  },
  card: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  timestampText: {
    color: '#64748b',
    fontSize: 12,
  },
  cardTitle: {
    marginTop: 14,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  cardPreview: {
    marginTop: 8,
    color: '#475569',
    lineHeight: 20,
  },
  cardFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  authorText: {
    color: '#64748b',
    fontSize: 12,
    flex: 1,
  },
  detailCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailCtaText: {
    color: '#2563eb',
    fontWeight: '700',
  },
});
