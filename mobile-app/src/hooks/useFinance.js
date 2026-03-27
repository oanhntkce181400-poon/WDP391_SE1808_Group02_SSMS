import { useCallback, useEffect, useState } from 'react';
import tuitionFeeService from '../services/tuitionFeeService';

/**
 * Hook quản lý toàn bộ dữ liệu tài chính từ backend
 * Đảm bảo dữ liệu trên mobile đồng nhất với web
 */
export default function useFinance(options = {}) {
  const {
    enabled = true,
    semesterId = null,
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
  } = options;

  // ─── STATE ──────────────────────────────────────────────
  const [tuitionSummary, setTuitionSummary] = useState(null);
  const [tuitionBills, setTuitionBills] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [tuitionExcess, setTuitionExcess] = useState(0);
  const [curriculumPaymentStatus, setCurriculumPaymentStatus] = useState(null);
  const [pendingTuition, setPendingTuition] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // ─── FETCH ALL FINANCE DATA ─────────────────────────────
  const fetchAllFinanceData = useCallback(async (isRefresh = false) => {
    if (!enabled) {
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
      // Fetch all data in parallel
      const [
        summaryRes,
        billsRes,
        historyRes,
        excessRes,
        curriculumRes,
        pendingRes,
      ] = await Promise.all([
        tuitionFeeService.getMyTuitionSummary(semesterId)
          .catch(err => {
            console.warn('Error fetching tuition summary:', err.message);
            return { data: {} };
          }),
        tuitionFeeService.getTuitionBills()
          .catch(err => {
            console.warn('Error fetching tuition bills:', err.message);
            return { data: [] };
          }),
        tuitionFeeService.getPaymentHistory(semesterId)
          .catch(err => {
            console.warn('Error fetching payment history:', err.message);
            return { data: [] };
          }),
        tuitionFeeService.getTuitionExcess()
          .catch(err => {
            console.warn('Error fetching tuition excess:', err.message);
            return { data: 0 };
          }),
        tuitionFeeService.getCurriculumPaymentStatus()
          .catch(err => {
            console.warn('Error fetching curriculum payment status:', err.message);
            return { data: null };
          }),
        semesterId
          ? tuitionFeeService.checkPendingTuition(semesterId)
          : Promise.resolve({ data: null }),
      ]);

      // Safely extract and normalize data
      setTuitionSummary(summaryRes?.data || {});
      setTuitionBills(Array.isArray(billsRes?.data) ? billsRes.data : []);
      setPaymentHistory(Array.isArray(historyRes?.data) ? historyRes.data : []);
      setTuitionExcess(typeof excessRes?.data === 'number' ? excessRes.data : 0);
      setCurriculumPaymentStatus(curriculumRes?.data || null);
      setPendingTuition(pendingRes?.data || null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error in useFinance:', err);
      const message = err?.response?.data?.message || 'Lỗi khi tải thông tin tài chính';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, semesterId]);

  // ─── REFRESH FUNCTION ───────────────────────────────────
  const refresh = useCallback(() => {
    fetchAllFinanceData(true);
  }, [fetchAllFinanceData]);

  // ─── AUTO-FETCH ON MOUNT/DEPENDENCY CHANGE ──────────────
  useEffect(() => {
    fetchAllFinanceData();
  }, [fetchAllFinanceData]);

  // ─── AUTO-REFRESH INTERVAL ──────────────────────────────
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      fetchAllFinanceData(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, fetchAllFinanceData]);

  // ─── COMPUTED VALUES ────────────────────────────────────
  const totalDue = tuitionSummary?.totalDue || 0;
  const totalPaid = tuitionSummary?.totalPaid || 0;
  const remainingBalance = tuitionSummary?.remainingBalance || 0;
  const hasArrearage = totalDue > 0;

  return {
    // Data
    tuitionSummary,
    tuitionBills,
    paymentHistory,
    tuitionExcess,
    curriculumPaymentStatus,
    pendingTuition,

    // Computed
    totalDue,
    totalPaid,
    remainingBalance,
    hasArrearage,

    // Status
    loading,
    refreshing,
    error,
    lastUpdated,

    // Methods
    refresh,
  };
}
