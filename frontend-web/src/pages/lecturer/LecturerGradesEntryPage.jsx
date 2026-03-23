import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import gradesService from '../../services/gradesService';
import axiosClient from '../../services/axiosClient';

export default function LecturerGradesEntryPage() {
  const { classSectionId } = useParams();
  const navigate = useNavigate();

  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingRowId, setSavingRowId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [classInfo, setClassInfo] = useState(null);
  const [gradeDrafts, setGradeDrafts] = useState({});

  // Modal sửa điểm
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [editForm, setEditForm] = useState({
    midtermScore: '',
    finalScore: '',
    otherScore: '',
    continuousScore: '',
  });

  // Modal log thay đổi
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedLogEnrollment, setSelectedLogEnrollment] = useState(null);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Khi classSectionId thay đổi: kiểm tra ID rồi tải thông tin lớp + danh sách sinh viên
  useEffect(() => {
    if (!classSectionId) {
      setError('Không tìm thấy ID lớp học. Vui lòng quay lại và chọn lớp.');
      setLoading(false);
      return;
    }
    fetchEnrollments();
    fetchClassInfo();
  }, [classSectionId]);

  // Gọi API lấy thông tin chi tiết của lớp hiện tại
  const fetchClassInfo = async () => {
    try {
      const response = await axiosClient.get(`/classes/${classSectionId}`);
      setClassInfo(response.data.data);
    } catch (err) {
      console.error('Error fetching class info:', err);
    }
  };

  // Gọi API lấy danh sách sinh viên của lớp và tạo dữ liệu draft cho các ô nhập điểm
  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await gradesService.getClassEnrollmentsForGrading(classSectionId);
      const enrollmentsData = response.data.data || [];
      // Ensure it's always an array
      const list = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      setEnrollments(list);

      const drafts = {};
      list.forEach((item) => {
        drafts[item._id] = {
          midtermScore: item.midtermScore ?? '',
          finalScore: item.finalScore ?? '',
          otherScore: item.assignmentScore ?? '',
        };
      });
      setGradeDrafts(drafts);
    } catch (err) {
      console.error('Error fetching enrollments:', err);
      setError('Không thể tải danh sách sinh viên. Vui lòng thử lại.');
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  // Chuẩn hóa input điểm: rỗng -> null, sai số -> null, còn lại ép về khoảng 0-10
  const normalizeScoreInput = (rawValue) => {
    if (rawValue === '') {
      return null;
    }

    const numValue = Number(rawValue);
    if (Number.isNaN(numValue)) {
      return null;
    }

    return Math.min(10, Math.max(0, numValue));
  };

  // Format điểm để hiển thị: null/undefined -> '-', có điểm -> 1 chữ số thập phân
  const formatScore = (score) => {
    if (score === null || score === undefined) return '—';
    return Number(score).toFixed(1);
  };

  // Kiểm tra enrollment đã chốt điểm chưa để khóa thao tác sửa/lưu
  const isFinalizedEnrollment = (enrollment) => {
    return enrollment?.isFinalized === true || enrollment?.status === 'completed';
  };

  // Cập nhật điểm draft theo từng ô input khi giảng viên nhập
  const handleDraftChange = (enrollmentId, field, value) => {
    setGradeDrafts((prev) => ({
      ...prev,
      [enrollmentId]: {
        ...(prev[enrollmentId] || {}),
        [field]: value,
      },
    }));
  };

  // Lưu điểm cho 1 sinh viên: validate dữ liệu, gọi API lưu, rồi tải lại danh sách
  const handleSaveRow = async (enrollment) => {
    try {
      if (!enrollment?._id || !enrollment?.student?._id) {
        setError('Khong tim thay du lieu enrollment de luu diem.');
        return;
      }

      const draft = gradeDrafts[enrollment._id] || {};
      setSavingRowId(enrollment._id);
      setError(null);
      setSuccess(null);

      await gradesService.submitSingleStudentGrade({
        studentId: enrollment.student._id,
        classSectionId,
        grade: {
          midtermScore: normalizeScoreInput(draft.midtermScore),
          finalScore: normalizeScoreInput(draft.finalScore),
          otherScore: normalizeScoreInput(draft.otherScore),
        },
      });

      setSuccess(`Đã lưu điểm cho ${enrollment.student?.fullName || 'sinh viên'}.`);
      await fetchEnrollments();
    } catch (err) {
      console.error('Error saving row grade:', err);
      setError(err.response?.data?.message || 'Không thể lưu điểm. Vui lòng thử lại.');
    } finally {
      setSavingRowId('');
    }
  };

  const handlePublishOfficialGrades = async () => {
    try {
      if (!classSectionId) return;

      // Ask for confirmation before publishing final grades
      const confirmed = window.confirm('Bạn có chắc chắn muốn công bố điểm cuối cùng?');
      if (!confirmed) return;

      setPublishing(true);
      setError(null);
      setSuccess(null);

      const response = await gradesService.submitFinalClassGrades(classSectionId);

      // Show fixed success message required by the feature spec
      if (response?.data?.success) {
        setSuccess('Grades have been published and emailed to students');
      } else {
        setSuccess(response?.data?.message || 'Publish grades finished');
      }
      await fetchEnrollments();
    } catch (err) {
      console.error('Error publishing official grades:', err);
      setError(err.response?.data?.message || 'Không thể công bố điểm. Vui lòng thử lại.');
    } finally {
      setPublishing(false);
    }
  };

  const hasUnfinalizedRows = enrollments.some((enrollment) => !isFinalizedEnrollment(enrollment));

  const openEditModal = (enrollment) => {
    setEditingEnrollment(enrollment);
    setEditReason('');
    setEditForm({
      midtermScore: enrollment.midtermScore ?? '',
      finalScore: enrollment.finalScore ?? '',
      otherScore: enrollment.assignmentScore ?? '',
      continuousScore: enrollment.continuousScore ?? '',
    });
    setShowEditModal(true);
  };

  const handleSaveEditedGrade = async () => {
    try {
      if (!editingEnrollment?._id) {
        setError('Không tìm thấy enrollment để sửa điểm.');
        return;
      }

      setSavingEdit(true);
      setError(null);
      setSuccess(null);

      const payload = {
        grade: {
          midtermScore: normalizeScoreInput(editForm.midtermScore),
          finalScore: normalizeScoreInput(editForm.finalScore),
          otherScore: normalizeScoreInput(editForm.otherScore),
          continuousScore: normalizeScoreInput(editForm.continuousScore),
        },
        reason: String(editReason || '').trim(),
      };

      await gradesService.updateEnrollmentGrade(editingEnrollment._id, payload);

      setSuccess('Sửa điểm thành công.');
      setShowEditModal(false);
      setEditingEnrollment(null);
      await fetchEnrollments();
    } catch (err) {
      console.error('Error saving edited grade:', err);
      setError(err.response?.data?.message || 'Không thể sửa điểm. Vui lòng thử lại.');
    } finally {
      setSavingEdit(false);
    }
  };

  const openLogsModal = async (enrollment) => {
    try {
      setSelectedLogEnrollment(enrollment);
      setShowLogsModal(true);
      setLoadingLogs(true);
      setChangeLogs([]);

      const response = await gradesService.getEnrollmentGradeChangeLogs(enrollment._id);
      setChangeLogs(response?.data?.data || []);
    } catch (err) {
      console.error('Error loading grade change logs:', err);
      setError(err.response?.data?.message || 'Không thể tải log thay đổi điểm.');
    } finally {
      setLoadingLogs(false);
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
          <div className="mt-4">
            <button
              onClick={handlePublishOfficialGrades}
              disabled={publishing || !hasUnfinalizedRows}
              className="px-4 py-2 rounded bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:bg-slate-300"
            >
              {publishing ? 'Publishing...' : 'Publish Grades'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold mb-2">{error}</p>
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
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Tên Sinh Viên</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Điểm GK</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Điểm CK</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Điểm khác</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map((enrollment) => (
                  <tr key={enrollment._id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {enrollment.student?.fullName || '—'} ({enrollment.student?.studentCode || '—'})
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-800">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={gradeDrafts[enrollment._id]?.midtermScore ?? ''}
                          onChange={(e) => handleDraftChange(enrollment._id, 'midtermScore', e.target.value)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-center disabled:bg-slate-100"
                        />
                        <button
                          onClick={() => openEditModal(enrollment)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-300"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-800">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={gradeDrafts[enrollment._id]?.finalScore ?? ''}
                          onChange={(e) => handleDraftChange(enrollment._id, 'finalScore', e.target.value)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-center disabled:bg-slate-100"
                        />
                        <button
                          onClick={() => openEditModal(enrollment)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-300"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-800">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={gradeDrafts[enrollment._id]?.otherScore ?? ''}
                          onChange={(e) => handleDraftChange(enrollment._id, 'otherScore', e.target.value)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-center disabled:bg-slate-100"
                        />
                        <button
                          onClick={() => openEditModal(enrollment)}
                          disabled={isFinalizedEnrollment(enrollment)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 disabled:text-slate-300"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleSaveRow(enrollment)}
                          disabled={isFinalizedEnrollment(enrollment) || savingRowId === enrollment._id}
                          className="px-3 py-1 rounded bg-emerald-600 text-white text-xs hover:bg-emerald-700 disabled:bg-slate-300"
                        >
                          {savingRowId === enrollment._id ? 'Đang lưu...' : 'Lưu'}
                        </button>
                        <button
                          onClick={() => openLogsModal(enrollment)}
                          className="px-3 py-1 rounded bg-slate-100 text-slate-700 text-xs hover:bg-slate-200"
                        >
                          Lịch sử thay đổi
                        </button>
                      </div>
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

        <div className="mt-8 flex justify-start gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-lg transition"
          >
            Quay Lại
          </button>
        </div>

        {/* Edit Grade Modal */}
        {showEditModal && editingEnrollment && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-lg bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Sửa điểm sinh viên</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {editingEnrollment.student?.fullName || '—'} ({editingEnrollment.student?.studentCode || '—'})
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Midterm</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.midtermScore}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, midtermScore: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Final</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.finalScore}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, finalScore: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Other</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={editForm.otherScore}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, otherScore: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Continuous (optional)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={editForm.continuousScore}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, continuousScore: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">Lý do chỉnh sửa (để lưu log)</label>
                  <textarea
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                    rows={3}
                    placeholder="Ví dụ: Nhập nhầm điểm giữa kỳ, chỉnh theo biên bản lớp"
                  />
                </div>
              </div>

              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEditedGrade}
                  disabled={savingEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {savingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Change Logs Modal */}
        {showLogsModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Log thay đổi điểm</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedLogEnrollment?.student?.fullName || '—'} ({selectedLogEnrollment?.student?.studentCode || '—'})
                  </p>
                </div>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <div className="p-6 max-h-[420px] overflow-y-auto">
                {loadingLogs && <p className="text-sm text-gray-600">Đang tải log...</p>}

                {!loadingLogs && changeLogs.length === 0 && (
                  <p className="text-sm text-gray-600">Chưa có log thay đổi điểm.</p>
                )}

                {!loadingLogs && changeLogs.length > 0 && (
                  <div className="space-y-3">
                    {changeLogs.map((log) => (
                      <div key={log._id} className="border border-gray-200 rounded p-3">
                        <div className="text-xs text-gray-500 mb-2">
                          {new Date(log.createdAt).toLocaleString('vi-VN')} - {log.changedBy?.fullName || log.changedBy?.email || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          Changed fields: {(log.changedFields || []).join(', ') || '—'}
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          Before: GK {formatScore(log.beforeScores?.midtermScore)} | CK {formatScore(log.beforeScores?.finalScore)} | Other {formatScore(log.beforeScores?.assignmentScore)}
                        </div>
                        <div className="text-sm text-gray-700 mb-1">
                          After: GK {formatScore(log.afterScores?.midtermScore)} | CK {formatScore(log.afterScores?.finalScore)} | Other {formatScore(log.afterScores?.assignmentScore)}
                        </div>
                        <div className="text-sm text-gray-700">
                          Reason: {log.reason || 'Không có'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
