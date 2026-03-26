import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import announcementService from '../../services/announcementService';

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

function htmlToPlainText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

async function openAttachment(url) {
  if (!url) return;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
}

export default function NotificationDetailScreen({ announcementId, notification, onBack }) {
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(Boolean(announcementId));
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDetail() {
      if (!announcementId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const response = await announcementService.getAnnouncementById(announcementId);
        if (!mounted) return;
        setAnnouncement(response?.data?.data || null);
      } catch (err) {
        if (!mounted) return;
        setError(
          err?.response?.data?.message ||
            'Không thể tải chi tiết thông báo. Vui lòng thử lại.',
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDetail();

    return () => {
      mounted = false;
    };
  }, [announcementId]);

  const displayNotification = announcement || notification || null;
  const categoryMeta = CATEGORY_META[displayNotification?.category] || CATEGORY_META.khac;

  const plainContent = useMemo(() => {
    if (announcement?.content) {
      return htmlToPlainText(announcement.content);
    }
    return htmlToPlainText(notification?.message || notification?.content || '');
  }, [announcement, notification]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.centeredText}>Đang tải chi tiết thông báo...</Text>
      </View>
    );
  }

  if (error && !displayNotification) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backButtonFallback} onPress={onBack}>
          <Text style={styles.backButtonFallbackText}>Quay lại danh sách</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Pressable style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
            <Text style={styles.backButtonText}>Quay lại</Text>
          </Pressable>

          <View style={[styles.categoryPill, { backgroundColor: `${categoryMeta.color}18` }]}>
            <Ionicons name={categoryMeta.icon} size={14} color={categoryMeta.color} />
            <Text style={[styles.categoryText, { color: categoryMeta.color }]}>
              {categoryMeta.label}
            </Text>
          </View>

          <Text style={styles.titleText}>
            {displayNotification?.title || 'Chi tiết thông báo'}
          </Text>

          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#64748b" />
            <Text style={styles.metaText}>
              {formatDateTime(
                displayNotification?.createdAt ||
                  displayNotification?.timestamp ||
                  displayNotification?.updatedAt,
              )}
            </Text>
          </View>

          {announcement?.createdBy ? (
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="account-circle-outline" size={16} color="#64748b" />
              <Text style={styles.metaText}>
                {announcement.createdBy.fullName ||
                  announcement.createdBy.username ||
                  'Phòng đào tạo'}
              </Text>
            </View>
          ) : null}
        </View>

        {!!error && <Text style={styles.inlineError}>{error}</Text>}

        <View style={styles.contentCard}>
          <Text style={styles.sectionTitle}>Nội dung</Text>
          <Text style={styles.contentText}>
            {plainContent || 'Thông báo này hiện chưa có nội dung chi tiết.'}
          </Text>
        </View>

        {Array.isArray(announcement?.attachments) && announcement.attachments.length > 0 ? (
          <View style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Tệp đính kèm</Text>
            {announcement.attachments.map((attachment, index) => (
              <Pressable
                key={`${attachment.url}-${index}`}
                style={styles.attachmentRow}
                onPress={() => openAttachment(attachment.url)}
              >
                <View style={styles.attachmentIconWrap}>
                  <Ionicons name="attach-outline" size={18} color="#2563eb" />
                </View>
                <View style={styles.attachmentContent}>
                  <Text style={styles.attachmentName}>
                    {attachment.fileName || `Tệp đính kèm ${index + 1}`}
                  </Text>
                  <Text style={styles.attachmentHint}>Chạm để mở liên kết</Text>
                </View>
                <Ionicons name="open-outline" size={18} color="#2563eb" />
              </Pressable>
            ))}
          </View>
        ) : null}
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
  backButtonFallback: {
    borderRadius: 12,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButtonFallbackText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  headerCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 14,
  },
  backButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
  categoryPill: {
    alignSelf: 'flex-start',
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
  titleText: {
    marginTop: 14,
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
  },
  metaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    color: '#64748b',
  },
  inlineError: {
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  contentCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 18,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  contentText: {
    marginTop: 12,
    color: '#334155',
    lineHeight: 24,
    fontSize: 15,
  },
  attachmentRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  attachmentIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  attachmentContent: {
    flex: 1,
  },
  attachmentName: {
    color: '#0f172a',
    fontWeight: '700',
  },
  attachmentHint: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
  },
});
