import { useCallback, useEffect, useState } from 'react';
import gradeService from '../services/gradeService';

function normalizeGradeDetail(raw = {}) {
  const enrollment = raw.enrollment || {};
  const gradeDetails = raw.gradeDetails || {};
  const components = gradeDetails.components || {};

  // Parse weights from strings like "30%"
  const parseWeight = (weightStr) => {
    if (!weightStr) return 0;
    const match = String(weightStr).match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  return {
    enrollmentId: enrollment._id || '',
    subjectCode: enrollment.classSection?.subject?.subjectCode || 'N/A',
    subjectName: enrollment.classSection?.subject?.subjectName || 'N/A',
    credits: enrollment.credits || 0,
    grade: typeof enrollment.grade === 'number'
      ? enrollment.grade.toFixed(1)
      : null,
    gradeLabel: enrollment.gradeLabel || 'N/A',
    status: enrollment.status || 'N/A',
    studentCode: enrollment.student?.studentCode || 'N/A',
    studentName: enrollment.student?.fullName || 'N/A',
    semester: enrollment.classSection?.semester || 'N/A',
    academicYear: enrollment.classSection?.academicYear || 'N/A',
    
    // Grade components with weights
    components: {
      GK: {
        name: components.GK?.name || 'Giữa kỳ',
        score: components.GK?.score || null,
        weight: parseWeight(components.GK?.weight) || 30,
        displayWeight: components.GK?.weight || '30%'
      },
      CK: {
        name: components.CK?.name || 'Cuối kỳ',
        score: components.CK?.score || null,
        weight: parseWeight(components.CK?.weight) || 50,
        displayWeight: components.CK?.weight || '50%'
      },
      PT: {
        name: components['ProgressTest']?.name || 'Điểm ProgressTest',
        score: components['ProgressTest']?.score || null,
        weight: parseWeight(components['ProgressTest']?.weight) || 20,
        displayWeight: components['ProgressTest']?.weight || '20%'
      }
    },

    // Raw component list for easier iteration
    componentsList: [
      {
        code: 'GK',
        name: components.GK?.name || 'Giữa kỳ',
        shortName: 'GK',
        score: components.GK?.score || null,
        weight: parseWeight(components.GK?.weight) || 30,
      },
      {
        code: 'CK',
        name: components.CK?.name || 'Cuối kỳ',
        shortName: 'CK',
        score: components.CK?.score || null,
        weight: parseWeight(components.CK?.weight) || 50,
      },
      {
        code: 'PT',
        name: components['ProgressTest']?.name || 'Điểm ProgressTest',
        shortName: 'PT',
        score: components['ProgressTest']?.score || null,
        weight: parseWeight(components['ProgressTest']?.weight) || 20,
      }
    ].filter(c => c.score !== null || c.weight > 0),

    allComponentsProvided: gradeDetails.allComponentsProvided || false,
  };
}

export default function useGradeDetail(enrollmentId, options = {}) {
  const { 
    enabled = true,
    fetchChangeLogs = false 
  } = options;

  const [detail, setDetail] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchDetail = useCallback(async () => {
    if (!enabled || !enrollmentId) {
      setDetail(null);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch grade details and change logs in parallel if requested
      const detailPromise = gradeService.getGradeDetails(enrollmentId);
      const changeLogsPromise = fetchChangeLogs 
        ? gradeService.getEnrollmentGradeChangeLogs(enrollmentId)
        : Promise.resolve({ data: [] });

      const [detailRes, changeLogsRes] = await Promise.all([
        detailPromise,
        changeLogsPromise,
      ]);

      const normalized = normalizeGradeDetail(detailRes?.data);
      setDetail(normalized);
      setChangeLogs(Array.isArray(changeLogsRes?.data) ? changeLogsRes.data : []);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err?.response?.data?.message || 'Lỗi khi tải chi tiết điểm';
      setError(message);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, enrollmentId, fetchChangeLogs]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const reload = useCallback(
    () => fetchDetail(),
    [fetchDetail]
  );

  // Computed values
  const getComponentColor = (score) => {
    return gradeService.getScoreColor(score);
  };

  const getComponentName = (code) => {
    return gradeService.getComponentName(code);
  };

  return {
    detail,
    changeLogs,
    loading,
    error,
    lastUpdated,
    
    // Helper methods
    getComponentColor,
    getComponentName,
    
    // Methods
    reload,
  };
}
