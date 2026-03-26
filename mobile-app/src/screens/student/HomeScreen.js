import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import useProfile from '../../hooks/useProfile';

function formatSemester(value) {
  if (!value) return 'N/A';
  return `Học kỳ ${value}`;
}

function HeroMetric({ label, value }) {
  return (
    <View style={styles.heroMetric}>
      <Text style={styles.heroMetricLabel}>{label}</Text>
      <Text style={styles.heroMetricValue}>{value}</Text>
    </View>
  );
}

function QuickActionCard({ title, subtitle, icon, tone = '#1d4ed8', onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.quickActionCard}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${tone}18` }]}>
        {icon}
      </View>
      <Text style={styles.quickActionTitle}>{title}</Text>
      <Text style={styles.quickActionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

function ServiceRow({ title, subtitle, icon, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.serviceRow}>
      <View style={styles.serviceIcon}>{icon}</View>
      <View style={styles.serviceCopy}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </Pressable>
  );
}

export default function HomeScreen({ onNavigate }) {
  const { profile, loading, refreshing, error, refresh, reload } = useProfile();

  const quickActions = [
    {
      key: 'notification',
      title: 'Thông báo',
      subtitle: 'Xem các thông báo mới nhất từ nhà trường',
      tone: '#2563eb',
      icon: <Ionicons name="notifications-outline" size={24} color="#2563eb" />,
    },
    {
      key: 'feedback',
      title: 'Đánh giá giảng viên',
      subtitle: 'Gửi hoặc chỉnh sửa đánh giá lớp học',
      tone: '#f59e0b',
      icon: <MaterialCommunityIcons name="star-circle" size={24} color="#f59e0b" />,
    },
    {
      key: 'exam',
      title: 'Lịch thi',
      subtitle: 'Xem các kỳ thi sắp tới',
      tone: '#1d4ed8',
      icon: <MaterialCommunityIcons name="calendar-clock" size={24} color="#1d4ed8" />,
    },
    {
      key: 'schedule',
      title: 'Thời khóa biểu',
      subtitle: 'Xem lịch học tuần theo lớp, giờ và phòng',
      tone: '#0f766e',
      icon: <Ionicons name="calendar-outline" size={24} color="#0f766e" />,
    },
    {
      key: 'attendance',
      title: 'Điểm danh',
      subtitle: 'Xem báo cáo chuyên cần',
      tone: '#7c3aed',
      icon: <MaterialCommunityIcons name="clipboard-check-outline" size={24} color="#7c3aed" />,
    },
    {
      key: 'application',
      title: 'Đơn từ',
      subtitle: 'Theo dõi yêu cầu và biểu mẫu',
      tone: '#dc2626',
      icon: <Ionicons name="document-text-outline" size={24} color="#dc2626" />,
    },
    {
      key: 'profile',
      title: 'Hồ sơ',
      subtitle: 'Xem chi tiết hồ sơ học tập',
      tone: '#2563eb',
      icon: <Ionicons name="person-circle-outline" size={24} color="#2563eb" />,
    },
  ];

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.helperText}>Đang tải trang chủ sinh viên...</Text>
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={reload}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroDecorationLarge} />
          <View style={styles.heroDecorationSmall} />

          <Text style={styles.heroEyebrow}>Ứng dụng sinh viên</Text>
          <Text style={styles.heroName}>{profile?.fullName || 'Sinh viên'}</Text>
          <Text style={styles.heroSubline}>
            {profile?.studentCode || 'N/A'} • {profile?.majorCode || 'N/A'} •{' '}
            {profile?.cohortLabel || 'N/A'}
          </Text>

          <View style={styles.heroMetaRow}>
            <HeroMetric label="GPA" value={profile?.gpa || '0.00'} />
            <HeroMetric
              label="Chương trình"
              value={formatSemester(profile?.currentCurriculumSemester)}
            />
          </View>

          <View style={styles.heroBanner}>
            <MaterialCommunityIcons name="bell-outline" size={18} color="#bfdbfe" />
            <Text style={styles.heroBannerText}>
              Kéo xuống để cập nhật nhanh thông tin học tập mới nhất.
            </Text>
          </View>
        </View>

        {!!error && <Text style={styles.inlineError}>{error}</Text>}

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Truy cập nhanh</Text>
            <Text style={styles.sectionSubtitle}>
              Mở nhanh những chức năng sinh viên dùng thường xuyên nhất.
            </Text>
          </View>

          <View style={styles.quickActionGrid}>
            {quickActions.map((item) => (
              <QuickActionCard
                key={item.key}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                tone={item.tone}
                onPress={() => onNavigate?.(item.key)}
              />
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tóm tắt học tập</Text>
            <Text style={styles.sectionSubtitle}>
              Các chỉ số này được lấy từ cùng API hồ sơ dùng ở màn hình profile.
            </Text>
          </View>

          <View style={styles.snapshotGrid}>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Năm học</Text>
              <Text style={styles.snapshotValue}>{profile?.academicYear || 'N/A'}</Text>
            </View>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Lớp sinh hoạt</Text>
              <Text style={styles.snapshotValue}>{profile?.classSection || 'N/A'}</Text>
            </View>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Năm nhập học</Text>
              <Text style={styles.snapshotValue}>{profile?.enrollmentYear || 'N/A'}</Text>
            </View>
            <View style={styles.snapshotItem}>
              <Text style={styles.snapshotLabel}>Ngành</Text>
              <Text style={styles.snapshotValue}>{profile?.majorCode || 'N/A'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Gợi ý tiếp theo</Text>
            <Text style={styles.sectionSubtitle}>
              Những mục này dẫn bạn tới các thao tác phổ biến nhất sau khi vào app.
            </Text>
          </View>

          <ServiceRow
            title="Mở thông báo mới nhất"
            subtitle="Xem danh sách thông báo gần đây và đọc nội dung chi tiết từng thông báo."
            icon={<Ionicons name="notifications-outline" size={22} color="#2563eb" />}
            onPress={() => onNavigate?.('notification')}
          />
          <ServiceRow
            title="Gửi đánh giá giảng viên"
            subtitle="Đánh giá chất lượng lớp học và cập nhật phản hồi gần nhất của bạn."
            icon={<MaterialCommunityIcons name="message-star-outline" size={22} color="#f59e0b" />}
            onPress={() => onNavigate?.('feedback')}
          />
          <ServiceRow
            title="Mở thời khóa biểu tuần"
            subtitle="Xem lịch học thật đang áp dụng cho tuần hiện tại, có lớp, giảng viên, phòng và slot học."
            icon={<Ionicons name="calendar-outline" size={22} color="#0f766e" />}
            onPress={() => onNavigate?.('schedule')}
          />
          <ServiceRow
            title="Xem lịch thi"
            subtitle="Mở lịch thi để tránh bỏ lỡ thay đổi về phòng, ngày hoặc ca thi."
            icon={<Ionicons name="document-text-outline" size={22} color="#1d4ed8" />}
            onPress={() => onNavigate?.('exam')}
          />
          <ServiceRow
            title="Kiểm tra chuyên cần"
            subtitle="Theo dõi điểm danh sớm để phát hiện vấn đề trước khi kết thúc học kỳ."
            icon={<MaterialCommunityIcons name="clipboard-pulse-outline" size={22} color="#7c3aed" />}
            onPress={() => onNavigate?.('attendance')}
          />
          <ServiceRow
            title="Xem lịch học vụ"
            subtitle="Mở lịch học vụ để kiểm tra các mốc quan trọng của học kỳ và nhà trường."
            icon={<MaterialCommunityIcons name="calendar-month" size={22} color="#0f766e" />}
            onPress={() => onNavigate?.('academicCalendar')}
          />
        </View>
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
    padding: 20,
  },
  helperText: {
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
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0f172a',
    padding: 20,
  },
  heroDecorationLarge: {
    position: 'absolute',
    right: -28,
    top: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1d4ed8',
    opacity: 0.35,
  },
  heroDecorationSmall: {
    position: 'absolute',
    right: 42,
    top: 56,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f59e0b',
    opacity: 0.22,
  },
  heroEyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroName: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubline: {
    marginTop: 6,
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  heroMetric: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.09)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  heroMetricLabel: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  heroMetricValue: {
    marginTop: 4,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  heroBanner: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(59,130,246,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroBannerText: {
    flex: 1,
    color: '#dbeafe',
    lineHeight: 18,
    fontSize: 12,
  },
  inlineError: {
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeader: {
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 19,
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    minHeight: 144,
  },
  quickActionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionTitle: {
    marginTop: 14,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  quickActionSubtitle: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 18,
    fontSize: 12,
  },
  snapshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  snapshotItem: {
    width: '48%',
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  snapshotLabel: {
    color: '#475569',
    fontSize: 12,
  },
  snapshotValue: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    padding: 14,
    marginTop: 10,
  },
  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  serviceCopy: {
    flex: 1,
  },
  serviceTitle: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 14,
  },
  serviceSubtitle: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
  },
});
