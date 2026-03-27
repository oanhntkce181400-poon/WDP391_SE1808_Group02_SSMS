import { useCallback, useEffect, useState } from 'react';
import gradeService from '../services/gradeService';

function normalizeGrades(raw = {}) {
  const semesterGroups = raw.semesterGroups || [];

  return {
    semesterGroups: semesterGroups.map((group) => ({
      semester: group.semester || 'N/A',
      academicYear: group.academicYear || 'N/A',
      totalCredits: group.totalCredits || 0,
      totalWeightedPoints: group.totalWeightedPoints || 0,
      semesterGPA: typeof group.semesterGPA === 'number'
        ? group.semesterGPA.toFixed(2)
        : String(group.semesterGPA || '0.00'),
      enrollments: (group.enrollments || []).map((enrollment) => ({
        id: enrollment._id || '',
        subjectCode: enrollment.subject?.subjectCode || enrollment.subjectCode || 'N/A',
        subjectName: enrollment.subject?.subjectName || enrollment.subjectName || 'N/A',
        credits: enrollment.credits || 0,
        grade: typeof enrollment.grade === 'number'
          ? enrollment.grade.toFixed(1)
          : null,
        gradeLabel: enrollment.gradeLabel || 'N/A',
        status: enrollment.status || 'N/A',
        midtermScore: enrollment.midtermScore || null,
        finalScore: enrollment.finalScore || null,
        assignmentScore: enrollment.assignmentScore || null,
        continuousScore: enrollment.continuousScore || null,
        ptScores: enrollment.ptScores || [],
        semester: group.semester,
        academicYear: group.academicYear,
      })),
    })),
    overallGPA: typeof raw.overallGPA === 'number' 
      ? raw.overallGPA.toFixed(2) 
      : String(raw.overallGPA || '0.00'),
  };
}

export default function useGrades(options = {}) {
  const { 
    enabled = true,
    autoRefresh = false,
    refreshInterval = 30000,
  } = options;

  const [grades, setGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchGrades = useCallback(async (isRefresh = false) => {
    if (!enabled) {
      setGrades(null);
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
      const response = await gradeService.getMyGrades();
      const normalized = normalizeGrades(response?.data);
      setGrades(normalized);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err?.response?.data?.message || 'Lỗi khi tải điểm';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || !enabled) return;

    const interval = setInterval(() => {
      fetchGrades(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, enabled, refreshInterval, fetchGrades]);

  const refresh = useCallback(
    () => fetchGrades(true),
    [fetchGrades]
  );

  const reload = useCallback(
    () => fetchGrades(false),
    [fetchGrades]
  );

  // Computed values
  const totalCredits = grades?.semesterGroups?.reduce((sum, group) => sum + (group.totalCredits || 0), 0) || 0;
  const totalWeightedPoints = grades?.semesterGroups?.reduce((sum, group) => sum + (group.totalWeightedPoints || 0), 0) || 0;
  const allEnrollments = grades?.semesterGroups?.flatMap(group => group.enrollments || []) || [];
  const failedCourses = allEnrollments.filter(e => e.grade && parseFloat(e.grade) < 5) || [];
  const passedCourses = allEnrollments.filter(e => e.grade && parseFloat(e.grade) >= 5) || [];

  return {
    grades,
    loading,
    refreshing,
    error,
    lastUpdated,
    
    // Computed values
    overallGPA: grades?.overallGPA || '0.00',
    totalCredits,
    totalWeightedPoints,
    allEnrollments,
    failedCourses,
    passedCourses,
    
    // Methods
    refresh,
    reload,
  };
}
