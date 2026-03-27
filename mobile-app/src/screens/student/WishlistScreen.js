import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import useWishlist from '../../hooks/useWishlist';

function WishlistCard({ item, onDelete }) {
  const isMobileCard = true;

  const handleDelete = () => {
    Alert.alert(
      'Xử hủy yêu cầu',
      `Bạn có chắc chắn muốn hủy yêu cầu môn ${item.subjectCode}?`,
      [
        { text: 'Hủy', onPress: () => {} },
        {
          text: 'Xóa',
          onPress: () => onDelete?.(item.id),
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectCode}>{item.subjectCode}</Text>
          <Text style={styles.subjectName} numberOfLines={2}>
            {item.subjectName}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>
              <Ionicons name="layers-outline" size={11} color="#64748b" /> {item.credits} tín
              chỉ
            </Text>
            <Text style={styles.metaSeparator}>•</Text>
            <Text style={styles.metaText}>
              <Ionicons name="calendar-outline" size={11} color="#64748b" /> Kỳ {item.semester}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: `${item.statusColor}20` }]}>
          <Text style={[styles.statusText, { color: item.statusColor }]}>
            {item.statusLabel}
          </Text>
        </View>
      </View>

      {/* Priority and Details */}
      <View style={styles.cardDetails}>
        <View style={styles.prioritySection}>
          <View style={styles.priorityItem}>
            <Text style={styles.detailLabel}>Mức độ ưu tiên</Text>
            <View style={styles.priorityStars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= item.priority ? 'star' : 'star-outline'}
                  size={14}
                  color={star <= item.priority ? '#f59e0b' : '#cbd5e1'}
                />
              ))}
            </View>
            <Text style={styles.priorityLabel}>{item.priorityLabel}</Text>
          </View>
        </View>

        {/* Reason (if available) */}
        {item.reason && (
          <View style={styles.reasonSection}>
            <Text style={styles.detailLabel}>Lý do yêu cầu</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>
          </View>
        )}

        {/* Review Note (if rejected or approved with note) */}
        {item.reviewNote && (
          <View style={styles.reviewSection}>
            <Text style={styles.detailLabel}>Ghi chú</Text>
            <Text style={styles.reviewText}>{item.reviewNote}</Text>
          </View>
        )}

        {/* Class Section (if approved) */}
        {item.enrolledClassSection && (
          <View style={styles.classSection}>
            <Text style={styles.detailLabel}>Lớp học được phân công</Text>
            <View style={styles.classBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
              <Text style={styles.classText}>{item.enrolledClassSection}</Text>
            </View>
          </View>
        )}

        {/* Date Info */}
        <View style={styles.dateInfo}>
          {item.createdAt && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Yêu cầu lúc:</Text>
              <Text style={styles.dateValue}>
                {new Date(item.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          )}
          {item.reviewedAt && (
            <View style={styles.dateItem}>
              <Text style={styles.dateLabel}>Xử lý lúc:</Text>
              <Text style={styles.dateValue}>
                {new Date(item.reviewedAt).toLocaleDateString('vi-VN')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      {item.canDelete && (
        <View style={styles.actions}>
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [
              styles.deleteButton,
              pressed && styles.deleteButtonPressed,
            ]}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#dc2626" />
            <Text style={styles.deleteButtonText}>Hủy yêu cầu</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function StatusFilter({ activeStatus, onStatusChange }) {
  const statuses = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pending', label: 'Đang chờ' },
    { key: 'approved', label: 'Đã duyệt' },
    { key: 'rejected', label: 'Từ chối' },
  ];

  return (
    <View style={styles.filterSection}>
      <FlatList
        data={statuses}
        horizontal
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onStatusChange(item.key)}
            style={[
              styles.filterButton,
              activeStatus === item.key && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                activeStatus === item.key && styles.filterButtonTextActive,
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        )}
        scrollEnabled={false}
        contentContainerStyle={styles.filterList}
        nestedScrollEnabled={false}
      />
    </View>
  );
}

export default function WishlistScreen() {
  const { wishlist, loading, refreshing, error, refresh, reload } = useWishlist();
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter wishlist by status
  const filteredWishlist = useMemo(() => {
    if (!wishlist?.wishlists) return [];
    if (statusFilter === 'all') return wishlist.wishlists;
    return wishlist.wishlists.filter((item) => item.status === statusFilter);
  }, [wishlist, statusFilter]);

  // Group by status for summary display
  const summary = useMemo(() => {
    if (!wishlist?.wishlists) {
      return { total: 0, pending: 0, approved: 0, rejected: 0 };
    }
    const items = wishlist.wishlists;
    return {
      total: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      rejected: items.filter((i) => i.status === 'rejected').length,
    };
  }, [wishlist]);

  const handleDeleteWishlist = (wishlistId) => {
    // TODO: Implement delete functionality
    Alert.alert('Thông báo', 'Tính năng sẽ được cập nhật sớm');
  };

  if (loading && !wishlist) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={styles.helperText}>Đang tải danh sách yêu cầu khoá học...</Text>
        </View>
      </View>
    );
  }

  if (error && !wishlist) {
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Yêu cầu khoá học</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Tổng cộng</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{summary.pending}</Text>
            <Text style={styles.summaryLabel}>Đang chờ</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#16a34a' }]}>{summary.approved}</Text>
            <Text style={styles.summaryLabel}>Duyệt</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryValue, { color: '#dc2626' }]}>{summary.rejected}</Text>
            <Text style={styles.summaryLabel}>Từ chối</Text>
          </View>
        </View>
      </View>

      {/* Filter */}
      <StatusFilter activeStatus={statusFilter} onStatusChange={setStatusFilter} />

      {/* Wishlist Items */}
      <FlatList
        data={filteredWishlist}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WishlistCard item={item} onDelete={handleDeleteWishlist} />
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
              name="clipboard-outline"
              size={48}
              color="#cbd5e1"
            />
            <Text style={styles.emptyText}>
              {statusFilter === 'all'
                ? 'Bạn chưa có yêu cầu khoá học nào'
                : `Không có yêu cầu ${statusFilter === 'pending' ? 'đang chờ' : statusFilter === 'approved' ? 'đã duyệt' : 'từ chối'}`}
            </Text>
            {statusFilter !== 'all' && (
              <Pressable
                onPress={() => setStatusFilter('all')}
                style={styles.resetFilterButton}
              >
                <Text style={styles.resetFilterButtonText}>Xem tất cả</Text>
              </Pressable>
            )}
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

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  /* Header Styles */
  header: {
    backgroundColor: '#1d4ed8',
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },

  headerTop: {
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },

  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },

  /* Filter Styles */
  filterSection: {
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

  filterList: {
    paddingHorizontal: 12,
    gap: 8,
  },

  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },

  filterButtonActive: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },

  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  filterButtonTextActive: {
    color: '#ffffff',
  },

  /* List Styles */
  listContent: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },

  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },

  subjectInfo: {
    flex: 1,
    marginRight: 10,
  },

  subjectCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
    marginBottom: 4,
  },

  subjectName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#334155',
    marginBottom: 6,
  },

  cardMeta: {
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

  metaSeparator: {
    fontSize: 11,
    color: '#cbd5e1',
  },

  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },

  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* Card Details */
  cardDetails: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },

  prioritySection: {
    flex: 1,
  },

  priorityItem: {
    gap: 6,
  },

  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },

  priorityStars: {
    flexDirection: 'row',
    gap: 4,
  },

  priorityLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  reasonSection: {
    gap: 6,
  },

  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },

  reviewSection: {
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },

  reviewText: {
    fontSize: 12,
    color: '#78350f',
    lineHeight: 16,
  },

  classSection: {
    gap: 6,
  },

  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },

  classText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },

  dateInfo: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },

  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  dateLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  dateValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  /* Actions */
  actions: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fef2f2',
  },

  deleteButtonPressed: {
    backgroundColor: '#fee2e2',
    opacity: 0.8,
  },

  deleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },

  /* Empty State */
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
    textAlign: 'center',
  },

  resetFilterButton: {
    marginTop: 16,
    backgroundColor: '#1d4ed8',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6,
  },

  resetFilterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  /* Common */
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
    marginTop: 16,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
