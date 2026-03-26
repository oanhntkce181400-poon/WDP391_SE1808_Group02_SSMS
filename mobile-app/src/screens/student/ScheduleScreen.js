import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import scheduleService from '../../services/scheduleService';

const DAY_META = [
  { dayOfWeek: 1, short: 'T2', label: 'Thứ 2' },
  { dayOfWeek: 2, short: 'T3', label: 'Thứ 3' },
  { dayOfWeek: 3, short: 'T4', label: 'Thứ 4' },
  { dayOfWeek: 4, short: 'T5', label: 'Thứ 5' },
  { dayOfWeek: 5, short: 'T6', label: 'Thứ 6' },
  { dayOfWeek: 6, short: 'T7', label: 'Thứ 7' },
  { dayOfWeek: 7, short: 'CN', label: 'Chủ nhật' },
];

const SUBJECT_TONES = [
  { soft: '#e0f2fe', accent: '#0284c7', text: '#075985' },
  { soft: '#dcfce7', accent: '#16a34a', text: '#166534' },
  { soft: '#ffedd5', accent: '#ea580c', text: '#9a3412' },
  { soft: '#ede9fe', accent: '#7c3aed', text: '#5b21b6' },
  { soft: '#fee2e2', accent: '#dc2626', text: '#991b1b' },
  { soft: '#ecfccb', accent: '#65a30d', text: '#4d7c0f' },
];

const ATTENDANCE_META = {
  present: { label: 'Có mặt', bg: '#dcfce7', text: '#166534' },
  absent: { label: 'Vắng', bg: '#fee2e2', text: '#991b1b' },
  late: { label: 'Muộn', bg: '#fef3c7', text: '#92400e' },
  excused: { label: 'Có phép', bg: '#dbeafe', text: '#1d4ed8' },
  excused_absence: { label: 'Có phép', bg: '#dbeafe', text: '#1d4ed8' },
};

function parseLocalDate(value) {
  if (!value) return new Date(Number.NaN);

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  const text = String(value).trim();
  const ymdMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    return new Date(Number(ymdMatch[1]), Number(ymdMatch[2]) - 1, Number(ymdMatch[3]));
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return new Date(Number.NaN);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getMondayOfWeek(dateInput) {
  const date = parseLocalDate(dateInput);
  const jsDay = date.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toDateStr(dateInput) {
  const date = parseLocalDate(dateInput);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateInput, amount) {
  const date = parseLocalDate(dateInput);
  date.setDate(date.getDate() + amount);
  return date;
}

function formatDateShort(dateInput) {
  const date = parseLocalDate(dateInput);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  });
}

function formatDateLong(dateInput) {
  const date = parseLocalDate(dateInput);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDateOfDay(weekStart, dayOfWeek) {
  return addDays(weekStart, Number(dayOfWeek || 1) - 1);
}

function getDayOfWeekValue(dateInput) {
  const date = parseLocalDate(dateInput);
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function isSameDate(a, b) {
  return toDateStr(a) === toDateStr(b);
}

function isCurrentWeek(weekStart) {
  return toDateStr(getMondayOfWeek(new Date())) === String(weekStart || '');
}

function formatWeekRange(weekStart, weekEnd) {
  const start = parseLocalDate(weekStart);
  const end = parseLocalDate(weekEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Tuần không hợp lệ';
  return `${formatDateShort(start)} - ${formatDateShort(end)}`;
}

function hashText(text) {
  return Array.from(String(text || '')).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function getSubjectTone(subjectCode) {
  if (!subjectCode) return SUBJECT_TONES[0];
  return SUBJECT_TONES[hashText(subjectCode) % SUBJECT_TONES.length];
}

function formatPeriodRange(startPeriod, endPeriod, fallbackName) {
  const start = Number(startPeriod || 0);
  const end = Number(endPeriod || 0);
  if (start > 0 && end > 0) {
    if (start === end) return `Slot ${start}`;
    return `Slot ${start}-${end}`;
  }
  return fallbackName || 'Chưa rõ slot';
}

function formatTimeRange(item) {
  const start = item?.startTime || '';
  const end = item?.endTime || '';
  if (start && end) return `${start} - ${end}`;
  return start || end || 'Chưa có giờ';
}

function formatRoom(item) {
  const roomCode = item?.room?.roomCode || '';
  const roomName = item?.room?.roomName || '';
  if (roomCode && roomName && roomName !== roomCode) return `${roomCode} · ${roomName}`;
  return roomCode || roomName || 'Chưa có phòng';
}

function sortSchedules(rows) {
  return [...rows].sort((left, right) => {
    if (Number(left.dayOfWeek || 0) !== Number(right.dayOfWeek || 0)) {
      return Number(left.dayOfWeek || 0) - Number(right.dayOfWeek || 0);
    }

    if (Number(left.startPeriod || 0) !== Number(right.startPeriod || 0)) {
      return Number(left.startPeriod || 0) - Number(right.startPeriod || 0);
    }

    return String(left.startTime || '').localeCompare(String(right.startTime || ''));
  });
}

function SummaryBox({ label, value, tone = 'blue' }) {
  const toneMap = {
    blue: { bg: 'rgba(59,130,246,0.14)', text: '#dbeafe', value: '#ffffff' },
    amber: { bg: 'rgba(245,158,11,0.16)', text: '#fde68a', value: '#ffffff' },
    green: { bg: 'rgba(34,197,94,0.15)', text: '#bbf7d0', value: '#ffffff' },
  };

  const palette = toneMap[tone] || toneMap.blue;

  return (
    <View style={[styles.summaryBox, { backgroundColor: palette.bg }]}>
      <Text style={[styles.summaryLabel, { color: palette.text }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: palette.value }]}>{value}</Text>
    </View>
  );
}

function MetaRow({ icon, text }) {
  return (
    <View style={styles.metaRow}>
      <MaterialCommunityIcons name={icon} size={16} color="#64748b" />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

function ScheduleCard({ item, isToday }) {
  const tone = getSubjectTone(item?.subject?.subjectCode);
  const attendanceMeta = ATTENDANCE_META[String(item?.attendanceStatus || '').toLowerCase()] || null;

  return (
    <View style={[styles.sessionCard, isToday && styles.sessionCardToday]}>
      <View style={[styles.sessionAccent, { backgroundColor: tone.accent }]} />

      <View style={styles.sessionBody}>
        <View style={styles.sessionTopRow}>
          <View style={styles.sessionBadgeRow}>
            <View style={[styles.subjectBadge, { backgroundColor: tone.soft }]}>
              <Text style={[styles.subjectBadgeText, { color: tone.text }]}>
                {item?.subject?.subjectCode || 'N/A'}
              </Text>
            </View>

            {item?.classCode ? (
              <View style={styles.classBadge}>
                <Text style={styles.classBadgeText}>{item.classCode}</Text>
              </View>
            ) : null}
          </View>

          {attendanceMeta ? (
            <View style={[styles.attendanceBadge, { backgroundColor: attendanceMeta.bg }]}>
              <Text style={[styles.attendanceBadgeText, { color: attendanceMeta.text }]}>
                {attendanceMeta.label}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.subjectName}>{item?.subject?.subjectName || item?.className || 'Môn học'}</Text>

        <View style={styles.metaList}>
          <MetaRow
            icon="layers-outline"
            text={`${formatPeriodRange(item?.startPeriod, item?.endPeriod, item?.timeslotName)} · ${formatTimeRange(item)}`}
          />
          <MetaRow icon="map-marker-outline" text={formatRoom(item)} />
          <MetaRow icon="account-tie-outline" text={item?.teacher || 'Chưa có giảng viên'} />
        </View>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const currentWeekStart = toDateStr(getMondayOfWeek(new Date()));
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [payload, setPayload] = useState({
    weekStart: currentWeekStart,
    weekEnd: toDateStr(addDays(currentWeekStart, 6)),
    currentTerm: null,
    schedules: [],
  });
  const [selectedDay, setSelectedDay] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadSchedule = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await scheduleService.getMyWeekSchedule(weekStart);
      const nextPayload = response?.data?.data || {};
      const rows = sortSchedules(nextPayload?.schedules || []);

      setPayload({
        weekStart: nextPayload?.weekStart || weekStart,
        weekEnd: nextPayload?.weekEnd || toDateStr(addDays(weekStart, 6)),
        currentTerm: nextPayload?.currentTerm || null,
        schedules: rows,
      });
    } catch (err) {
      setPayload((prev) => ({
        ...prev,
        weekStart,
        weekEnd: toDateStr(addDays(weekStart, 6)),
        schedules: [],
      }));
      setError(err?.response?.data?.message || 'Không tải được thời khóa biểu.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule(false);
  }, [weekStart]);

  const schedules = payload?.schedules || [];
  const today = parseLocalDate(new Date());
  const viewingCurrentWeek = isCurrentWeek(payload?.weekStart || weekStart);
  const todayDayOfWeek = getDayOfWeekValue(today);

  const groupedSchedules = useMemo(() => {
    return schedules.reduce((result, item) => {
      const key = Number(item?.dayOfWeek || 0);
      if (!result[key]) result[key] = [];
      result[key].push(item);
      return result;
    }, {});
  }, [schedules]);

  const sections = useMemo(() => {
    const days = selectedDay === 'all'
      ? DAY_META
      : DAY_META.filter((day) => day.dayOfWeek === Number(selectedDay));

    return days
      .map((day) => ({
        ...day,
        date: getDateOfDay(payload?.weekStart || weekStart, day.dayOfWeek),
        data: groupedSchedules[day.dayOfWeek] || [],
      }))
      .filter((section) => selectedDay !== 'all' || section.data.length > 0);
  }, [groupedSchedules, payload?.weekStart, selectedDay, weekStart]);

  const currentTermLabel = useMemo(() => {
    const term = payload?.currentTerm;
    if (term?.semesterNum || term?.academicYear) {
      return `Học kỳ ${term?.semesterNum || '?'} · ${term?.academicYear || 'N/A'}`;
    }

    const firstItem = schedules[0];
    if (firstItem?.semester || firstItem?.academicYear) {
      return `Học kỳ ${firstItem?.semester || '?'} · ${firstItem?.academicYear || 'N/A'}`;
    }

    return 'Chưa xác định học kỳ';
  }, [payload?.currentTerm, schedules]);

  const summary = useMemo(() => {
    const distinctClasses = new Set(schedules.map((item) => item?.classCode).filter(Boolean)).size;
    const distinctSubjects = new Set(
      schedules.map((item) => item?.subject?.subjectCode).filter(Boolean),
    ).size;
    const todayCount = viewingCurrentWeek ? (groupedSchedules[todayDayOfWeek] || []).length : 0;

    return {
      sessions: schedules.length,
      classes: distinctClasses || distinctSubjects,
      todayCount,
    };
  }, [groupedSchedules, schedules, todayDayOfWeek, viewingCurrentWeek]);

  const moveWeek = (amount) => {
    setWeekStart(toDateStr(addDays(weekStart, amount)));
  };

  if (loading) {
    return (
      <View style={styles.centeredBox}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.helperText}>Đang tải thời khóa biểu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => {
          return [
            item?.classId || item?.classCode || item?.subject?.subjectCode || 'schedule',
            item?.dayOfWeek || '0',
            item?.startPeriod || item?.startTime || 'start',
            item?.endPeriod || item?.endTime || 'end',
            index,
          ].join('-');
        }}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadSchedule(true)} />}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroGlowLarge} />
              <View style={styles.heroGlowSmall} />

              <Text style={styles.heroEyebrow}>Đồng bộ từ thời khóa biểu thật</Text>
              <Text style={styles.heroTitle}>Thời khóa biểu tuần</Text>
              <Text style={styles.heroSubtitle}>
                Hiển thị đúng lớp học, giảng viên, phòng, giờ học và slot theo dữ liệu đang dùng ở frontend.
              </Text>

              <View style={styles.termBadge}>
                <MaterialCommunityIcons name="school-outline" size={16} color="#fef3c7" />
                <Text style={styles.termBadgeText}>{currentTermLabel}</Text>
              </View>

              <View style={styles.weekNavRow}>
                <Pressable onPress={() => moveWeek(-7)} style={styles.weekArrowBtn}>
                  <Ionicons name="chevron-back" size={18} color="#ffffff" />
                </Pressable>

                <View style={styles.weekRangeBox}>
                  <Text style={styles.weekRangeLabel}>Tuần đang xem</Text>
                  <Text style={styles.weekRangeValue}>
                    {formatWeekRange(payload?.weekStart || weekStart, payload?.weekEnd || toDateStr(addDays(weekStart, 6)))}
                  </Text>
                  <Text style={styles.weekRangeHint}>
                    {viewingCurrentWeek ? 'Đây là tuần hiện tại' : 'Bạn đang xem tuần khác'}
                  </Text>
                </View>

                <Pressable onPress={() => moveWeek(7)} style={styles.weekArrowBtn}>
                  <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                </Pressable>
              </View>

                <Pressable
                onPress={() => setWeekStart(currentWeekStart)}
                style={[styles.currentWeekBtn, weekStart === currentWeekStart && styles.currentWeekBtnActive]}
              >
                <MaterialCommunityIcons name="calendar-refresh-outline" size={16} color="#0f172a" />
                <Text style={styles.currentWeekBtnText}>Về tuần hiện tại</Text>
              </Pressable>

              <View style={styles.summaryRow}>
                <SummaryBox label="Buổi trong tuần" value={String(summary.sessions)} tone="blue" />
                <SummaryBox label="Lớp / môn" value={String(summary.classes)} tone="amber" />
                <SummaryBox label="Hôm nay" value={String(summary.todayCount)} tone="green" />
              </View>
            </View>

            {error ? (
              <View style={styles.errorCard}>
                <View style={styles.errorCopy}>
                  <Text style={styles.errorTitle}>Không tải được lịch học</Text>
                  <Text style={styles.errorText}>{error}</Text>
                </View>

                <Pressable style={styles.errorButton} onPress={() => loadSchedule(false)}>
                  <Text style={styles.errorButtonText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.filterCard}>
              <Text style={styles.filterTitle}>Lọc theo ngày</Text>
              <Text style={styles.filterSubtitle}>Chạm vào từng ngày để xem riêng, hoặc giữ ở chế độ cả tuần.</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayChipRow}
              >
                <Pressable
                  onPress={() => setSelectedDay('all')}
                  style={[styles.dayChip, selectedDay === 'all' && styles.dayChipActive]}
                >
                  <Text style={[styles.dayChipMain, selectedDay === 'all' && styles.dayChipMainActive]}>
                    Cả tuần
                  </Text>
                  <Text style={[styles.dayChipSub, selectedDay === 'all' && styles.dayChipSubActive]}>
                    {summary.sessions} buổi
                  </Text>
                </Pressable>

                {DAY_META.map((day) => {
                  const date = getDateOfDay(payload?.weekStart || weekStart, day.dayOfWeek);
                  const count = (groupedSchedules[day.dayOfWeek] || []).length;
                  const active = Number(selectedDay) === day.dayOfWeek;
                  const highlightToday = viewingCurrentWeek && todayDayOfWeek === day.dayOfWeek;

                  return (
                    <Pressable
                      key={day.dayOfWeek}
                      onPress={() => setSelectedDay(day.dayOfWeek)}
                      style={[
                        styles.dayChip,
                        active && styles.dayChipActive,
                        highlightToday && styles.dayChipToday,
                      ]}
                    >
                      <Text style={[styles.dayChipMain, active && styles.dayChipMainActive]}>
                        {day.short}
                      </Text>
                      <Text style={[styles.dayChipDate, active && styles.dayChipDateActive]}>
                        {formatDateShort(date)}
                      </Text>
                      <Text style={[styles.dayChipSub, active && styles.dayChipSubActive]}>
                        {count} buổi
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !error ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={46} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Chưa có lịch học trong tuần này</Text>
              <Text style={styles.emptyText}>
                Nếu lớp đã được xếp lịch ở hệ thống web thì màn này sẽ tự đồng bộ khi bạn kéo xuống để làm mới.
              </Text>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => {
          const highlightToday = viewingCurrentWeek && isSameDate(section.date, today);

          return (
            <View style={[styles.sectionHeader, highlightToday && styles.sectionHeaderToday]}>
              <View style={styles.sectionDateBadge}>
                <Text style={styles.sectionDateDay}>{String(section.date.getDate()).padStart(2, '0')}</Text>
                <Text style={styles.sectionDateMonth}>/{String(section.date.getMonth() + 1).padStart(2, '0')}</Text>
              </View>

              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>{section.label}</Text>
                <Text style={styles.sectionSubtitle}>{formatDateLong(section.date)}</Text>
              </View>

              <View style={styles.sectionCountBadge}>
                <Text style={styles.sectionCountText}>{section.data.length} buổi</Text>
              </View>
            </View>
          );
        }}
        renderItem={({ item, section }) => {
          const highlightToday = viewingCurrentWeek && isSameDate(section.date, today);
          return <ScheduleCard item={item} isToday={highlightToday} />;
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        SectionSeparatorComponent={() => <View style={{ height: 18 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 110,
  },
  headerWrap: {
    gap: 14,
    marginBottom: 16,
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
  heroCard: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#0f172a',
    padding: 18,
  },
  heroGlowLarge: {
    position: 'absolute',
    top: -36,
    right: -16,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1d4ed8',
    opacity: 0.28,
  },
  heroGlowSmall: {
    position: 'absolute',
    right: 52,
    top: 92,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f59e0b',
    opacity: 0.18,
  },
  heroEyebrow: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 6,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 20,
  },
  termBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  termBadgeText: {
    color: '#fef3c7',
    fontWeight: '700',
    fontSize: 13,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  weekArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRangeBox: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  weekRangeLabel: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  weekRangeValue: {
    marginTop: 3,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  weekRangeHint: {
    marginTop: 3,
    color: '#cbd5e1',
    fontSize: 12,
  },
  currentWeekBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  currentWeekBtnActive: {
    backgroundColor: '#fde68a',
  },
  currentWeekBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryLabel: {
    fontSize: 12,
  },
  summaryValue: {
    marginTop: 5,
    fontSize: 22,
    fontWeight: '800',
  },
  errorCard: {
    borderRadius: 22,
    backgroundColor: '#fee2e2',
    padding: 16,
    gap: 12,
  },
  errorCopy: {
    gap: 4,
  },
  errorTitle: {
    color: '#991b1b',
    fontSize: 16,
    fontWeight: '800',
  },
  errorText: {
    color: '#b91c1c',
    lineHeight: 19,
  },
  errorButton: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorButtonText: {
    color: '#991b1b',
    fontWeight: '700',
  },
  filterCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  filterTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  filterSubtitle: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 18,
  },
  dayChipRow: {
    gap: 10,
    paddingTop: 14,
    paddingRight: 8,
  },
  dayChip: {
    minWidth: 78,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  dayChipToday: {
    borderColor: '#93c5fd',
  },
  dayChipMain: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
  dayChipMainActive: {
    color: '#ffffff',
  },
  dayChipDate: {
    marginTop: 3,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  dayChipDateActive: {
    color: '#fff7ed',
  },
  dayChipSub: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 11,
  },
  dayChipSubActive: {
    color: '#ffedd5',
  },
  emptyCard: {
    borderRadius: 22,
    backgroundColor: '#ffffff',
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  sectionHeaderToday: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
  },
  sectionDateBadge: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  sectionDateDay: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
  },
  sectionDateMonth: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionCopy: {
    flex: 1,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
  },
  sectionCountBadge: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionCountText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  sessionCard: {
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  sessionCardToday: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  sessionAccent: {
    width: 8,
  },
  sessionBody: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sessionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sessionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  subjectBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subjectBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  classBadge: {
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  classBadgeText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  attendanceBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attendanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  subjectName: {
    marginTop: 12,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  metaList: {
    gap: 8,
    marginTop: 14,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
});
