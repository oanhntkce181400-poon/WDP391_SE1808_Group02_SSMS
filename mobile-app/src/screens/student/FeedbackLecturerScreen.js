import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import feedbackService from '../../services/feedbackService';
import StudentFeedbackCampaignView from './StudentFeedbackCampaignView';
import useAuthStore from '../../stores/useAuthStore';

/*
 * Màn hình này gộp 3 nhu cầu vào một nơi:
 * 1. Chọn lớp để xem điểm và phản hồi về giảng viên.
 * 2. Sinh viên gửi hoặc cập nhật đánh giá của chính mình.
 * 3. Sinh viên mở lại danh sách "đánh giá của tôi" để chỉnh sửa nhanh.
 *
 * Admin/staff đi cùng một màn nhưng ở chế độ chỉ xem, tránh phải duy trì
 * một luồng màn hình riêng cho cùng một bộ dữ liệu feedback.
 */
const CRITERIA = [
  { key: 'teachingQuality', label: 'Chất lượng giảng dạy' },
  { key: 'courseContent', label: 'Nội dung môn học' },
  { key: 'classEnvironment', label: 'Môi trường lớp học' },
  { key: 'materialQuality', label: 'Chất lượng tài liệu' },
];

function normalizeRole(value) {
  return String(value || '').trim().toLowerCase();
}

function emptyForm() {
  return {
    rating: 0,
    comment: '',
    isAnonymous: true,
    criteria: {
      teachingQuality: 0,
      courseContent: 0,
      classEnvironment: 0,
      materialQuality: 0,
    },
  };
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatSentiment(value) {
  switch (String(value || '').trim().toLowerCase()) {
    case 'excellent':
      return 'Xuất sắc';
    case 'very good':
      return 'Rất tốt';
    case 'good':
      return 'Tốt';
    case 'average':
      return 'Trung bình';
    case 'fair':
      return 'Khá thấp';
    case 'poor':
      return 'Thấp';
    case 'no feedback yet':
      return 'Chưa có đánh giá';
    default:
      return value || 'N/A';
  }
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeClasses(rows = []) {
  return rows.map((item) => ({
    id: item._id,
    classCode: item.classCode || 'N/A',
    className: item.className || 'Lớp học',
    semester: item.semester || null,
    academicYear: item.academicYear || '',
    subjectCode: item.subject?.subjectCode || item.subjectCode || 'N/A',
    subjectName: item.subject?.subjectName || item.className || 'Môn học',
    lecturerName: item.teacher?.fullName || 'Chưa phân công giảng viên',
    teacherCode: item.teacher?.teacherCode || '',
    roomName: item.room?.roomNumber || item.room?.roomCode || item.room?.roomName || 'Chưa có phòng',
  }));
}

function normalizeMyFeedback(rows = []) {
  return rows.map((item) => ({
    id: item._id,
    classSectionId: item.classSection?._id || item.classSection,
    subjectCode: item.classSection?.subject?.subjectCode || item.classSection?.subjectCode || 'N/A',
    className: item.classSection?.className || 'Lớp học',
    lecturerName: item.classSection?.teacher?.fullName || 'Chưa phân công giảng viên',
    rating: Number(item.rating || 0),
    comment: item.comment || '',
    isAnonymous: item.isAnonymous !== false,
    criteria: {
      teachingQuality: Number(item.criteria?.teachingQuality || 0),
      courseContent: Number(item.criteria?.courseContent || 0),
      classEnvironment: Number(item.criteria?.classEnvironment || 0),
      materialQuality: Number(item.criteria?.materialQuality || 0),
    },
    createdAt: item.createdAt,
  }));
}

function StarRow({ value, onChange, size = 22, disabled = false }) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => !disabled && onChange?.(star)} hitSlop={6}>
          <MaterialCommunityIcons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? '#f59e0b' : '#cbd5e1'}
          />
        </Pressable>
      ))}
    </View>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function FeedbackCard({ item, onOpen }) {
  return (
    <Pressable style={styles.myFeedbackCard} onPress={onOpen}>
      <View style={styles.feedbackCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.feedbackSubject}>{item.subjectCode}</Text>
          <Text style={styles.feedbackClassName}>{item.className}</Text>
          <Text style={styles.feedbackMeta}>Giảng viên: {item.lecturerName}</Text>
        </View>
        <Text style={styles.feedbackRating}>{`${item.rating}/5`}</Text>
      </View>

      <Text style={styles.feedbackMeta}>Đã gửi: {formatDate(item.createdAt)}</Text>
      <Text style={styles.feedbackComment} numberOfLines={2}>
        {item.comment || 'Chưa có nhận xét chi tiết.'}
      </Text>
      <View style={styles.feedbackPill}>
        <Text style={styles.feedbackPillText}>
          {item.isAnonymous ? 'Đánh giá ẩn danh' : 'Đánh giá có tên'}
        </Text>
      </View>
    </Pressable>
  );
}

export default function FeedbackLecturerScreen({ onNavigate }) {
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.role);
  const isStudent = role === 'student';

  if (isStudent) {
    return <StudentFeedbackCampaignView onNavigate={onNavigate} />;
  }

  const [classes, setClasses] = useState([]);
  const [myFeedbacks, setMyFeedbacks] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classFeedbacks, setClassFeedbacks] = useState([]);
  const [classStats, setClassStats] = useState(null);
  const [windowInfo, setWindowInfo] = useState(null);
  const [windowInfoLoading, setWindowInfoLoading] = useState(false);
  const [feedbackAvailability, setFeedbackAvailability] = useState(null);
  const [feedbackAvailabilityLoading, setFeedbackAvailabilityLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState('classes');
  const [classSearchInput, setClassSearchInput] = useState('');
  const [classSearchQuery, setClassSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const visibleClasses = useMemo(() => {
    if (isStudent || !classSearchQuery) {
      return classes;
    }

    const keyword = normalizeSearchText(classSearchQuery);

    return classes.filter((item) =>
      [
        item.subjectCode,
        item.subjectName,
        item.classCode,
        item.className,
        item.lecturerName,
        item.teacherCode,
        item.roomName,
        item.semester,
        item.academicYear,
      ].some((field) => normalizeSearchText(field).includes(keyword)),
    );
  }, [classes, classSearchQuery, isStudent]);

  const selectedClass = useMemo(
    () => visibleClasses.find((item) => item.id === selectedClassId) || null,
    [visibleClasses, selectedClassId],
  );

  const currentFeedback = useMemo(
    () => myFeedbacks.find((item) => item.classSectionId === selectedClassId) || null,
    [myFeedbacks, selectedClassId],
  );

  /*
   * Khi sinh viên đã có feedback, màn hình chỉ mở form cập nhật sau khi
   * windowInfo xác nhận đợt feedback vẫn còn hiệu lực.
   */
  const isEditingCurrentFeedback = isStudent && !!currentFeedback;
  const canEditCurrentFeedback =
    isEditingCurrentFeedback && !windowInfoLoading && windowInfo?.isValid === true;
  const canCreateFeedback =
    isStudent &&
    !currentFeedback &&
    !feedbackAvailabilityLoading &&
    feedbackAvailability?.isOpen === true;
  const feedbackFormLocked =
    isStudent && (isEditingCurrentFeedback ? !canEditCurrentFeedback : !canCreateFeedback);

  function resetMessages() {
    setError('');
    setSuccess('');
  }

  function syncFormWithFeedback(feedback) {
    if (!feedback) {
      setForm(emptyForm());
      setWindowInfo(null);
      setWindowInfoLoading(false);
      return;
    }

    setForm({
      rating: feedback.rating,
      comment: feedback.comment,
      isAnonymous: feedback.isAnonymous,
      criteria: {
        teachingQuality: feedback.criteria?.teachingQuality || 0,
        courseContent: feedback.criteria?.courseContent || 0,
        classEnvironment: feedback.criteria?.classEnvironment || 0,
        materialQuality: feedback.criteria?.materialQuality || 0,
      },
    });
  }

  async function loadBaseData(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    resetMessages();

    try {
      if (isStudent) {
        const [classesResponse, myFeedbackResponse] = await Promise.all([
          feedbackService.getMyClasses(),
          feedbackService.getMyFeedback(),
        ]);

        const nextClasses = normalizeClasses(classesResponse?.data?.data || []);
        const nextFeedbacks = normalizeMyFeedback(myFeedbackResponse?.data?.data || []);
        const preferredClassId = selectedClassId && nextClasses.some((item) => item.id === selectedClassId)
          ? selectedClassId
          : nextClasses[0]?.id || '';

        setClasses(nextClasses);
        setMyFeedbacks(nextFeedbacks);
        setSelectedClassId(preferredClassId);
        syncFormWithFeedback(
          nextFeedbacks.find((item) => item.classSectionId === preferredClassId) || null,
        );
      } else {
        /*
         * Admin/staff không có enrollment như sinh viên, nên màn hình đọc trực
         * tiếp danh sách lớp để xem các feedback đã được trả về từ backend.
         */
        const classesResponse = await feedbackService.getClassList();
        const nextClasses = normalizeClasses(classesResponse?.data?.data || []);
        const preferredClassId = selectedClassId && nextClasses.some((item) => item.id === selectedClassId)
          ? selectedClassId
          : nextClasses[0]?.id || '';

        setClasses(nextClasses);
        setMyFeedbacks([]);
        setSelectedClassId(preferredClassId);
        setForm(emptyForm());
        setWindowInfo(null);
        setWindowInfoLoading(false);
        setFeedbackAvailability(null);
        setFeedbackAvailabilityLoading(false);
      }
    } catch (err) {
      console.error('Error loading feedback base data:', err);
      setError(err?.response?.data?.message || 'Không thể tải dữ liệu đánh giá giảng viên.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadClassDetails(classSectionId, feedbackId) {
    const shouldLoadWindowInfo = isStudent && !!feedbackId;
    const shouldLoadAvailability = isStudent && !feedbackId;

    if (!classSectionId) {
      setClassFeedbacks([]);
      setClassStats(null);
      setWindowInfo(null);
      setWindowInfoLoading(false);
      setFeedbackAvailability(null);
      setFeedbackAvailabilityLoading(false);
      return;
    }

    if (shouldLoadWindowInfo) {
      setWindowInfo(null);
      setWindowInfoLoading(true);
    } else {
      setWindowInfo(null);
      setWindowInfoLoading(false);
    }

    if (shouldLoadAvailability) {
      setFeedbackAvailability(null);
      setFeedbackAvailabilityLoading(true);
    } else {
      setFeedbackAvailability(null);
      setFeedbackAvailabilityLoading(false);
    }

    try {
      const [feedbackResult, statsResult, metadataResult] = await Promise.allSettled([
        feedbackService.getClassFeedback(classSectionId),
        feedbackService.getClassFeedbackStats(classSectionId),
        shouldLoadWindowInfo
          ? feedbackService.getFeedbackWindowInfo(feedbackId)
          : shouldLoadAvailability
            ? feedbackService.getFeedbackAvailability()
            : Promise.resolve(null),
      ]);

      if (feedbackResult.status === 'rejected') {
        throw feedbackResult.reason;
      }

      if (statsResult.status === 'rejected') {
        throw statsResult.reason;
      }

      setClassFeedbacks(feedbackResult.value?.data?.data || []);
      setClassStats(statsResult.value?.data?.data || null);

      if (shouldLoadWindowInfo) {
        if (metadataResult.status === 'fulfilled') {
          setWindowInfo(metadataResult.value?.data?.data || null);
          return;
        }

        console.error('Error loading feedback window detail:', metadataResult.reason);
        setWindowInfo({
          isValid: false,
          error:
            metadataResult.reason?.response?.data?.message ||
            'Không thể kiểm tra thời gian cập nhật đánh giá lúc này.',
        });
        return;
      }

      if (!shouldLoadAvailability) {
        return;
      }

      if (metadataResult.status === 'fulfilled') {
        setFeedbackAvailability(metadataResult.value?.data?.data || null);
        return;
      }

      console.error('Error loading feedback availability:', metadataResult.reason);
      setFeedbackAvailability({
        isOpen: false,
        state: 'unavailable',
        message:
          metadataResult.reason?.response?.data?.message ||
          'Không thể kiểm tra thời gian gửi đánh giá lúc này.',
      });
    } catch (err) {
      console.error('Error loading class feedback detail:', err);
      if (shouldLoadWindowInfo) {
        setWindowInfo((previous) =>
          previous || {
            isValid: false,
            error: 'Không thể kiểm tra thời gian cập nhật đánh giá lúc này.',
          },
        );
      }
      if (shouldLoadAvailability) {
        setFeedbackAvailability((previous) =>
          previous || {
            isOpen: false,
            state: 'unavailable',
            message: 'Không thể kiểm tra thời gian gửi đánh giá lúc này.',
          },
        );
      }
      setError(err?.response?.data?.message || 'Không thể tải chi tiết đánh giá của lớp.');
    } finally {
      setWindowInfoLoading(false);
      setFeedbackAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    loadBaseData(false);
  }, [isStudent]);

  useEffect(() => {
    if (!isStudent && activeTab !== 'classes') {
      setActiveTab('classes');
    }
  }, [activeTab, isStudent]);

  useEffect(() => {
    const selectedFeedback = myFeedbacks.find((item) => item.classSectionId === selectedClassId) || null;
    syncFormWithFeedback(selectedFeedback);
    loadClassDetails(selectedClassId, selectedFeedback?.id);
  }, [selectedClassId, myFeedbacks, isStudent]);

  useEffect(() => {
    if (!isStudent && classSearchQuery && !visibleClasses.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(visibleClasses[0]?.id || '');
    }
  }, [visibleClasses, selectedClassId, isStudent, classSearchQuery]);

  function applyClassSearch() {
    setClassSearchQuery(classSearchInput);
  }

  function clearClassSearch() {
    setClassSearchInput('');
    setClassSearchQuery('');
  }

  async function handleSubmit() {
    if (!isStudent) {
      setError('Tài khoản này chỉ có quyền xem đánh giá giảng viên.');
      return;
    }

    if (!selectedClassId) {
      setError('Vui lòng chọn lớp học trước.');
      return;
    }

    if (currentFeedback) {
      if (windowInfoLoading) {
        setError('Đang kiểm tra thời gian cập nhật đánh giá. Vui lòng thử lại sau ít giây.');
        return;
      }

      if (!canEditCurrentFeedback) {
        setError(windowInfo?.error || 'Bạn không thể cập nhật đánh giá này.');
        return;
      }
    }

    if (!currentFeedback) {
      if (feedbackAvailabilityLoading) {
        setError('Đang kiểm tra thời gian gửi đánh giá. Vui lòng thử lại sau ít giây.');
        return;
      }

      if (!canCreateFeedback) {
        setError(feedbackAvailability?.message || 'Hiện chưa thể gửi đánh giá cho lớp này.');
        return;
      }
    }

    if (!form.rating) {
      setError('Vui lòng chọn điểm đánh giá tổng thể.');
      return;
    }

    try {
      setSaving(true);
      resetMessages();

      /*
       * Giá trị 0 không được gửi lên backend để phân biệt rõ giữa:
       * - sinh viên chưa đánh giá tiêu chí đó
       * - sinh viên thực sự chọn một điểm hợp lệ.
       */
      const payload = {
        classSection: selectedClassId,
        rating: Number(form.rating),
        comment: form.comment.trim(),
        criteria: Object.fromEntries(
          Object.entries(form.criteria).filter(([, value]) => Number(value) > 0),
        ),
        isAnonymous: form.isAnonymous,
      };

      if (currentFeedback) {
        await feedbackService.updateFeedback(currentFeedback.id, {
          rating: payload.rating,
          comment: payload.comment,
          criteria: payload.criteria,
        });
        setSuccess('Cập nhật đánh giá thành công.');
      } else {
        await feedbackService.submitFeedback(payload);
        setSuccess('Gửi đánh giá thành công.');
      }

      await loadBaseData(false);
    } catch (err) {
      console.error('Error saving feedback:', err);
      setError(err?.response?.data?.message || 'Không thể lưu đánh giá.');
    } finally {
      setSaving(false);
    }
  }

  if (loading && classes.length === 0 && myFeedbacks.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.helperText}>Đang tải dữ liệu đánh giá giảng viên...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadBaseData(true)} />}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{isStudent ? 'Đánh giá giảng viên' : 'Xem đánh giá giảng viên'}</Text>
              <Text style={styles.subTitle}>
                {isStudent
                  ? 'Gửi đánh giá, xem phản hồi của lớp học và cập nhật nhận xét mới nhất của bạn.'
                  : 'Tài khoản quản trị có thể xem điểm số và nhận xét đã duyệt về giảng viên theo từng lớp học.'}
              </Text>
            </View>
            <Pressable style={styles.homeShortcut} onPress={() => onNavigate?.(isStudent ? 'home' : 'profile')}>
              <Ionicons name={isStudent ? 'home-outline' : 'person-outline'} size={20} color="#1e3a8a" />
            </Pressable>
          </View>

          {isStudent ? (
            <View style={styles.tabRow}>
              {[
                { key: 'classes', label: 'Theo lớp' },
                { key: 'mine', label: 'Đánh giá của tôi' },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  >
                    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                      {tab.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.viewerModeBadge}>
              <Ionicons name="eye-outline" size={16} color="#1d4ed8" />
              <Text style={styles.viewerModeText}>Chế độ xem dành cho quản trị viên / nhân viên</Text>
            </View>
          )}
        </View>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
        {!!success && <Text style={styles.successText}>{success}</Text>}

        {isStudent && activeTab === 'mine' ? (
          myFeedbacks.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="message-alert-outline" size={42} color="#94a3b8" />
              <Text style={styles.emptyTitle}>Chưa có đánh giá nào</Text>
              <Text style={styles.emptyText}>Hãy mở một lớp học và gửi đánh giá đầu tiên của bạn.</Text>
            </View>
          ) : (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Đánh giá của tôi</Text>
              <Text style={styles.sectionSubTitle}>Chạm vào một mục để mở lại trong khu vực lớp học.</Text>
              <View style={styles.feedbackList}>
                {myFeedbacks.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    onOpen={() => {
                      setSelectedClassId(item.classSectionId);
                      setActiveTab('classes');
                    }}
                  />
                ))}
              </View>
            </View>
          )
        ) : (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{isStudent ? 'Lớp của bạn' : 'Chọn lớp để xem đánh giá'}</Text>
              {!isStudent ? (
                <>
                  <TextInput
                    value={classSearchInput}
                    onChangeText={setClassSearchInput}
                    onSubmitEditing={applyClassSearch}
                    placeholder={'Tìm theo mã môn, mã lớp, tên lớp hoặc giảng viên'}
                    style={styles.searchInput}
                    returnKeyType="search"
                  />
                  <View style={styles.searchButtonRow}>
                    <Pressable onPress={applyClassSearch} style={styles.searchButton}>
                      <Ionicons name="search-outline" size={18} color="#ffffff" />
                      <Text style={styles.searchButtonText}>Tìm lớp</Text>
                    </Pressable>
                    <Pressable onPress={clearClassSearch} style={styles.clearSearchButton}>
                      <Text style={styles.clearSearchButtonText}>Xóa lọc</Text>
                    </Pressable>
                  </View>
                  {classSearchQuery ? (
                    <Text style={styles.searchSummaryText}>
                      {`${visibleClasses.length} kết quả phù hợp với "${classSearchQuery}"`}
                    </Text>
                  ) : null}
                </>
              ) : null}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.classChipRow}>
                {visibleClasses.map((item) => {
                  const isActive = item.id === selectedClassId;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedClassId(item.id)}
                      style={[styles.classChip, isActive && styles.classChipActive]}
                    >
                      <Text style={[styles.classChipText, isActive && styles.classChipTextActive]}>
                        {item.subjectCode}
                      </Text>
                      <Text style={[styles.classChipSubText, isActive && styles.classChipTextActive]}>
                        {item.classCode}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {!selectedClass ? (
              <View style={styles.emptyCard}>
                <MaterialCommunityIcons name="book-open-variant" size={42} color="#94a3b8" />
                <Text style={styles.emptyTitle}>
                  {isStudent ? 'Chưa tìm thấy lớp đã đăng ký' : 'Chưa có lớp học để xem'}
                </Text>
                <Text style={styles.emptyText}>
                  {isStudent
                    ? 'Bạn có thể gửi đánh giá sau khi tham gia lớp học.'
                    : 'Khi lớp học có dữ liệu, quản trị viên sẽ xem được đánh giá tại đây.'}
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sectionCard}>
                  <Text style={styles.subjectCode}>{selectedClass.subjectCode}</Text>
                  <Text style={styles.subjectName}>{selectedClass.subjectName}</Text>
                  <Text style={styles.sectionSubTitle}>{selectedClass.className}</Text>

                  <View style={styles.detailGrid}>
                    <View style={styles.detailBadge}>
                      <Text style={styles.detailLabel}>Giảng viên</Text>
                      <Text style={styles.detailValue}>{selectedClass.lecturerName}</Text>
                    </View>
                    <View style={styles.detailBadge}>
                      <Text style={styles.detailLabel}>Học kỳ</Text>
                      <Text style={styles.detailValue}>
                        {selectedClass.semester ? `Học kỳ ${selectedClass.semester}` : 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.detailBadge}>
                      <Text style={styles.detailLabel}>Năm học</Text>
                      <Text style={styles.detailValue}>{selectedClass.academicYear || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailBadge}>
                      <Text style={styles.detailLabel}>Phòng</Text>
                      <Text style={styles.detailValue}>{selectedClass.roomName}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Tổng quan đánh giá lớp</Text>
                  <View style={styles.statsRow}>
                    <StatBox label="Tổng" value={classStats?.totalFeedback ?? 0} />
                    <StatBox label="Trung bình" value={classStats?.averageRating ?? 0} />
                    <StatBox label="Cảm nhận" value={formatSentiment(classStats?.sentiment)} />
                  </View>
                </View>

                {isStudent ? (
                  <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>
                      {currentFeedback ? 'Cập nhật đánh giá của bạn' : 'Gửi đánh giá của bạn'}
                    </Text>
                    <Text style={styles.sectionSubTitle}>
                      {currentFeedback
                        ? windowInfoLoading
                          ? 'Đang kiểm tra thời gian cập nhật đánh giá...'
                          : canEditCurrentFeedback
                          ? 'Bạn có thể cập nhật đánh giá gần nhất cho lớp này bất kỳ lúc nào.'
                          : windowInfo?.error || 'Bạn không thể cập nhật đánh giá này.'
                        : feedbackAvailabilityLoading
                          ? 'Đang kiểm tra thời gian gửi đánh giá...'
                          : canCreateFeedback
                            ? 'Đánh giá của bạn giúp cải thiện trải nghiệm học tập.'
                            : feedbackAvailability?.message || 'Hiện chưa thể gửi đánh giá cho lớp này.'}
                    </Text>

                    <Text style={styles.formLabel}>Đánh giá tổng thể</Text>
                    <StarRow
                      value={form.rating}
                      onChange={(value) => setForm((prev) => ({ ...prev, rating: value }))}
                      size={28}
                      disabled={feedbackFormLocked}
                    />

                    {CRITERIA.map((criterion) => (
                      <View key={criterion.key} style={styles.criteriaBlock}>
                        <Text style={styles.formLabel}>{criterion.label}</Text>
                        <StarRow
                          value={form.criteria[criterion.key]}
                          onChange={(value) =>
                            setForm((prev) => ({
                              ...prev,
                              criteria: {
                                ...prev.criteria,
                                [criterion.key]: value,
                              },
                            }))
                          }
                          disabled={feedbackFormLocked}
                        />
                      </View>
                    ))}

                    <Text style={styles.formLabel}>Nhận xét</Text>
                    <TextInput
                      value={form.comment}
                      onChangeText={(value) => setForm((prev) => ({ ...prev, comment: value }))}
                      placeholder="Chia sẻ điều bạn thấy tốt và những điểm cần cải thiện..."
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={styles.commentInput}
                      editable={!feedbackFormLocked}
                    />

                    {!currentFeedback ? (
                      <View style={styles.switchRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.formLabel}>Đánh giá ẩn danh</Text>
                          <Text style={styles.switchHelper}>
                            Tên của bạn sẽ được ẩn trong danh sách đánh giá công khai.
                          </Text>
                        </View>
                        <Switch
                          value={form.isAnonymous}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, isAnonymous: value }))}
                          disabled={feedbackFormLocked}
                          thumbColor="#ffffff"
                          trackColor={{ false: '#cbd5e1', true: '#2563eb' }}
                        />
                      </View>
                    ) : null}

                    <Pressable
                      onPress={handleSubmit}
                      disabled={saving || feedbackFormLocked}
                      style={[
                        styles.submitButton,
                        (saving || feedbackFormLocked) && styles.submitButtonDisabled,
                      ]}
                    >
                      <Text style={styles.submitButtonText}>
                        {saving
                          ? 'Đang lưu...'
                          : currentFeedback
                            ? 'Cập nhật đánh giá'
                            : 'Gửi đánh giá'}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Đánh giá gần đây về giảng viên</Text>
                  {classFeedbacks.length === 0 ? (
                    <Text style={styles.sectionSubTitle}>Chưa có đánh giá công khai nào cho lớp học này.</Text>
                  ) : (
                    classFeedbacks.map((item) => (
                      <View key={item._id} style={styles.publicFeedbackCard}>
                        <View style={styles.publicFeedbackTop}>
                          <Text style={styles.publicFeedbackRating}>{`${item.rating}/5`}</Text>
                          <Text style={styles.publicFeedbackDate}>{formatDate(item.createdAt)}</Text>
                        </View>
                        <Text style={styles.publicFeedbackBody}>
                          {item.comment || 'Chưa có nhận xét chi tiết.'}
                        </Text>
                        <Text style={styles.publicFeedbackMeta}>
                          {item.isAnonymous ? 'Đánh giá ẩn danh' : 'Đánh giá có tên'}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 100,
    gap: 12,
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
    color: '#64748b',
  },
  headerCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  homeShortcut: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subTitle: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 20,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#1d4ed8',
  },
  tabButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  tabButtonTextActive: {
    color: '#ffffff',
  },
  viewerModeBadge: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  viewerModeText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
  errorText: {
    borderRadius: 12,
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sectionCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  sectionSubTitle: {
    marginTop: 4,
    color: '#64748b',
    lineHeight: 20,
  },
  classChipRow: {
    gap: 10,
    paddingTop: 14,
  },
  searchInput: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
  },
  searchButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  searchButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  clearSearchButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  clearSearchButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  searchSummaryText: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12,
  },
  classChip: {
    minWidth: 110,
    borderRadius: 16,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  classChipActive: {
    backgroundColor: '#1d4ed8',
  },
  classChipText: {
    fontWeight: '800',
    color: '#1e3a8a',
  },
  classChipSubText: {
    marginTop: 2,
    fontSize: 12,
    color: '#475569',
  },
  classChipTextActive: {
    color: '#ffffff',
  },
  emptyCard: {
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyText: {
    marginTop: 6,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  subjectCode: {
    color: '#0369a1',
    fontSize: 13,
    fontWeight: '800',
  },
  subjectName: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  detailBadge: {
    width: '47%',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  detailLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  detailValue: {
    marginTop: 4,
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 12,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  statValue: {
    marginTop: 8,
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '800',
  },
  formLabel: {
    marginTop: 14,
    marginBottom: 8,
    color: '#0f172a',
    fontWeight: '700',
  },
  starRow: {
    flexDirection: 'row',
    gap: 6,
  },
  criteriaBlock: {
    marginTop: 2,
  },
  commentInput: {
    minHeight: 110,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  switchRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchHelper: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  submitButton: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  publicFeedbackCard: {
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  publicFeedbackTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicFeedbackRating: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  publicFeedbackDate: {
    color: '#64748b',
    fontSize: 12,
  },
  publicFeedbackBody: {
    marginTop: 8,
    color: '#0f172a',
    lineHeight: 20,
  },
  publicFeedbackMeta: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 12,
  },
  feedbackList: {
    marginTop: 14,
    gap: 12,
  },
  myFeedbackCard: {
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    padding: 14,
  },
  feedbackCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  feedbackSubject: {
    color: '#0369a1',
    fontWeight: '800',
    fontSize: 13,
  },
  feedbackClassName: {
    marginTop: 4,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackMeta: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 12,
  },
  feedbackComment: {
    marginTop: 10,
    color: '#334155',
    lineHeight: 20,
  },
  feedbackRating: {
    color: '#b45309',
    fontSize: 18,
    fontWeight: '800',
  },
  feedbackPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  feedbackPillText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 12,
  },
});
