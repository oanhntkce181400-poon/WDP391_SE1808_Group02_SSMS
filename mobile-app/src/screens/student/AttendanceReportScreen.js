import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import attendanceService from '../../services/attendanceService';

const STATUS_LABELS = {
  Present: 'Có mặt',
  Late: 'Đi trễ',
  Absent: 'Vắng mặt',
  Unmarked: 'Chưa điểm danh',
};

const STATUS_COLORS = {
  Present: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
  Late: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Absent: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  Unmarked: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

function formatDate(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateShort(value) {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getTermKey(item) {
  return `${item.classSection?.semester || ''}-${item.classSection?.academicYear || ''}`;
}

function getTermLabel(termKey) {
  const [semester, academicYear] = String(termKey).split('-');
  if (!semester || !academicYear) return 'KHÁC';
  return `KỲ ${semester} - ${academicYear}`.toUpperCase();
}

function getAttendanceColor(rate) {
  if (rate >= 85) return '#16a34a';
  if (rate >= 70) return '#f97316';
  return '#dc2626';
}

function ProgressRing({ absenceRate = 0 }) {
  const safeAbsence = Math.max(0, Math.min(100, Number(absenceRate || 0)));
  const score = Math.max(0, Math.round((100 - safeAbsence) * 10) / 10);

  const size = 84;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const absenceArc = (safeAbsence / 100) * circumference;

  return (
    <View style={styles.ringOuter}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFillObject}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#22c55e"
          strokeWidth={stroke}
          fill="transparent"
        />
        {safeAbsence > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#f97316"
            strokeWidth={stroke}
            fill="transparent"
            strokeDasharray={`${absenceArc} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        ) : null}
      </Svg>
      <View style={styles.ringInner}>
        <Text style={styles.ringValue}>{Math.round(score)}</Text>
      </View>
    </View>
  );
}

export default function AttendanceReportScreen({ onNavigate }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const loadReport = async (isRefresh = false) => {
    setError('');
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await attendanceService.getMyAttendance();
      const payload = response?.data?.data || { summary: {}, items: [] };
      setReport(payload);
    } catch (err) {
      setReport({ summary: {}, items: [] });
      setError(err?.response?.data?.message || 'Không tải được báo cáo điểm danh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadReport(false);
  }, []);

  const items = useMemo(() => report?.items || [], [report]);

  const termOptions = useMemo(
    () => Array.from(new Set(items.map((item) => getTermKey(item)).filter(Boolean))),
    [items],
  );

  const filteredItems = useMemo(() => {
    if (selectedTerm === 'all') return items;
    return items.filter((item) => getTermKey(item) === selectedTerm);
  }, [items, selectedTerm]);

  useEffect(() => {
    if (!selectedItem) return;
    const stillExist = filteredItems.some(
      (item) => String(item.classSection?._id) === String(selectedItem.classSection?._id),
    );
    if (!stillExist) {
      setSelectedItem(null);
      setSelectedSession(null);
    }
  }, [filteredItems, selectedItem]);

  const currentList = selectedItem ? (selectedItem.details || []) : filteredItems;

  const handleBack = () => {
    if (selectedSession) {
      setSelectedSession(null);
      return;
    }
    if (selectedItem) {
      setSelectedItem(null);
      return;
    }
    onNavigate?.('home');
  };

  const selectedStats = selectedItem?.attendanceStats || {};
  const attendanceRate = Number(selectedStats.participationRateToDate || 0);
  const absenceRate = Number(selectedStats.absenceRateToDate || 0);
  const attendanceScore = Number(selectedStats.attendanceScore || (100 - absenceRate));

  if (loading) {
    return (
      <View style={styles.centeredBox}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.helperText}>Đang tải báo cáo điểm danh...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.topHeaderWrap}>
        <View style={styles.topHeader}>
          <Pressable onPress={handleBack} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </Pressable>
          <Text style={styles.headerTitle}>Báo cáo điểm danh</Text>
          <Pressable onPress={() => loadReport(true)} style={styles.headerIconBtn}>
            <Ionicons name="refresh" size={20} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={currentList}
        keyExtractor={(item, index) => {
          if (selectedItem) {
            return `${item.slotId || 'slot'}-${item.slotDate || index}`;
          }
          return String(item.classSection?._id || index);
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadReport(true)} />}
        ListHeaderComponent={
          <View>
            {selectedItem ? (
              <View style={styles.selectedSubjectCard}>
                <Text style={styles.subjectCodeBig}>{selectedItem.subject?.subjectCode || 'MÔN HỌC'}</Text>
                <Text style={styles.subjectNameBig}>{selectedItem.subject?.subjectName || selectedItem.classSection?.className || 'N/A'}</Text>
                <Text style={styles.selectedMeta}>Lớp: {selectedItem.classSection?.classCode || 'N/A'}</Text>
                <Text style={styles.selectedMeta}>Đã tham gia: {selectedStats.attendedSessions || 0}/{selectedStats.sessionsElapsed || 0}</Text>
                {(selectedStats.unmarkedSessions || 0) > 0 ? (
                  <Text style={styles.selectedMeta}>Chưa điểm danh: {selectedStats.unmarkedSessions || 0} buổi</Text>
                ) : null}
                <View style={styles.selectedRateRow}>
                  <ProgressRing absenceRate={absenceRate} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedRateTitle}>Điểm sau khi trừ vắng</Text>
                    <Text style={[styles.selectedRateValue, { color: getAttendanceColor(attendanceScore) }]}>
                      {Math.round(attendanceScore)}
                    </Text>
                    <Text style={styles.selectedRateHint}>Vắng {selectedStats.absentSessions || 0}/{selectedStats.sessionsElapsed || 0} buổi đã diễn ra</Text>
                  </View>
                </View>
              </View>
            ) : null}

            {!selectedItem ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.termRow}
                style={{ marginBottom: 8 }}
              >
                <Pressable
                  onPress={() => setSelectedTerm('all')}
                  style={[styles.termChip, selectedTerm === 'all' && styles.termChipActive]}
                >
                  <Text style={[styles.termChipText, selectedTerm === 'all' && styles.termChipTextActive]}>TẤT CẢ</Text>
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
            ) : null}

            {error ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {!error && currentList.length === 0 ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="clipboard-text-clock" size={42} color="#94a3b8" />
                <Text style={styles.emptyText}>
                  {selectedItem
                    ? 'Môn học này chưa có buổi điểm danh nào.'
                    : 'Chưa có dữ liệu điểm danh từ giảng viên.'}
                </Text>
              </View>
            ) : null}

            {selectedItem ? (
              <Text style={styles.sectionTitle}>Danh sách buổi điểm danh</Text>
            ) : (
              <Text style={styles.sectionTitle}>Danh sách môn học</Text>
            )}
          </View>
        }
        renderItem={({ item }) => {
          if (selectedItem) {
            const status = item.status || 'Absent';
            const statusColors = STATUS_COLORS[status] || STATUS_COLORS.Absent;

            return (
              <Pressable
                onPress={() => setSelectedSession(item)}
                style={styles.sessionCard}
              >
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.sessionDate}>{formatDate(item.slotDate)}</Text>
                  <Text style={styles.sessionSub}>Mã buổi: {item.slotId || 'N/A'}</Text>
                  <Text style={styles.sessionHint}>Bấm để xem chi tiết buổi</Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}> 
                  <Text style={[styles.statusText, { color: statusColors.text }]}>{STATUS_LABELS[status] || status}</Text>
                </View>
              </Pressable>
            );
          }

          const stats = item.attendanceStats || {};
          const attendance = Number(stats.participationRateToDate || 0);
          const absence = Number(stats.absenceRateToDate || 0);
          const score = Number(stats.attendanceScore || (100 - absence));

          return (
            <Pressable
              onPress={() => {
                setSelectedItem(item);
                setSelectedSession(null);
              }}
              style={styles.subjectCard}
            >
              <ProgressRing absenceRate={absence} />

              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={styles.subjectCode}>{item.subject?.subjectCode || 'MÔN HỌC'}</Text>
                <Text style={styles.subjectClass}>Lớp: {item.classSection?.classCode || 'N/A'}</Text>
                <Text style={styles.subjectDate}>Bắt đầu: {formatDateShort(item.classSection?.startDate)}</Text>
                <Text style={styles.subjectDate}>Kết thúc: {formatDateShort(item.classSection?.endDate)}</Text>
                <Text style={[styles.attendedText, { color: getAttendanceColor(attendance) }]}>
                  Đã tham gia: {stats.attendedSessions || 0}/{stats.sessionsElapsed || 0}
                </Text>
                <Text style={[styles.subjectScore, { color: getAttendanceColor(score) }]}>Điểm sau trừ vắng: {Math.round(score)}</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {selectedSession ? (
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>Chi tiết buổi điểm danh</Text>
              <Pressable onPress={() => setSelectedSession(null)}>
                <Ionicons name="close" size={22} color="#334155" />
              </Pressable>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Môn học:</Text>
              <Text style={styles.detailValue}>{selectedItem?.subject?.subjectCode || 'N/A'} - {selectedItem?.subject?.subjectName || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Lớp:</Text>
              <Text style={styles.detailValue}>{selectedItem?.classSection?.classCode || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ngày:</Text>
              <Text style={styles.detailValue}>{formatDate(selectedSession.slotDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mã buổi:</Text>
              <Text style={styles.detailValue}>{selectedSession.slotId || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Trạng thái:</Text>
              <Text style={styles.detailValue}>{STATUS_LABELS[selectedSession.status] || selectedSession.status || 'N/A'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Ghi chú:</Text>
              <Text style={styles.detailValue}>{selectedSession.note || 'Không có'}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  topHeaderWrap: {
    backgroundColor: '#ffffff',
    paddingBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topHeader: {
    height: 68,
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  list: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 100,
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
  termRow: {
    gap: 10,
    paddingVertical: 2,
    paddingRight: 10,
  },
  termChip: {
    minWidth: 118,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  termChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  termChipText: {
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '700',
  },
  termChipTextActive: {
    color: '#ffffff',
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 10,
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  subjectCard: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  ringOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  ringInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  ringValue: {
    color: '#22c55e',
    fontSize: 22,
    fontWeight: '800',
  },
  subjectCode: {
    color: '#1565c0',
    fontSize: 21,
    fontWeight: '800',
  },
  subjectClass: {
    marginTop: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '600',
  },
  subjectDate: {
    marginTop: 1,
    color: '#111827',
    fontSize: 13,
  },
  attendedText: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '800',
  },
  subjectScore: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSubjectCard: {
    borderRadius: 20,
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginBottom: 10,
  },
  subjectCodeBig: {
    color: '#1565c0',
    fontSize: 24,
    fontWeight: '800',
  },
  subjectNameBig: {
    marginTop: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  selectedMeta: {
    marginTop: 2,
    color: '#334155',
    fontSize: 13,
  },
  selectedRateRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedRateTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedRateValue: {
    marginTop: 2,
    color: '#dc2626',
    fontSize: 26,
    fontWeight: '800',
  },
  selectedRateHint: {
    color: '#475569',
    fontSize: 12,
  },
  sessionCard: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: '#b91c1c',
  },
  emptyCard: {
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 22,
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyText: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  sessionDate: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  sessionSub: {
    marginTop: 1,
    fontSize: 12,
    color: '#475569',
  },
  sessionHint: {
    marginTop: 1,
    fontSize: 11,
    color: '#64748b',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  detailCard: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailRow: {
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  detailValue: {
    marginTop: 2,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
});
