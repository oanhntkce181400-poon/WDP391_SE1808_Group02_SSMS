import { useCallback, useEffect, useState } from 'react';
import studentService from '../services/studentService';

function buildAcademicYear(enrollmentYear) {
  if (!enrollmentYear || Number.isNaN(Number(enrollmentYear))) return 'N/A';
  const year = Number(enrollmentYear);
  return `${year}-${year + 1}`;
}

function normalizeProfile(raw = {}) {
  return {
    id: raw._id || '',
    fullName: raw.fullName || 'N/A',
    studentCode: raw.studentCode || 'N/A',
    cohort: raw.cohort,
    cohortLabel: raw.cohortLabel || (raw.cohort ? `K${raw.cohort}` : 'N/A'),
    gpa: typeof raw.gpa === 'number' ? raw.gpa.toFixed(2) : '0.00',
    enrollmentYear: raw.enrollmentYear || null,
    academicYear: buildAcademicYear(raw.enrollmentYear),
    majorCode: raw.majorCode || 'N/A',
    currentCurriculumSemester: raw.currentCurriculumSemester || null,
    classSection: raw.classSection || 'N/A',
  };
}

export default function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await studentService.getMyProfile();
      const payload = response?.data?.data || {};
      setProfile(normalizeProfile(payload));
    } catch (err) {
      const message = err?.response?.data?.message || 'Không thể tải thông tin sinh viên';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  return {
    profile,
    loading,
    refreshing,
    error,
    refresh: () => fetchProfile(true),
    reload: () => fetchProfile(false),
  };
}
