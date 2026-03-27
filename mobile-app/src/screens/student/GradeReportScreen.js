import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import useGrades from '../../hooks/useGrades';

function formatSemester(semester, academicYear) {
  if (!semester || !academicYear) return 'N/A';
  return `Kỳ ${semester} - ${academicYear}`;
}

function getGradeColor(grade) {
  const g = Number(grade);
  if (Number.isNaN(g)) return '#6b7280';
  if (g >= 8.5) return '#16a34a'; // Xuất sắc - Xanh
  if (g >= 8.0) return '#0ea5e9'; // Giỏi - Xanh dương
  if (g >= 7.0) return '#10b981'; // Khá - Xanh lá
  if (g >= 5.5) return '#f59e0b'; // Trung bình - Cam
  if (g >= 4.0) return '#f97316'; // Yếu - Cam đỏ
  return '#dc2626'; // Kém - Đỏ
}

function getGradeLabel(grade) {
  const g = Number(grade);
  if (Number.isNaN(g)) return 'N/A';
  if (g >= 8.5) return 'Xuất sắc';
  if (g >= 8.0) return 'Giỏi';
  if (g >= 7.0) return 'Khá';
  if (g >= 5.5) return 'Trung bình';
  if (g >= 4.0) return 'Yếu';
  return 'Kém';
}

function GradeCard({ enrollment, onPress }) {
  const grade = enrollment.grade;
  const color = getGradeColor(grade);
  const isFailed = Number(grade) < 4.0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.gradeCard,
      pressed && styles.gradeCardPressed,
    ]} >
      <View style={styles.gradeCardHeader}>
        <View style={styles.gradeCardInfo}>
          <Text style={styles.gradeCardCode}>{enrollment.subjectCode}</Text>
          <Text style={styles.gradeCardName} numberOfLines={2}>
            {enrollment.subjectName}
          </Text>
          <View style={styles.gradeCardMeta}>
            <Text style={styles.gradeCardMetaText}>
              {enrollment.credits} tín chỉ
            </Text>
            {isFailed && (
              <View style={styles.failedBadge}>
                <Text style={styles.failedBadgeText}>Chưa đủ điểm</Text>
              </View>
            )}
          </View>
        </View>
        <View style={[styles.gradeDisplay, { backgroundColor: `${color}20` }]}>
          <Text style={[styles.gradeValue, { color }]}>
            {grade !== null ? Number(grade).toFixed(1) : 'N/A'}
          </Text>
          <Text style={[styles.gradeLabel, { color }]}>
            {getGradeLabel(grade)}
          </Text>
        </View>
      </View>

      {(enrollment.midtermScore !== null ||
        enrollment.finalScore !== null ||
        enrollment.continuousScore !== null ||
        (enrollment.ptScores && enrollment.ptScores.length > 0)) && (
        <View style={styles.gradeComponentsRow}>
          {enrollment.midtermScore !== null && (
            <View style={styles.scoreComponentBadge}>
              <Text style={styles.scoreComponentLabel}>GK:</Text>
              <Text style={styles.scoreComponentValue}>
                {Number(enrollment.midtermScore).toFixed(1)}
              </Text>
            </View>
          )}
          {enrollment.continuousScore !== null && (
            <View style={styles.scoreComponentBadge}>
              <Text style={styles.scoreComponentLabel}>QT:</Text>
              <Text style={styles.scoreComponentValue}>
                {Number(enrollment.continuousScore).toFixed(1)}
              </Text>
            </View>
          )}
          {enrollment.finalScore !== null && (
            <View style={styles.scoreComponentBadge}>
              <Text style={styles.scoreComponentLabel}>CK:</Text>
              <Text style={styles.scoreComponentValue}>
                {Number(enrollment.finalScore).toFixed(1)}
              </Text>
            </View>
          )}
          {enrollment.ptScores && enrollment.ptScores.length > 0 && (
            <View style={styles.scoreComponentBadge}>
              <Text style={styles.scoreComponentLabel}>PT:</Text>
              <Text style={styles.scoreComponentValue}>
                {Number(enrollment.ptScores[0]?.score || 0).toFixed(1)}
              </Text>
            </View>
          )}
          <View style={styles.detailsIndicator}>
            <Ionicons name="chevron-forward-outline" size={14} color="#1d4ed8" />
          </View>
        </View>
      )}
    </Pressable>
  );
}

function SemesterSection({ semesterGroup, onSelectGrade }) {
  const [expanded, setExpanded] = useState(true);

  const passedCount = semesterGroup.enrollments.filter(
    (e) => Number(e.grade) >= 4.0
  ).length;
  const failedCount = semesterGroup.enrollments.length - passedCount;

  return (
    <View style={styles.semesterSection}>
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.semesterHeader}
      >
        <View style={styles.semesterHeaderLeft}>
          <Ionicons
            name={expanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
            size={20}
            color="#1d4ed8"
          />
          <View>
            <Text style={styles.semesterTitle}>
              {formatSemester(semesterGroup.semester, semesterGroup.academicYear)}
            </Text>
            <Text style={styles.semesterStats}>
              {passedCount} đạt • {failedCount} chưa đạt • GPA {semesterGroup.semesterGPA}
            </Text>
          </View>
        </View>
        <View style={styles.semesterGPA}>
          <Text style={styles.semesterGPAValue}>{semesterGroup.semesterGPA}</Text>
          <Text style={styles.semesterGPALabel}>GPA</Text>
        </View>
      </Pressable>

      {expanded && (
        <View style={styles.semesterContent}>
          <FlatList
            data={semesterGroup.enrollments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GradeCard
                enrollment={item}
                onPress={() => onSelectGrade(item)}
                onViewDetails={() => onSelectGrade(item)}
              />
            )}
            scrollEnabled={false}
            nestedScrollEnabled={false}
          />
        </View>
      )}
    </View>
  );
}

function GradeDetailModal({ visible, enrollment, onClose }) {
  if (!visible || !enrollment) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable onPress={onClose} style={styles.modalBackdrop} />
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{enrollment.subjectCode}</Text>
          <Pressable onPress={onClose}>
            <Ionicons name="close-circle-outline" size={24} color="#6b7280" />
          </Pressable>
        </View>

        <ScrollView style={styles.modalBody}>
          <Text style={styles.modalSubtitle}>{enrollment.subjectName}</Text>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Điểm cuối cùng</Text>
            <Text style={[
              styles.detailValue,
              { color: getGradeColor(enrollment.grade) }
            ]}>
              {Number(enrollment.grade).toFixed(1)}
            </Text>
            <Text style={styles.detailDescription}>
              {getGradeLabel(enrollment.grade)}
            </Text>
          </View>

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Chi tiết điểm thành phần</Text>
            <View style={styles.componentGrid}>
              {enrollment.midtermScore !== null && (
                <View style={styles.componentItem}>
                  <Text style={styles.componentLabel}>Giữa kỳ (GK)</Text>
                  <Text style={styles.componentScore}>
                    {Number(enrollment.midtermScore).toFixed(1)}
                  </Text>
                </View>
              )}
              {enrollment.continuousScore !== null && (
                <View style={styles.componentItem}>
                  <Text style={styles.componentLabel}>Quá trình (QT)</Text>
                  <Text style={styles.componentScore}>
                    {Number(enrollment.continuousScore).toFixed(1)}
                  </Text>
                </View>
              )}
              {enrollment.finalScore !== null && (
                <View style={styles.componentItem}>
                  <Text style={styles.componentLabel}>Cuối kỳ (CK)</Text>
                  <Text style={styles.componentScore}>
                    {Number(enrollment.finalScore).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {enrollment.ptScores && enrollment.ptScores.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Điểm thực hành (PT)</Text>
              <View style={styles.componentGrid}>
                {enrollment.ptScores.map((pt, idx) => (
                  <View key={idx} style={styles.componentItem}>
                    <Text style={styles.componentLabel}>{pt.type}</Text>
                    <Text style={styles.componentScore}>
                      {Number(pt.score).toFixed(1)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Thông tin khác</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tín chỉ:</Text>
              <Text style={styles.infoValue}>{enrollment.credits}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>{enrollment.status}</Text>
            </View>
          </View>
        </ScrollView>

        <Pressable onPress={onClose} style={styles.modalCloseButton}>
          <Text style={styles.modalCloseButtonText}>Đóng</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function GradeReportScreen({ onNavigate }) {
  const { grades, loading, refreshing, error, refresh, reload } = useGrades();
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleViewDetails = (enrollment) => {
    if (onNavigate) {
      // Navigate to detailed grade view
      onNavigate('gradeDetail', { enrollmentId: enrollment.id });
    } else {
      // Fallback to modal if navigation not available
      setSelectedEnrollment(enrollment);
      setModalVisible(true);
    }
  };

  if (loading && !grades) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.helperText}>Đang tải báo cáo điểm...</Text>
        </View>
      </View>
    );
  }

  if (error && !grades) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={reload}>
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Báo cáo điểm</Text>
        </View>
        <View style={styles.overallGPACard}>
          <Text style={styles.overallGPALabel}>GPA tích lũy</Text>
          <Text style={styles.overallGPAValue}>
            {grades?.overallGPA || '0.00'}
          </Text>
        </View>
      </View>

      <FlatList
        data={grades?.semesterGroups || []}
        keyExtractor={(item, idx) => `${item.semester}-${item.academicYear}-${idx}`}
        renderItem={({ item: semesterGroup }) => (
          <SemesterSection
            semesterGroup={semesterGroup}
            onSelectGrade={handleViewDetails}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            colors={['#1d4ed8']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={48}
              color="#cbd5e1"
            />
            <Text style={styles.emptyText}>Chưa có dữ liệu điểm</Text>
          </View>
        }
      />

      <GradeDetailModal
        visible={modalVisible}
        enrollment={selectedEnrollment}
        onClose={() => {
          setModalVisible(false);
          setSelectedEnrollment(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    backgroundColor: '#1d4ed8',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  overallGPACard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  overallGPALabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    marginBottom: 4,
  },
  overallGPAValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingVertical: 12,
  },
  semesterSection: {
    marginHorizontal: 12,
    marginVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  semesterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  semesterHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  semesterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  semesterStats: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  semesterGPA: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  semesterGPAValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  semesterGPALabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  semesterContent: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  gradeCard: {
    marginVertical: 6,
    marginHorizontal: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  gradeCardPressed: {
    backgroundColor: '#f1f5f9',
    opacity: 0.9,
  },
  gradeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  gradeCardInfo: {
    flex: 1,
    marginRight: 12,
  },
  gradeCardCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  gradeCardName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },
  gradeCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gradeCardMetaText: {
    fontSize: 11,
    color: '#64748b',
  },
  failedBadge: {
    backgroundColor: '#fee2e2',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  failedBadgeText: {
    fontSize: 10,
    color: '#991b1b',
    fontWeight: '600',
  },
  gradeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 70,
  },
  gradeValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  gradeLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  gradeComponentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
  },
  scoreComponentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  scoreComponentLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
  scoreComponentValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailsIndicator: {
    marginLeft: 'auto',
    paddingLeft: 8,
    justifyContent: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    maxHeight: '70%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  detailValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  detailDescription: {
    fontSize: 13,
    color: '#64748b',
  },
  componentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  componentItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  componentLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 6,
  },
  componentScore: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  modalCloseButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
