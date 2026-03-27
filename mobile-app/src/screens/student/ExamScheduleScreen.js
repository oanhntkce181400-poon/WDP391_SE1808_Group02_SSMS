import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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

function getTermKey(exam) {
  return `${exam.classSection?.semester || ''}-${exam.classSection?.academicYear || ''}`;
}

function getTermLabel(termKey) {
  const [semester, academicYear] = String(termKey).split('-');
  if (!semester || !academicYear) return 'KHÁC';
  return `KỲ ${semester} - ${academicYear}`.toUpperCase();
}

function ExamCard({ exam }) {
  return (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={styles.examHeaderLeft}>
          <Text style={styles.subjectCode}>{exam.subject?.subjectCode || 'N/A'}</Text>
          <Text style={styles.subjectName}>{exam.subject?.subjectName || 'Môn học'}</Text>
          <Text style={styles.classCode}>Lớp: {exam.classSection?.classCode || 'N/A'}</Text>
        </View>
        <View style={styles.seatWrap}>
          <Text style={styles.seatLabel}>Chỗ ngồi</Text>
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
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="file-certificate-outline" size={18} color="#475569" />
        <Text style={styles.detailText}>Loại/Quy chế thi: {exam.examRules || 'Chưa cập nhật'}</Text>
      </View>
      <View style={styles.detailRow}>
        <MaterialCommunityIcons name="note-text-outline" size={18} color="#475569" />
        <Text style={styles.detailText}>Ghi chú: {exam.notes || 'Không có'}</Text>
      </View>
    </View>
  );
}

export default function ExamScheduleScreen() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');

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
      setError(err?.response?.data?.message || 'Không tải được lịch thi.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExams(false);
  }, []);

  const termOptions = useMemo(
    () => Array.from(new Set(exams.map((item) => getTermKey(item)).filter(Boolean))),
    [exams],
  );

  const filteredExams = useMemo(() => {
    if (selectedTerm === 'all') return exams;
    return exams.filter((item) => getTermKey(item) === selectedTerm);
  }, [exams, selectedTerm]);

  useEffect(() => {
    if (selectedTerm === 'all') return;
    if (!termOptions.includes(selectedTerm)) {
      setSelectedTerm('all');
    }
  }, [selectedTerm, termOptions]);

  const stats = useMemo(() => {
    const upcoming = filteredExams.filter((item) => new Date(item.examDate) >= new Date()).length;
    return {
      total: filteredExams.length,
      upcoming,
    };
  }, [filteredExams]);

  if (loading) {
    return (
      <View style={styles.centeredBox}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.helperText}>Đang tải lịch thi...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.title}>Lịch thi</Text>
        <Text style={styles.subTitle}>Ngày thi, giờ thi, phòng thi, số báo danh và chỗ ngồi</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tổng lịch thi trong kỳ</Text>
            <Text style={styles.statValue}>{stats.total}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Sắp tới</Text>
            <Text style={styles.statValue}>{stats.upcoming}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.termRow}
        >
          <Pressable
            onPress={() => setSelectedTerm('all')}
            style={[styles.termChip, selectedTerm === 'all' && styles.termChipActive]}
          >
            <Text style={[styles.termChipText, selectedTerm === 'all' && styles.termChipTextActive]}>
              TẤT CẢ
            </Text>
          </Pressable>
          {termOptions.map((termKey) => (
            <Pressable
              key={termKey}
              onPress={() => setSelectedTerm(termKey)}
              style={[styles.termChip, selectedTerm === termKey && styles.termChipActive]}
            >
              <Text style={[styles.termChipText, selectedTerm === termKey && styles.termChipTextActive]}>
                {getTermLabel(termKey)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadExams(false)}>
            <Text style={styles.retryText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={filteredExams}
        keyExtractor={(item) => String(item._id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadExams(true)} />}
        renderItem={({ item }) => <ExamCard exam={item} />}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-remove" size={44} color="#94a3b8" />
            <Text style={styles.emptyText}>
              {selectedTerm === 'all'
                ? 'Chưa có lịch thi được xếp.'
                : 'Không có lịch thi trong kỳ đã chọn.'}
            </Text>
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
  termRow: {
    marginTop: 12,
    gap: 8,
    paddingBottom: 2,
    paddingRight: 4,
  },
  termChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  termChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  termChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  termChipTextActive: {
    color: '#ffffff',
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
    fontSize: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
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
    padding: 20,
  },
  helperText: {
    marginTop: 10,
    color: '#64748b',
  },
  errorCard: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#fee2e2',
    padding: 14,
    gap: 10,
  },
  errorText: {
    color: '#b91c1c',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retryText: {
    color: '#b91c1c',
    fontWeight: '700',
  },
  emptyCard: {
    marginTop: 20,
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 24,
  },
  emptyText: {
    marginTop: 10,
    color: '#64748b',
  },
});
