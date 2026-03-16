import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gradesService from '../../services/gradesService';
import axiosClient from '../../services/axiosClient';

export default function LecturerGradesEntryPage() {
  const { classSectionId } = useParams();
  const navigate = useNavigate();
  
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editedGrades, setEditedGrades] = useState({});
  const [classInfo, setClassInfo] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!classSectionId) {
      setError('Không tìm thấy ID lớp học. Vui lòng quay lại và chọn lớp.');
      setLoading(false);
      return;
    }
    fetchEnrollments();
    fetchClassInfo();
  }, [classSectionId]);

  const fetchClassInfo = async () => {
    try {
      const response = await axiosClient.get(`/classes/${classSectionId}`);
      setClassInfo(response.data.data);
    } catch (err) {
      console.error('Error fetching class info:', err);
    }
  };

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradesService.getClassEnrollmentsForGrading(classSectionId);
      const enrollmentsData = response.data.data || [];
      // Ensure it's always an array
      setEnrollments(Array.isArray(enrollmentsData) ? enrollmentsData : []);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError('Không thể tải danh sách sinh viên. Vui lòng thử lại.');
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (enrollmentId, component, value) => {
    const numValue = value === '' ? null : Math.min(10, Math.max(0, parseFloat(value)));
    
    if (!editedGrades[enrollmentId]) {
      editedGrades[enrollmentId] = {};
    }
    
    editedGrades[enrollmentId][component] = numValue;
    
    // Auto-calculate final grade if all three components are present
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    if (enrollment && editedGrades[enrollmentId]) {
      const edited = editedGrades[enrollmentId];
      const gk = edited.midtermScore !== undefined ? edited.midtermScore : enrollment.midtermScore;
      const ck = edited.finalScore !== undefined ? edited.finalScore : enrollment.finalScore;
      const bt = edited.assignmentScore !== undefined ? edited.assignmentScore : enrollment.assignmentScore;
      
      if (gk !== null && gk !== undefined && ck !== null && ck !== undefined && bt !== null && bt !== undefined) {
        const calculatedGrade = (gk * 0.30) + (ck * 0.50) + (bt * 0.20);
        editedGrades[enrollmentId].calculatedGrade = Math.round(calculatedGrade * 100) / 100;
      }
    }
    
    setEditedGrades({ ...editedGrades });
  };

  const getDisplayGrade = (enrollmentId, component) => {
    if (editedGrades[enrollmentId] && editedGrades[enrollmentId][component] !== undefined) {
      return editedGrades[enrollmentId][component];
    }
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    return enrollment?.[component] || '';
  };

  const getCalculatedGrade = (enrollmentId) => {
    if (editedGrades[enrollmentId] && editedGrades[enrollmentId].calculatedGrade !== undefined) {
      return editedGrades[enrollmentId].calculatedGrade;
    }
    const enrollment = enrollments.find(e => e._id === enrollmentId);
    return enrollment?.grade || '—';
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined || score === '') return 'text-gray-500';
    if (score >= 8) return 'text-green-600 font-semibold';
    if (score >= 6.5) return 'text-blue-600 font-semibold';
    if (score >= 5) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  const handleSubmitFinalGrades = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const response = await gradesService.submitFinalClassGrades(classSectionId);
      
      setSuccess(`✅ Nộp điểm chính thức thành công: ${response.data.processed}/${response.data.total} sinh viên`);
      setShowSubmitModal(false);
      setEditedGrades({});
      
      // Refresh enrollments after successful submission
      setTimeout(() => {
        fetchEnrollments();
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Lỗi nộp điểm chính thức';
      setError(`❌ ${errorMsg}`);
      console.error('Error submitting final grades:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveGrades = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const gradesToSubmit = [];
      Object.keys(editedGrades).forEach((enrollmentId) => {
        const gradeData = editedGrades[enrollmentId];
        const gradeEntry = { enrollmentId };
        
        if (gradeData.midtermScore !== undefined) gradeEntry.midtermScore = gradeData.midtermScore;
        if (gradeData.finalScore !== undefined) gradeEntry.finalScore = gradeData.finalScore;
        if (gradeData.assignmentScore !== undefined) gradeEntry.assignmentScore = gradeData.assignmentScore;
        if (gradeData.continuousScore !== undefined) gradeEntry.continuousScore = gradeData.continuousScore;
        
        if (Object.keys(gradeEntry).length > 1) {
          gradesToSubmit.push(gradeEntry);
        }
      });

      if (gradesToSubmit.length === 0) {
        setError('Không có điểm nào được thay đổi.');
        return;
      }

      const response = await gradesService.submitGrades(gradesToSubmit, true);
      
      if (response.data.success) {
        setSuccess(`Lưu thành công ${response.data.updated} bản ghi!`);
        setEditedGrades({});
        // Refresh enrollment data
        setTimeout(() => {
          fetchEnrollments();
        }, 1500);
      } else {
        setError('Lỗi khi lưu điểm. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error saving grades:', err);
      setError(err.response?.data?.message || 'Không thể lưu điểm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nhập Điểm Sinh Viên</h1>
          {classInfo && (
            <p className="text-gray-600 mt-2">
              {classInfo.subject?.subjectCode} - {classInfo.subject?.subjectName}
            </p>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold mb-2">{error}</p>
                {error.includes('ID lớp') && (
                  <p className="text-sm mt-2">
                    💡 Để nhập điểm, vui lòng quay lại trang Lịch Giảng Dạy và chọn 1 lớp để nhập điểm.
                  </p>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-700 hover:text-red-900 flex-shrink-0"
              >
                ×
              </button>
            </div>
            {error.includes('ID lớp') && (
              <button
                onClick={() => navigate('/lecturer/teaching-schedule')}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                ← Quay lại Lịch Giảng Dạy
              </button>
            )}
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex justify-between items-center">
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-300">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Mã SV</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Họ và Tên</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Giữa Kỳ (30%)
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Cuối Kỳ (50%)
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Bài Tập (20%)
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Quá Trình
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                    Điểm Cuối Cùng
                  </th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {enrollment.student?.studentCode || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {enrollment.student?.fullName || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={getDisplayGrade(enrollment._id, 'midtermScore') === null ? '' : getDisplayGrade(enrollment._id, 'midtermScore')}
                        onChange={(e) => handleGradeChange(enrollment._id, 'midtermScore', e.target.value)}
                        className="w-full px-3 py-2 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={getDisplayGrade(enrollment._id, 'finalScore') === null ? '' : getDisplayGrade(enrollment._id, 'finalScore')}
                        onChange={(e) => handleGradeChange(enrollment._id, 'finalScore', e.target.value)}
                        className="w-full px-3 py-2 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={getDisplayGrade(enrollment._id, 'assignmentScore') === null ? '' : getDisplayGrade(enrollment._id, 'assignmentScore')}
                        onChange={(e) => handleGradeChange(enrollment._id, 'assignmentScore', e.target.value)}
                        className="w-full px-3 py-2 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={getDisplayGrade(enrollment._id, 'continuousScore') === null ? '' : getDisplayGrade(enrollment._id, 'continuousScore')}
                        onChange={(e) => handleGradeChange(enrollment._id, 'continuousScore', e.target.value)}
                        className="w-full px-3 py-2 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </td>
                    <td className={`px-6 py-4 text-center text-sm font-medium ${getScoreColor(getCalculatedGrade(enrollment._id))}`}>
                      {getCalculatedGrade(enrollment._id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {enrollments.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500">Không có sinh viên nào trong lớp.</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-between gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
          >
            Quay Lại
          </button>
          <div className="flex gap-4">
            <button
              onClick={handleSaveGrades}
              disabled={saving || Object.keys(editedGrades).length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
            >
              {saving ? 'Đang Lưu...' : 'Lưu Điểm'}
            </button>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
            >
              Nộp Điểm Chính Thức
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Lưu ý:</strong> Điểm cuối cùng sẽ được tính tự động theo công thức: 
            Giữa kỳ (30%) + Cuối kỳ (50%) + Bài tập (20%).
            Điểm quá trình chỉ mang tính chất tham khảo.
          </p>
        </div>

        {/* Submit Final Grades Modal */}
        {showSubmitModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Xác Nhận Nộp Điểm</h2>
              </div>
              
              <div className="p-6">
                <p className="text-gray-700 mb-4">
                  Bạn sắp nộp điểm chính thức cho tất cả sinh viên trong lớp. 
                  <strong> Hành động này không thể hoàn tác.</strong>
                </p>
                <ul className="text-sm text-gray-600 space-y-2 mb-6 bg-gray-50 p-4 rounded">
                  <li>✓ Sẽ tính điểm cuối cùng cho các sinh viên có đủ 3 thành phần</li>
                  <li>✓ Các sinh viên thiếu thành phần sẽ được bỏ qua</li>
                  <li>✓ Điểm sẽ được khóa và không thể chỉnh sửa</li>
                </ul>
                <p className="text-gray-900 font-semibold">
                  Tổng sinh viên: <span className="text-blue-600">{enrollments.length}</span>
                </p>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                <button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSubmitFinalGrades}
                  disabled={submitting}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                      Đang Nộp...
                    </>
                  ) : (
                    'Xác Nhận Nộp Điểm'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
