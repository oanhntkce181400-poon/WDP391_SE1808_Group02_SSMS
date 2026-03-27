import { useCallback, useEffect, useState } from 'react';
import tuitionFeeService from '../services/tuitionFeeService';

function normalizeTuitionSummary(raw = {}) {
  // Normalize tuition summary response from backend - be defensive about data structure
  const details = Array.isArray(raw.details) ? raw.details : [];
  
  return {
    totalTuitionFee: Number(raw.totalTuitionFee) || 0,
    totalPaid: Number(raw.totalPaid) || 0,
    totalDue: Number(raw.totalDue) || 0,
    remainingBalance: Number(raw.remainingBalance) || 0,
    status: String(raw.status || 'PENDING').toUpperCase(),
    semester: raw.semester || null,
    academicYear: raw.academicYear || null,
    dueDate: raw.dueDate || null,
    cohort: raw.cohort || null,
    details: details.map(detail => ({
      itemType: detail.itemType || 'TUITION',
      itemName: detail.itemName || 'N/A',
      amount: Number(detail.amount) || 0,
      paid: Number(detail.paid) || 0,
      due: Number(detail.due) || 0,
      discount: Number(detail.discount) || 0,
    })),
  };
}

function normalizePaymentHistory(raw) {
  // Normalize payment history - handle different response structures
  if (!raw) {
    return [];
  }
  
  // If raw is not an array, return empty
  if (!Array.isArray(raw)) {
    return [];
  }
  
  return raw.map(payment => ({
    id: String(payment._id || payment.id || ''),
    amount: Number(payment.amount) || 0,
    status: String(payment.status || 'PENDING').toUpperCase(),
    paymentMethod: String(payment.paymentMethod || 'PAYOS'),
    transactionDate: payment.transactionDate || payment.createdAt || null,
    orderId: String(payment.orderCode || payment.orderId || ''),
    description: String(payment.description || ''),
    itemType: String(payment.itemType || 'TUITION'),
  }));
}

export default function useTuitionFee(options = {}) {
  const { enabled = true, semesterId = null } = options;
  const [tuition, setTuition] = useState(null);
  const [history, setHistory] = useState([]);
  const [excess, setExcess] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTuitionData = useCallback(async (isRefresh = false) => {
    if (!enabled) {
      setTuition(null);
      setHistory([]);
      setExcess(0);
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
      const [summaryRes, historyRes, excessRes] = await Promise.all([
        tuitionFeeService.getMyTuitionSummary(semesterId).catch(err => {
          console.warn('Error fetching tuition summary:', err.message);
          return { data: {} };
        }),
        tuitionFeeService.getPaymentHistory(semesterId).catch(err => {
          console.warn('Error fetching payment history:', err.message);
          return { data: [] };
        }),
        tuitionFeeService.getTuitionExcess().catch(err => {
          console.warn('Error fetching tuition excess:', err.message);
          return { data: 0 };
        }),
      ]);

      // Safely extract data, handling different response structures
      const summaryData = summaryRes?.data || {};
      const historyData = historyRes?.data || [];
      const excessData = excessRes?.data || 0;

      // Additional safety check
      const safeHistoryData = Array.isArray(historyData) ? historyData : [];

      const normalizedTuition = normalizeTuitionSummary(summaryData);
      const normalizedHistory = normalizePaymentHistory(safeHistoryData);
      const normalizedExcess = typeof excessData === 'number' ? excessData : 0;

      setTuition(normalizedTuition);
      setHistory(normalizedHistory);
      setExcess(normalizedExcess);
    } catch (err) {
      console.error('Error in useTuitionFee:', err);
      const message = err?.response?.data?.message || 'Lỗi khi tải thông tin học phí';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled, semesterId]);

  const refresh = useCallback(() => {
    fetchTuitionData(true);
  }, [fetchTuitionData]);

  useEffect(() => {
    fetchTuitionData();
  }, [fetchTuitionData]);

  return {
    tuition,
    history,
    excess,
    loading,
    refreshing,
    error,
    refresh,
  };
}
