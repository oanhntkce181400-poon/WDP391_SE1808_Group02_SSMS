import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import examService from '../../services/examService';

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function ExamCard({ exam }) {
  return (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={styles.examHeaderLeft}>
          <Text style={styles.subjectCode}>{exam.subject?.subjectCode || 'N/A'}</Text>
          <Text style={styles.subjectName}>{exam.subject?.subjectName || 'Mon hoc'}</Text>
          <Text style={styles.classCode}>Lop: {exam.classSection?.classCode || 'N/A'}</Text>
        </View>
        <View style={styles.seatWrap}>
          <Text style={styles.seatLabel}>Seat</Text>
          <Text style={styles.seatValue}>{exam.seatNumber || '---'}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="calendar-month" size={18} color="#475569" />
        <Text style={styles.detailText}>{formatDate(exam.examDate)}</Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="clock-outline" size={18} color="#475569" />
        <Text style={styles.detailText}>{exam.startTime || '-'} - {exam.endTime || '-'}</Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="office-building" size={18} color="#475569" />
        <Text style={styles.detailText}>
          {exam.room?.roomCode || '-'} {exam.room?.roomName ? `(${exam.room.roomName})` : ''}
        </Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="card-account-details-outline" size={18} color="#475569" />
        <Text style={styles.detailText}>SBD: {exam.sbd || '---'}</Text>
      </View>
    </View>
  );
}

export default function ExamScheduleScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadExams = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await examService.getMyExams();
      const rows = response?.data?.data || [];
      rows.sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
      setExams(rows);
    } catch (err) {
      setExams([]);
      setError(err?.response?.data?.message || 'Khong tai duoc lich thi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExams(false);
  }, []);

  const stats = useMemo(() => {
    const upcoming = exams.filter((item) => new Date(item.examDate) >= new Date()).length;
    return {
      total: exams.length,
      upcoming,
    };
  }, [exams]);

  if (loading) {
    return (
      <View style={styles.centeredBox}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.helperText}>Dang tai lich thi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Exam Schedule</Text>
        <Text style={styles.subTitle}>Ngay, gio, phong thi, SBD va seat number</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tong lich thi</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sap toi</Text>
            <Text style={styles.statValue}>{stats.upcoming}</Text>
          </View>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadExams(false)}>
            <Text style={styles.retryText}>Thu lai</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={exams}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadExams(true)} />}
        renderItem={({ item }) => <ExamCard exam={item} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-remove" size={44} color="#94a3b8" />
            <Text style={styles.emptyText}>Chua co lich thi duoc xep.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    marginHorizontal: 14,
    marginTop: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subTitle: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 13,
  },
  statsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statLabel: {
    color: '#9a3412',
    fontSize: 12,
  },
  statValue: {
    marginTop: 2,
    fontSize: 22,
    fontWeight: '800',
    color: '#c2410c',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingBottom: 94,
    gap: 10,
  },
  examCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  examHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  subjectCode: {
    color: '#0369a1',
    fontWeight: '700',
    fontSize: 13,
  },
  subjectName: {
    marginTop: 2,
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  classCode: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
  },
  seatWrap: {
    minWidth: 70,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  seatLabel: {
    color: '#64748b',
    fontSize: 11,
  },
  seatValue: {
    color: '#0f172a',
    fontWeight: '800',
    fontSize: 18,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  detailText: {
    color: '#334155',
    fontSize: 13,
  },
  centeredBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  helperText: {
    marginTop: 8,
    color: '#475569',
  },
  errorCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
  },
  errorText: {
    color: '#b91c1c',
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyCard: {
    marginTop: 24,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
  },
});
