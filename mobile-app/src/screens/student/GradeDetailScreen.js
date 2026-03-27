import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import useGradeDetail from '../../hooks/useGradeDetail';

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

function GradeComponentCard({ component, isLast }) {
  const hasScore = component.score !== null;
  const scoreValue = hasScore ? Number(component.score).toFixed(1) : 'N/A';
  
  return (
    <View
      style={[
        styles.componentCard,
        !isLast && styles.componentCardWithBorder
      ]}
    >
      <View style={styles.componentHeader}>
        <View style={styles.componentInfo}>
          <Text style={styles.componentCode}>{component.shortName}</Text>
          <Text style={styles.componentName}>{component.name}</Text>
        </View>
        <View style={styles.componentMeta}>
          <Text style={styles.componentWeight}>{component.weight}%</Text>
        </View>
      </View>

      <View style={styles.componentScore}>
        <Text style={[
          styles.scoreValue,
          { color: hasScore ? '#1d4ed8' : '#94a3b8' }
        ]}>
          {scoreValue}
        </Text>
        {hasScore && (
          <Text style={styles.scoreLabel}>
            {`Đóng góp: ${(Number(component.score) * component.weight / 100).toFixed(2)}`}
          </Text>
        )}
      </View>

      {!hasScore && (
        <View style={styles.noScoreBadge}>
          <Ionicons name="close-circle-outline" size={14} color="#ef4444" />
          <Text style={styles.noScoreText}>Chưa có điểm</Text>
        </View>
      )}
    </View>
  );
}

function GradeCalculationBreakdown({ detail }) {
  if (!detail || !detail.componentsList || detail.componentsList.length === 0) {
    return null;
  }

  // Calculate contribution of each component
  const components = detail.componentsList;
  const totalContribution = components.reduce((sum, comp) => {
    if (comp.score !== null && comp.weight > 0) {
      return sum + (Number(comp.score) * comp.weight / 100);
    }
    return sum;
  }, 0);

  return (
    <View style={styles.calculationSection}>
      <Text style={styles.calculationTitle}>Công thức tính điểm</Text>
      
      <View style={styles.formulaBox}>
        {components
          .filter(c => c.weight > 0)
          .map((comp, idx) => {
            const contribution = comp.score !== null 
              ? (Number(comp.score) * comp.weight / 100).toFixed(2)
              : '0.00';
            
            return (
              <View key={comp.code}>
                <Text style={styles.formulaText}>
                  {comp.shortName} × {comp.weight}% = {contribution}
                  {comp.score === null && ' (chưa có)'}
                </Text>
                {idx < components.filter(c => c.weight > 0).length - 1 && (
                  <Text style={styles.formulaOperator}>+</Text>
                )}
              </View>
            );
          })}
        
        <View style={styles.formulaSeparator} />
        
        <View style={styles.formulaResult}>
          <Text style={styles.formulaResultText}>
            Điểm cuối cùng = {detail.grade || 'N/A'}
          </Text>
          <Text style={styles.formulaStatus}>
            {detail.grade && (getGradeLabel(detail.grade))}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function GradeDetailScreen({ route, navigation }) {
  const { enrollmentId } = route?.params || {};
  const { detail, loading, error } = useGradeDetail(enrollmentId);

  if (!enrollmentId) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>Không tìm thấy thông tin môn học</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.helperText}>Đang tải chi tiết điểm...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Quay lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyText}>Chưa có dữ liệu</Text>
        </View>
      </View>
    );
  }

  const hasFailedScore = detail.grade && Number(detail.grade) < 4.0;
  const statusColor = hasFailedScore ? '#dc2626' : '#16a34a';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && { opacity: 0.7 }
          ]}
        >
          <Ionicons name="chevron-back" size={28} color="#ffffff" />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Chi tiết điểm</Text>
          <Text style={styles.headerSubtitle}>{detail.subjectCode}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Subject Header Card */}
        <View style={styles.subjectCard}>
          <View style={styles.subjectInfo}>
            <Text style={styles.subjectCode}>{detail.subjectCode}</Text>
            <Text style={styles.subjectName}>{detail.subjectName}</Text>
            <View style={styles.subjectMeta}>
              <Text style={styles.metaText}>
                <Ionicons name="layers-outline" size={12} color="#64748b" /> {detail.credits} tín chỉ
              </Text>
              <Text style={styles.metaText}>•</Text>
              <Text style={styles.metaText}>
                <Ionicons name="calendar-outline" size={12} color="#64748b" /> Kỳ {detail.semester} - {detail.academicYear}
              </Text>
            </View>
          </View>
        </View>

        {/* Final Grade Display */}
        <View style={styles.finalGradeSection}>
          <Text style={styles.sectionTitle}>Điểm cuối cùng</Text>
          <View style={[styles.finalGradeCard, { borderLeftColor: getGradeColor(detail.grade) }]}>
            <View style={styles.finalGradeLeft}>
              <Text style={[styles.finalGradeValue, { color: getGradeColor(detail.grade) }]}>
                {detail.grade || 'N/A'}
              </Text>
              <Text style={[styles.finalGradeLabel, { color: getGradeColor(detail.grade) }]}>
                {getGradeLabel(detail.grade)}
              </Text>
            </View>
            {hasFailedScore && (
              <View style={styles.failedBadge}>
                <MaterialCommunityIcons name="alert" size={16} color="#ffffff" />
                <Text style={styles.failedBadgeText}>Chưa đủ 4.0</Text>
              </View>
            )}
          </View>
        </View>

        {/* Grade Components Breakdown */}
        <View style={styles.componentsSection}>
          <Text style={styles.sectionTitle}>Chi tiết từng thành phần</Text>
          <View style={styles.componentsList}>
            {detail.componentsList && detail.componentsList.map((component, idx) => (
              <GradeComponentCard
                key={component.code}
                component={component}
                isLast={idx === detail.componentsList.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Calculation Breakdown */}
        <GradeCalculationBreakdown detail={detail} />

        {/* Student Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Thông tin sinh viên</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mã SV:</Text>
              <Text style={styles.infoValue}>{detail.studentCode}</Text>
            </View>
            <View style={styles.infoRowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Tên:</Text>
              <Text style={styles.infoValue}>{detail.studentName}</Text>
            </View>
            <View style={styles.infoRowDivider} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Trạng thái:</Text>
              <Text style={styles.infoValue}>{detail.status}</Text>
            </View>
          </View>
        </View>

        {/* Empty space for scroll */}
        <View style={{ height: 20 }} />
      </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 12,
    paddingRight: 16,
  },

  backButton: {
    padding: 4,
    marginRight: 12,
  },

  headerContent: {
    flex: 1,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },

  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  content: {
    flex: 1,
  },

  contentPadding: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  // Subject Card
  subjectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  subjectInfo: {
    gap: 8,
  },

  subjectCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1d4ed8',
  },

  subjectName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    lineHeight: 18,
  },

  subjectMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },

  metaText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  // Final Grade Section
  finalGradeSection: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  finalGradeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  finalGradeLeft: {
    flex: 1,
  },

  finalGradeValue: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 4,
  },

  finalGradeLabel: {
    fontSize: 14,
    fontWeight: '600',
  },

  failedBadge: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },

  failedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Components Section
  componentsSection: {
    marginBottom: 20,
  },

  componentsList: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  componentCard: {
    padding: 14,
    backgroundColor: '#ffffff',
  },

  componentCardWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },

  componentInfo: {
    flex: 1,
  },

  componentCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 2,
  },

  componentName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
  },

  componentMeta: {
    alignItems: 'flex-end',
  },

  componentWeight: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    backgroundColor: '#f1f5f9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },

  componentScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
  },

  scoreLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  noScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
    width: '40%',
  },

  noScoreText: {
    fontSize: 10,
    color: '#991b1b',
    fontWeight: '500',
  },

  // Calculation Section
  calculationSection: {
    marginBottom: 20,
  },

  calculationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  formulaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  formulaText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#334155',
    paddingVertical: 4,
    fontWeight: '500',
  },

  formulaOperator: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    textAlign: 'center',
    paddingVertical: 4,
  },

  formulaSeparator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },

  formulaResult: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },

  formulaResultText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 2,
  },

  formulaStatus: {
    fontSize: 12,
    color: '#0c4a6e',
    fontWeight: '600',
  },

  // Info Section
  infoSection: {
    marginBottom: 20,
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  infoRowDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
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
    flex: 1,
    textAlign: 'right',
  },

  // Common
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

  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },

  retryButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
