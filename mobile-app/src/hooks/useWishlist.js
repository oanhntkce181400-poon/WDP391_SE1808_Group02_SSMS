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
  const { 
    enabled = true,
    semesterId = null,
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  const [wishlist, setWishlist] = useState(null);
  const [semesterBreakdown, setSemesterBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

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
      // Fetch wishlist and semester breakdown in parallel
      const wishlistPromise = wishlistService.getMyWishlist();
      const breakdownPromise = semesterId 
        ? wishlistService.getSemesterBreakdown(semesterId)
        : Promise.resolve({ data: null });

      const [wishlistRes, breakdownRes] = await Promise.all([
        wishlistPromise.catch(err => {
          console.warn('Error fetching wishlist:', err.message);
          return { data: {} };
        }),
        breakdownPromise.catch(err => {
          console.warn('Error fetching semester breakdown:', err.message);
          return { data: null };
        }),
      ]);

      const normalized = normalizeWishlist(wishlistRes?.data);
      setWishlist(normalized);
      setSemesterBreakdown(breakdownRes?.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error in useWishlist:', err);
      const message = err?.response?.data?.message || 'Lỗi khi tải danh sách yêu cầu khoá học';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, semesterId]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      fetchWishlist(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, fetchWishlist]);

  const refresh = useCallback(
    () => fetchWishlist(true),
    [fetchWishlist]
  );

  const reload = useCallback(
    () => fetchWishlist(false),
    [fetchWishlist]
  );

  // Computed values
  const summary = wishlist?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 };
  const wishlists = wishlist?.wishlists || [];
  const pendingCount = wishlists.filter(w => w.status === 'pending').length;
  const approvedCount = wishlists.filter(w => w.status === 'approved').length;
  const rejectedCount = wishlists.filter(w => w.status === 'rejected').length;

  return {
    // Data
    wishlist,
    wishlists,
    semesterBreakdown,
    
    // Computed values
    summary,
    pendingCount,
    approvedCount,
    rejectedCount,
    
    // Status
    loading,
    refreshing,
    error,
    lastUpdated,
    
    // Methods
    refresh,
    reload,
  };
}
