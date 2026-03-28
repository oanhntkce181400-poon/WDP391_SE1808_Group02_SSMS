import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import feedbackService from '../../services/feedbackService';
import feedbackSubmissionService from '../../services/feedbackSubmissionService';

function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Chua thiet lap'
    : date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Ho_Chi_Minh',
      });
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return '0 phut';
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const parts = [];
  if (days > 0) parts.push(`${days} ngay`);
  if (hours > 0) parts.push(`${hours} gio`);
  if (minutes > 0) parts.push(`${minutes} phut`);
  return parts.join(' ') || 'duoi 1 phut';
}

function normalizeClassItem(item) {
  return {
    id: item?._id || '',
    classCode: item?.classCode || 'N/A',
    className: item?.className || 'Lop hoc',
    subjectId: item?.subject?._id || '',
    subjectCode: item?.subject?.subjectCode || 'N/A',
    subjectName: item?.subject?.subjectName || item?.className || 'Mon hoc',
    teacherId: item?.teacher?._id || '',
    teacherName: item?.teacher?.fullName || 'Chua phan cong giang vien',
    semester: item?.semester || 'N/A',
    academicYear: item?.academicYear || 'N/A',
    room:
      item?.room?.roomNumber ||
      item?.room?.roomCode ||
      item?.room?.roomName ||
      'Chua co phong',
  };
}

function getSubmissionClassId(submission) {
  return String(submission?.classSection?._id || submission?.classSection || '');
}

function buildResponses(template, submission) {
  const answers = new Map(
    (submission?.responses || []).map((item) => [String(item.questionId || ''), item.answer]),
  );
  return (template?.questions || []).map((question) => ({
    questionId: question._id,
    questionText: question.questionText,
    questionType: question.questionType,
    answer:
      answers.get(String(question._id)) ??
      (question.questionType === 'rating' ? 0 : ''),
  }));
}

function sanitizeResponses(rows = []) {
  return rows.filter((row) =>
    row.questionType === 'rating'
      ? Number(row.answer) > 0
      : String(row.answer || '').trim().length > 0,
  );
}

function StatCard({ label, value, color }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.mutedText}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

function RatingRow({ value, onChange, disabled = false }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = Number(value) >= star;
        return (
          <Pressable
            key={star}
            onPress={() => !disabled && onChange?.(star)}
            style={[styles.starButton, active ? styles.starOn : styles.starOff]}
          >
            <Text style={[styles.starText, active ? styles.starTextOn : styles.starTextOff]}>★</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function StudentFeedbackCampaignView() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [classes, setClasses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [responses, setResponses] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [now, setNow] = useState(() => new Date());

  const template = availability?.template || null;

  const liveAvailability = useMemo(() => {
    if (!availability) return null;
    const currentMs = now.getTime();
    const startMs = availability.startsAt ? new Date(availability.startsAt).getTime() : NaN;
    const endMs = availability.endsAt ? new Date(availability.endsAt).getTime() : NaN;
    if (Number.isFinite(startMs) && currentMs < startMs) {
      return { ...availability, isOpen: false, message: `Dot danh gia se mo tu ${formatDateTime(availability.startsAt)}.` };
    }
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && currentMs >= startMs && currentMs <= endMs) {
      return { ...availability, isOpen: true, message: `Dot danh gia dang mo den ${formatDateTime(availability.endsAt)}.` };
    }
    if (Number.isFinite(endMs) && currentMs > endMs) {
      return { ...availability, isOpen: false, message: `Dot danh gia da ket thuc vao ${formatDateTime(availability.endsAt)}.` };
    }
    return availability;
  }, [availability, now]);

  const eligibleClasses = useMemo(() => {
    if (!template) return [];
    return classes.filter((item) => {
      if (!item.teacherId) return false;
      if (template.classSection && String(template.classSection._id || template.classSection) !== String(item.id)) return false;
      if (template.subject && String(template.subject._id || template.subject) !== String(item.subjectId || '')) return false;
      return true;
    });
  }, [classes, template]);

  const submissionByClassId = useMemo(
    () => new Map(submissions.map((item) => [getSubmissionClassId(item), item]).filter(([id]) => id)),
    [submissions],
  );

  const selectedClass = eligibleClasses.find((item) => item.id === selectedClassId) || null;
  const currentSubmission = selectedClassId ? submissionByClassId.get(String(selectedClassId)) || null : null;
  const submittedCount = eligibleClasses.filter((item) => submissionByClassId.has(String(item.id))).length;
  const pendingCount = Math.max(eligibleClasses.length - submittedCount, 0);

  async function loadPageData(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    if (!isRefresh) setMessage({ type: '', text: '' });

    try {
      const [availabilityRes, classesRes] = await Promise.all([
        feedbackService.getFeedbackAvailability(),
        feedbackService.getMyClasses(),
      ]);
      const nextAvailability = availabilityRes?.data?.data || null;
      const nextClasses = Array.isArray(classesRes?.data?.data)
        ? classesRes.data.data.map(normalizeClassItem)
        : [];
      setAvailability(nextAvailability);
      setClasses(nextClasses);

      if (nextAvailability?.template?._id) {
        const submissionsRes = await feedbackSubmissionService.getMySubmissions({
          feedbackTemplateId: nextAvailability.template._id,
          evaluationType: 'teacher',
        });
        setSubmissions(Array.isArray(submissionsRes?.data?.data) ? submissionsRes.data.data : []);
      } else {
        setSubmissions([]);
      }
    } catch (error) {
      console.error('Error loading student feedback campaign:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Khong the tai du lieu danh gia giang vien luc nay.',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadPageData(false);
  }, []);

  useEffect(() => {
    const timerId = global.setInterval(() => setNow(new Date()), 1000);
    return () => global.clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!eligibleClasses.length) {
      setSelectedClassId('');
      return;
    }
    if (eligibleClasses.some((item) => item.id === selectedClassId)) return;
    const pending = eligibleClasses.find((item) => !submissionByClassId.has(String(item.id)));
    setSelectedClassId(pending?.id || eligibleClasses[0]?.id || '');
  }, [eligibleClasses, selectedClassId, submissionByClassId]);

  useEffect(() => {
    setResponses(buildResponses(template, currentSubmission));
  }, [template, currentSubmission?._id, selectedClassId]);

  async function handleSubmit() {
    if (!template || !selectedClass) {
      setMessage({ type: 'error', text: 'Vui long chon lop hoc de gui feedback.' });
      return;
    }
    for (const question of template.questions || []) {
      const row = responses.find((item) => String(item.questionId) === String(question._id));
      if (question.isRequired && !row?.answer) {
        setMessage({ type: 'error', text: `Vui long tra loi cau hoi: ${question.questionText}` });
        return;
      }
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      await feedbackSubmissionService.submitFeedback({
        feedbackTemplateId: template._id,
        evaluatedEntityId: selectedClass.teacherId,
        evaluationType: 'teacher',
        classSectionId: selectedClass.id,
        responses: sanitizeResponses(responses),
      });
      await loadPageData(true);
      setMessage({ type: 'success', text: `Da gui feedback cho lop ${selectedClass.classCode} thanh cong.` });
    } catch (error) {
      console.error('Error submitting student feedback campaign:', error);
      setMessage({
        type: 'error',
        text: error?.response?.data?.message || 'Khong the gui feedback luc nay.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const countdown = useMemo(() => {
    if (!liveAvailability) return null;
    const target = liveAvailability.isOpen ? liveAvailability.endsAt : liveAvailability.startsAt;
    const remaining = target ? new Date(target).getTime() - now.getTime() : 0;
    return remaining > 0
      ? liveAvailability.isOpen
        ? `Con lai ${formatDuration(remaining)} de hoan thanh danh gia.`
        : `Con ${formatDuration(remaining)} nua se mo danh gia.`
      : null;
  }, [liveAvailability, now]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.mutedText}>Dang tai cong danh gia giang vien...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadPageData(true)} />}
      >
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Danh gia giang vien</Text>
              <Text style={styles.mutedText}>Mobile nay da doc cung nguon feedback-submissions voi web.</Text>
            </View>
            <View style={styles.topActions}>
              <Pressable onPress={() => loadPageData(true)} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Tai lai</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {message.text ? (
          <Text style={message.type === 'error' ? styles.errorText : styles.successText}>{message.text}</Text>
        ) : null}

        {liveAvailability ? (
          <View style={[styles.card, liveAvailability.isOpen ? styles.infoOpen : styles.infoClosed]}>
            <Text style={styles.smallLabel}>{liveAvailability.isOpen ? 'Dot feedback dang mo' : 'Dot feedback chua mo'}</Text>
            <Text style={styles.sectionTitle}>{liveAvailability.message}</Text>
            <Text style={styles.mutedText}>{template?.templateName ? `Mau hien tai: ${template.templateName}.` : 'Hien chua co mau feedback.'}</Text>
            <Text style={styles.mutedText}>Bat dau: {liveAvailability.startsAtLabel || 'Chua thiet lap'}</Text>
            <Text style={styles.mutedText}>Ket thuc: {liveAvailability.endsAtLabel || 'Chua thiet lap'}</Text>
            {countdown ? <Text style={styles.countdownText}>{countdown}</Text> : null}
          </View>
        ) : null}

        {!liveAvailability?.isOpen ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hien chua den thoi gian danh gia</Text>
            <Text style={styles.mutedText}>Khi quan tri vien mo dot feedback, he thong se hien danh sach lop va bieu mau ngay tai day.</Text>
          </View>
        ) : eligibleClasses.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Chua co lop phu hop de danh gia</Text>
            <Text style={styles.mutedText}>Ban chua co lop nao khop voi mau feedback hien tai, hoac lop chua duoc gan giang vien.</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsRow}>
              <StatCard label="Tong lop" value={eligibleClasses.length} />
              <StatCard label="Da gui" value={submittedCount} color="#059669" />
              <StatCard label="Con lai" value={pendingCount} color="#d97706" />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Chon lop</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {eligibleClasses.map((item) => {
                  const active = item.id === selectedClassId;
                  return (
                    <Pressable key={item.id} onPress={() => setSelectedClassId(item.id)} style={[styles.chip, active ? styles.chipActive : null]}>
                      <Text style={[styles.chipCode, active ? styles.chipTextActive : null]}>{item.subjectCode}</Text>
                      <Text style={[styles.chipSub, active ? styles.chipTextActive : null]}>{item.classCode}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {selectedClass ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.smallLabel}>{selectedClass.subjectCode}</Text>
                  <Text style={styles.title2}>{selectedClass.subjectName}</Text>
                  <Text style={styles.mutedText}>{`${selectedClass.classCode} - ${selectedClass.className}`}</Text>
                  <View style={styles.metaGrid}>
                    <Text style={styles.metaText}>Giang vien: {selectedClass.teacherName}</Text>
                    <Text style={styles.metaText}>Hoc ky: {selectedClass.semester}</Text>
                    <Text style={styles.metaText}>Nam hoc: {selectedClass.academicYear}</Text>
                    <Text style={styles.metaText}>Phong: {selectedClass.room}</Text>
                  </View>
                </View>

                {currentSubmission ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Ban da gui feedback cho lop nay</Text>
                    <Text style={styles.mutedText}>Gui luc {formatDateTime(currentSubmission.createdAt)}</Text>
                    <Text style={[styles.mutedText, { marginTop: 6 }]}>Diem trung binh: {Number(currentSubmission?.submissionScore || 0).toFixed(2)}</Text>
                    {(template?.questions || []).map((question) => {
                      const row = responses.find((item) => String(item.questionId) === String(question._id));
                      return (
                        <View key={question._id} style={styles.questionBlock}>
                          <Text style={styles.questionText}>{question.questionText}</Text>
                          <Text style={styles.answerText}>
                            {question.questionType === 'rating'
                              ? `${row?.answer || 0}/5`
                              : row?.answer || 'Khong co cau tra loi.'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Gui feedback cua ban</Text>
                    {(template?.questions || []).map((question) => {
                      const row = responses.find((item) => String(item.questionId) === String(question._id));
                      return (
                        <View key={question._id} style={styles.questionBlock}>
                          <Text style={styles.questionText}>{question.questionText}</Text>
                          {question.questionType === 'rating' ? (
                            <RatingRow value={row?.answer || 0} onChange={(value) => setResponses((current) => current.map((item) => String(item.questionId) === String(question._id) ? { ...item, answer: value } : item))} />
                          ) : question.questionType === 'multipleChoice' ? (
                            <View style={styles.choiceList}>
                              {(question.options || []).map((option) => {
                                const active = String(row?.answer || '') === String(option.value);
                                return (
                                  <Pressable key={option._id || option.value} onPress={() => setResponses((current) => current.map((item) => String(item.questionId) === String(question._id) ? { ...item, answer: option.value } : item))} style={[styles.choiceOption, active ? styles.choiceOptionActive : null]}>
                                    <Text style={[styles.choiceText, active ? styles.choiceTextActive : null]}>{option.label}</Text>
                                  </Pressable>
                                );
                              })}
                            </View>
                          ) : (
                            <TextInput
                              value={String(row?.answer || '')}
                              onChangeText={(value) => setResponses((current) => current.map((item) => String(item.questionId) === String(question._id) ? { ...item, answer: value } : item))}
                              multiline
                              numberOfLines={4}
                              textAlignVertical="top"
                              placeholder="Nhap cau tra loi cua ban..."
                              style={styles.input}
                            />
                          )}
                        </View>
                      );
                    })}
                    <Pressable onPress={handleSubmit} disabled={submitting} style={[styles.primaryButton, submitting ? { opacity: 0.6 } : null]}>
                      <Text style={styles.primaryButtonText}>{submitting ? 'Dang gui...' : 'Gui feedback'}</Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 },
  content: { padding: 14, paddingBottom: 90, gap: 12 },
  card: { borderRadius: 18, backgroundColor: '#ffffff', padding: 16, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  topActions: { alignItems: 'flex-end', gap: 10 },
  primaryButton: { borderRadius: 12, backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  title2: { marginTop: 4, fontSize: 20, fontWeight: '800', color: '#0f172a' },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  smallLabel: { color: '#0369a1', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  mutedText: { marginTop: 4, color: '#64748b', lineHeight: 20 },
  countdownText: { marginTop: 8, color: '#0369a1', fontWeight: '700' },
  errorText: { borderRadius: 12, backgroundColor: '#fee2e2', color: '#b91c1c', paddingHorizontal: 14, paddingVertical: 12 },
  successText: { borderRadius: 12, backgroundColor: '#dcfce7', color: '#166534', paddingHorizontal: 14, paddingVertical: 12 },
  infoOpen: { borderWidth: 1, borderColor: '#a7f3d0', backgroundColor: '#ecfdf5' },
  infoClosed: { borderWidth: 1, borderColor: '#fde68a', backgroundColor: '#fffbeb' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 16, backgroundColor: '#ffffff', padding: 14, shadowColor: '#000000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  statValue: { marginTop: 8, color: '#0f172a', fontSize: 24, fontWeight: '800' },
  chipRow: { gap: 10, paddingTop: 14 },
  chip: { minWidth: 124, borderRadius: 16, backgroundColor: '#eff6ff', paddingHorizontal: 14, paddingVertical: 12 },
  chipActive: { backgroundColor: '#1d4ed8' },
  chipCode: { color: '#1e3a8a', fontWeight: '800', fontSize: 13 },
  chipSub: { marginTop: 4, color: '#334155', fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  metaGrid: { marginTop: 12, gap: 6 },
  metaText: { color: '#334155', lineHeight: 20 },
  questionBlock: { marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 14 },
  questionText: { color: '#0f172a', fontWeight: '700', lineHeight: 20 },
  answerText: { marginTop: 8, color: '#334155', lineHeight: 20 },
  input: { minHeight: 110, marginTop: 10, borderRadius: 14, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
  starRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  starButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  starOn: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  starOff: { backgroundColor: '#ffffff', borderColor: '#cbd5e1' },
  starText: { fontSize: 20, fontWeight: '800' },
  starTextOn: { color: '#ffffff' },
  starTextOff: { color: '#94a3b8' },
  choiceList: { gap: 8, marginTop: 10 },
  choiceOption: { borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 12 },
  choiceOptionActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  choiceText: { color: '#334155', fontWeight: '600' },
  choiceTextActive: { color: '#1d4ed8' },
});
