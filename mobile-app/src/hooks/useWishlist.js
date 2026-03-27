import { useCallback, useEffect, useState } from 'react';
import wishlistService from '../services/wishlistService';

function normalizeWishlist(raw = {}) {
  const wishlists = raw.wishlists || [];

  return {
    wishlists: wishlists.map((item) => ({
      id: item._id || '',
      subjectCode: item.subject?.subjectCode || 'N/A',
      subjectName: item.subject?.subjectName || 'N/A',
      credits: item.subject?.credits || 0,
      semester: item.semester?.semesterNumber || 'N/A',
      academicYear: item.semester?.academicYear || 'N/A',
      reason: item.reason || '',
      priority: item.priority || 3,
      status: item.status || 'pending', // pending, approved, rejected
      enrolledClassSection: item.enrolledClassSection || null,
      reviewedBy: item.reviewedBy || null,
      reviewedAt: item.reviewedAt || null,
      reviewNote: item.reviewNote || '',
      createdAt: item.createdAt || null,
      updatedAt: item.updatedAt || null,
      // Derived fields for easier display
      statusLabel: getStatusLabel(item.status),
      statusColor: getStatusColor(item.status),
      priorityLabel: getPriorityLabel(item.priority),
      canDelete: item.status === 'pending', // Only pending requests can be deleted
    })),
    summary: raw.summary || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    },
  };
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Đang chờ',
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    pending: '#f59e0b', // Amber
    approved: '#16a34a', // Green
    rejected: '#dc2626', // Red
  };
  return colors[status] || '#6b7280';
}

function getPriorityLabel(priority) {
  const labels = {
    1: 'Rất thấp',
    2: 'Thấp',
    3: 'Bình thường',
    4: 'Cao',
    5: 'Rất cao',
  };
  return labels[priority] || 'Bình thường';
}

export default function useWishlist(options = {}) {
  const { enabled = true } = options;
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchWishlist = useCallback(async (isRefresh = false) => {
    if (!enabled) {
      setWishlist(null);
      setError('');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await wishlistService.getMyWishlist();
      const normalized = normalizeWishlist(response?.data);
      setWishlist(normalized);
    } catch (err) {
      const message = err?.response?.data?.message || 'Lỗi khi tải danh sách yêu cầu khoá học';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const refresh = useCallback(
    () => fetchWishlist(true),
    [fetchWishlist]
  );

  const reload = useCallback(
    () => fetchWishlist(false),
    [fetchWishlist]
  );

  return {
    wishlist,
    loading,
    refreshing,
    error,
    refresh,
    reload,
  };
}
