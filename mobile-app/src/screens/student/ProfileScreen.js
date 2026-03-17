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
import useProfile from '../../hooks/useProfile';
import useAuthStore from '../../stores/useAuthStore';
import { AUTH_STORAGE_KEY, removeItem } from '../../utils/storage';

function getInitials(name = '') {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'SV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, loading, refreshing, error, refresh, reload } = useProfile();
  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    logout();
    await removeItem(AUTH_STORAGE_KEY);
  }

  if (loading && !profile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.helperText}>Đang tải hồ sơ sinh viên...</Text>
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
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.topActions}>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </Pressable>
        </View>

        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(profile?.fullName)}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.fullName}>{profile?.fullName}</Text>
            <Text style={styles.subLine}>MSSV: {profile?.studentCode}</Text>
            <View style={styles.cohortPill}>
              <Text style={styles.cohortPillText}>{profile?.cohortLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thông tin học tập</Text>
          <InfoRow label="GPA" value={profile?.gpa || '0.00'} />
          <InfoRow label="Năm học" value={profile?.academicYear || 'N/A'} />
          <InfoRow label="Ngành" value={profile?.majorCode || 'N/A'} />
          <InfoRow
            label="Học kỳ hiện tại"
            value={profile?.currentCurriculumSemester ? String(profile.currentCurriculumSemester) : 'N/A'}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Thông tin khác</Text>
          <InfoRow label="Lớp sinh hoạt" value={profile?.classSection || 'N/A'} />
          <InfoRow
            label="Khóa"
            value={profile?.cohortLabel || (profile?.cohort ? `K${profile.cohort}` : 'N/A')}
          />
        </View>

        {!!error && <Text style={styles.errorInline}>{error}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 16,
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
    fontSize: 14,
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  headerCard: {
    borderRadius: 16,
    backgroundColor: '#1d4ed8',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#1e3a8a',
    fontSize: 22,
    fontWeight: '700',
  },
  headerInfo: {
    marginLeft: 14,
    flex: 1,
  },
  fullName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
  },
  subLine: {
    marginTop: 4,
    color: '#dbeafe',
    fontSize: 13,
  },
  cohortPill: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cohortPillText: {
    color: '#1e3a8a',
    fontWeight: '700',
    fontSize: 12,
  },
  infoCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    color: '#475569',
    fontSize: 13,
  },
  infoValue: {
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 13,
    maxWidth: '60%',
    textAlign: 'right',
  },
  errorInline: {
    color: '#b91c1c',
    fontSize: 12,
    textAlign: 'center',
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  logoutButton: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 12,
  },
});
