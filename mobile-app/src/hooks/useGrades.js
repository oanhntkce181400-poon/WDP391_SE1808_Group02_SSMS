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
        : '0.00',
      enrollments: (group.enrollments || []).map((enrollment) => ({
        id: enrollment._id || '',
        subjectCode: enrollment.subject?.subjectCode || 'N/A',
        subjectName: enrollment.subject?.subjectName || 'N/A',
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
        semester: group.semester,
        academicYear: group.academicYear,
      })),
    })),
    overallGPA: typeof raw.overallGPA === 'number' ? raw.overallGPA.toFixed(2) : '0.00',
  };
}

export default function useGrades(options = {}) {
  const { enabled = true } = options;
  const [grades, setGrades] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

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

  const refresh = useCallback(
    () => fetchGrades(true),
    [fetchGrades]
  );

  const reload = useCallback(
    () => fetchGrades(false),
    [fetchGrades]
  );

  return {
    grades,
    loading,
    refreshing,
    error,
    refresh,
    reload,
  };
}
