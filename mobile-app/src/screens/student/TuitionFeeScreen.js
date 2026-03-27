import React, { useState } from 'react';
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
import useTuitionFee from '../../hooks/useTuitionFee';

function formatCurrency(value) {
  if (typeof value !== 'number') return '0 ₫';
  return value.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return 'N/A';
  }
}

function getStatusColor(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return '#16a34a';
    case 'PARTIAL':
      return '#f59e0b';
    case 'OVERDUE':
      return '#dc2626';
    case 'PENDING':
    default:
      return '#6b7280';
  }
}

function getStatusLabel(status) {
  switch (String(status || '').toUpperCase()) {
    case 'PAID':
      return 'Đã thanh toán';
    case 'PARTIAL':
      return 'Thanh toán một phần';
    case 'OVERDUE':
      return 'Quá hạn';
    case 'PENDING':
    default:
      return 'Chưa thanh toán';
  }
}

function getPaymentMethodIcon(method) {
  switch (String(method || '').toUpperCase()) {
    case 'PAYOS':
      return 'credit-card';
    case 'WALLET':
      return 'wallet-outline';
    case 'TRANSFER':
      return 'bank-transfer';
    default:
      return 'card-outline';
  }
}

function AccountBalanceCard({ tuition, excess }) {
  return (
    <View style={styles.balanceCard}>
      <View style={styles.balanceCardHeader}>
        <Text style={styles.balanceCardTitle}>Tài chính sinh viên</Text>
        <MaterialCommunityIcons name="wallet" size={24} color="#1d4ed8" />
      </View>

      <View style={styles.balanceMetrics}>
        <View style={styles.balanceMetric}>
          <Text style={styles.balanceMetricLabel}>Số dư tài khoản</Text>
          <Text style={styles.balanceMetricValue}>{formatCurrency(excess)}</Text>
        </View>
      </View>
    </View>
  );
}

function TuitionSummaryCard({ tuition }) {
  if (!tuition) {
    return null;
  }

  const statusColor = getStatusColor(tuition.status);
  const statusLabel = getStatusLabel(tuition.status);

  return (
    <View style={styles.summaryCard}>
      <View style={styles.summaryHeader}>
        <View>
          <Text style={styles.summaryTitle}>
            {tuition.semester ? `Kỳ ${tuition.semester}` : 'Học phí'} {tuition.academicYear ? `- ${tuition.academicYear}` : ''}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.summaryContent}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Tổng học phí</Text>
          <Text style={styles.summaryValue}>{formatCurrency(tuition.totalTuitionFee)}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Đã thanh toán</Text>
          <Text style={[styles.summaryValue, { color: '#16a34a' }]}>
            {formatCurrency(tuition.totalPaid)}
          </Text>
        </View>

        <View style={[styles.summaryRow, styles.summaryRowDue]}>
          <Text style={styles.summaryLabel}>Còn nợ</Text>
          <Text style={[styles.summaryValue, { color: '#dc2626' }]}>
            {formatCurrency(tuition.totalDue)}
          </Text>
        </View>

        {tuition.dueDate && (
          <View style={styles.dueDateRow}>
            <Ionicons name="calendar-outline" size={14} color="#6b7280" />
            <Text style={styles.dueDateText}>Hạn thanh toán: {formatDate(tuition.dueDate)}</Text>
          </View>
        )}
      </View>

      {tuition.details && tuition.details.length > 0 && (
        <View style={styles.detailsContainer}>
          <Text style={styles.detailsTitle}>Chi tiết</Text>
          {tuition.details.map((detail, idx) => (
            <View key={idx} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{detail.itemName}</Text>
              <Text style={styles.detailAmount}>{formatCurrency(detail.amount)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function PaymentCard({ payment }) {
  const methodIcon = getPaymentMethodIcon(payment.paymentMethod);
  const statusColor =
    payment.status === 'PAID'
      ? '#16a34a'
      : payment.status === 'FAILED'
      ? '#dc2626'
      : '#f59e0b';

  return (
    <View style={styles.paymentCard}>
      <View style={styles.paymentCardHeader}>
        <View style={styles.paymentCardIcon}>
          <MaterialCommunityIcons name={methodIcon} size={20} color="#1d4ed8" />
        </View>
        <View style={styles.paymentCardInfo}>
          <Text style={styles.paymentCardTitle}>{payment.description || payment.itemType || 'Thanh toán'}</Text>
          <Text style={styles.paymentCardDate}>{formatDate(payment.transactionDate)}</Text>
        </View>
        <Text style={[styles.paymentCardAmount, { color: statusColor }]}>
          +{formatCurrency(payment.amount)}
        </Text>
      </View>
      {payment.orderId && (
        <Text style={styles.paymentCardOrderId}>Mã giao dịch: {payment.orderId}</Text>
      )}
    </View>
  );
}

export default function TuitionFeeScreen({ onNavigate }) {
  const { tuition, history, excess, loading, refreshing, error, refresh } = useTuitionFee();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.helperText}>Đang tải thông tin học phí...</Text>
      </View>
    );
  }

  if (error && !tuition) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Học phí - Thanh toán</Text>
        <Text style={styles.headerSubtitle}>Quản lý thông tin học phí và lịch sử thanh toán</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <AccountBalanceCard tuition={tuition} excess={excess} />
        <TuitionSummaryCard tuition={tuition} />

        {history && history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Lịch sử thanh toán</Text>
            <FlatList
              data={history}
              keyExtractor={(item, idx) => item.id || idx.toString()}
              renderItem={({ item }) => <PaymentCard payment={item} />}
              scrollEnabled={false}
            />
          </View>
        )}

        {!history || history.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="file-document-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>Chưa có ghi nhận thanh toán</Text>
            <Text style={styles.emptyStateSubtext}>Khi bạn thanh toán, sẽ hiển thị ở đây</Text>
          </View>
        ) : null}
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1d4ed8',
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  balanceMetrics: {
    gap: 12,
  },
  balanceMetric: {
    backgroundColor: '#f0f4ff',
    padding: 12,
    borderRadius: 8,
  },
  balanceMetricLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  balanceMetricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryContent: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryRowDue: {
    paddingVertical: 12,
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  dueDateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  detailAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
  },
  historySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginHorizontal: 4,
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#0ea5e9',
    shadowColor: '#000000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentCardInfo: {
    flex: 1,
  },
  paymentCardTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  paymentCardDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  paymentCardAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentCardOrderId: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 8,
    paddingLeft: 52,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  helperText: {
    marginTop: 8,
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
