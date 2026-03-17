import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CalendarList } from 'react-native-calendars';
import academicCalendarService from '../../services/academicCalendarService';

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toLocalDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildMarkedDates(events) {
  const markedDates = {};

  events.forEach((event) => {
    const start = toLocalDate(event.startDate);
    const end = toLocalDate(event.endDate);
    if (!start || !end || end < start) return;

    const startKey = toDateKey(start);
    const endKey = toDateKey(end);
    const color = event.color || '#f97316';

    const cursor = new Date(start);
    while (cursor <= end) {
      const key = toDateKey(cursor);
      markedDates[key] = {
        startingDay: key === startKey,
        endingDay: key === endKey,
        color,
        textColor: '#ffffff',
      };
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  return markedDates;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
}

export default function AcademicCalendarScreen() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadEvents() {
      setLoading(true);
      setError('');
      try {
        const response = await academicCalendarService.getEvents(year);
        if (!mounted) return;
        setEvents(response?.data?.data || []);
      } catch (err) {
        if (!mounted) return;
        setError(err?.response?.data?.message || 'Không thể tải lịch nghỉ. Vui lòng thử lại.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      mounted = false;
    };
  }, [year]);

  const markedDates = useMemo(() => buildMarkedDates(events), [events]);

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Lịch nghỉ trong năm</Text>
        <Text style={styles.headerSubtitle}>Màu sắc thể hiện khoảng ngày của từng kỳ nghỉ</Text>

        <View style={styles.yearSwitcher}>
          <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev - 1)}>
            <Text style={styles.yearButtonText}>Năm trước</Text>
          </Pressable>
          <Text style={styles.yearValue}>{year}</Text>
          <Pressable style={styles.yearButton} onPress={() => setYear((prev) => prev + 1)}>
            <Text style={styles.yearButtonText}>Năm sau</Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Đang tải lịch nghỉ...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.calendarWrap}>
            <CalendarList
              current={`${year}-01-01`}
              pastScrollRange={0}
              futureScrollRange={11}
              markingType="period"
              markedDates={markedDates}
              minDate={`${year}-01-01`}
              maxDate={`${year}-12-31`}
              showScrollIndicator
              theme={{
                todayTextColor: '#1d4ed8',
                monthTextColor: '#0f172a',
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                arrowColor: '#f59e0b',
              }}
            />
          </View>

          <View style={styles.legendWrap}>
            <Text style={styles.legendTitle}>Danh sách kỳ nghỉ</Text>
            {events.length === 0 ? (
              <Text style={styles.emptyText}>Năm nay chưa có kỳ nghỉ được thiết lập.</Text>
            ) : (
              events.map((event) => (
                <View key={event._id} style={styles.eventRow}>
                  <View style={[styles.eventColor, { backgroundColor: event.color || '#f97316' }]} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventName}>{event.name}</Text>
                    <Text style={styles.eventRange}>
                      {formatDate(event.startDate)} - {formatDate(event.endDate)}
                    </Text>
                    {event.description ? <Text style={styles.eventDescription}>{event.description}</Text> : null}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerCard: {
    margin: 14,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    marginTop: 4,
    color: '#475569',
    fontSize: 13,
  },
  yearSwitcher: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  yearButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearButtonText: {
    color: '#c2410c',
    fontWeight: '600',
  },
  yearValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f59e0b',
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 8,
    color: '#475569',
  },
  errorText: {
    color: '#b91c1c',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  calendarWrap: {
    marginHorizontal: 14,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  legendWrap: {
    marginTop: 14,
    marginHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventColor: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginTop: 4,
  },
  eventInfo: {
    flex: 1,
  },
  eventName: {
    fontWeight: '700',
    color: '#1e293b',
  },
  eventRange: {
    marginTop: 2,
    color: '#475569',
    fontSize: 12,
  },
  eventDescription: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
  },
});
