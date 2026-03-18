import { useEffect, useMemo, useState } from 'react';
import gradesService from '../../services/gradesService';
import semesterService from '../../services/semesterService';
import subjectService from '../../services/subjectService';
import wishlistService from '../../services/wishlistService';

const STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
};

const STATUS_LABELS = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
};

function resolveSemesterId(semester) {
  return String(semester?._id || semester?.id || '').trim();
}

function isLikelyObjectId(value) {
  return /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());
}

function buildSubjectHistoryMap(enrollments = []) {
  const bySubject = new Map();
  const passedSubjectIds = new Set();

  const sorted = [...enrollments].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  for (const row of sorted) {
    const subject = row?.classSection?.subject;
    if (!subject?._id) continue;

    const numericGrade =
      typeof row.finalGrade === 'number'
        ? row.finalGrade
        : typeof row.grade === 'number'
        ? row.grade
        : null;

    if (numericGrade === null) continue;

    if (numericGrade >= 5) {
      passedSubjectIds.add(subject._id);
      continue;
    }

    if (!bySubject.has(subject._id)) {
      bySubject.set(subject._id, {
        subjectId: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits || 0,
        lastGrade: numericGrade,
        lastAttemptClass: row.classSection?.classCode || 'N/A',
        academicYear: row.classSection?.academicYear || 'N/A',
        semester: row.classSection?.semester || 'N/A',
      });
    }
  }

  return { failedBySubject: bySubject, passedSubjectIds };
}

function buildWishlistCandidates(subjects = [], subjectHistory = { failedBySubject: new Map(), passedSubjectIds: new Set() }) {
  const failedBySubject = subjectHistory.failedBySubject || new Map();
  const passedSubjectIds = subjectHistory.passedSubjectIds || new Set();

  return subjects
    .filter((subject) => subject?._id && !passedSubjectIds.has(subject._id))
    .map((subject) => {
      const failedInfo = failedBySubject.get(subject._id);
      return {
        subjectId: subject._id,
        subjectCode: subject.subjectCode,
        subjectName: subject.subjectName,
        credits: subject.credits || 0,
        category: failedInfo ? 'failed' : 'notLearned',
        failedInfo: failedInfo || null,
      };
    })
    .sort((a, b) => {
      if (a.category !== b.category) {
        return a.category === 'failed' ? -1 : 1;
      }
      return String(a.subjectCode || '').localeCompare(String(b.subjectCode || ''));
    });
}

export default function CourseWishlistPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [wishlistCandidates, setWishlistCandidates] = useState([]);
  const [myWishlist, setMyWishlist] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [semesterBreakdown, setSemesterBreakdown] = useState(null);

  const [subjectId, setSubjectId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [reason, setReason] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadData() {
    setLoading(true);
    try {
      const [gradesRes, semestersRes, wishlistRes, subjectsRes] = await Promise.all([
        gradesService.getMyGradeDetails({ status: 'completed' }),
        semesterService.getAll(),
        wishlistService.getMyWishlist(),
        subjectService.getSubjects({ page: 1, limit: 1000 }),
      ]);

      const historyEnrollments = gradesRes?.data?.data?.enrollments || [];
      const semesterItems = semestersRes?.data?.data || [];
      const wishlistItems = wishlistRes?.data?.data || [];
      const subjects = subjectsRes?.data?.data || [];

      const historyMap = buildSubjectHistoryMap(historyEnrollments);
      const candidates = buildWishlistCandidates(subjects, historyMap);

      setWishlistCandidates(candidates);
      setSemesters(semesterItems);
      setMyWishlist(wishlistItems);

      const availableSemesterIds = semesterItems
        .map((item) => resolveSemesterId(item))
        .filter(Boolean);
      const hasValidSelectedSemester = availableSemesterIds.includes(String(semesterId || '').trim());

      if (!hasValidSelectedSemester) {
        const currentSemester = semesterItems.find((item) => item.isCurrent);
        setSemesterId(resolveSemesterId(currentSemester) || availableSemesterIds[0] || '');
      }
    } catch (error) {
      console.error('Load wishlist data failed:', error);
      showToast(error?.response?.data?.message || 'Không thể tải dữ liệu wishlist', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadBreakdown() {
      if (!semesterId) {
        if (isMounted) setSemesterBreakdown(null);
        return;
      }

      if (!isLikelyObjectId(semesterId)) {
        if (isMounted) setSemesterBreakdown(null);
        return;
      }

      setBreakdownLoading(true);
      try {
        const response = await wishlistService.getSemesterBreakdown(semesterId, {
          subjectId: subjectId || undefined,
        });

        if (isMounted) {
          setSemesterBreakdown(response?.data?.data || null);
        }
      } catch (error) {
        console.error('Load semester breakdown failed:', error);
        if (isMounted) {
          setSemesterBreakdown(null);
        }
      } finally {
        if (isMounted) {
          setBreakdownLoading(false);
        }
      }
    }

    loadBreakdown();

    return () => {
      isMounted = false;
    };
  }, [semesterId, subjectId]);

  const selectedSubject = useMemo(
    () => wishlistCandidates.find((item) => item.subjectId === subjectId) || null,
    [wishlistCandidates, subjectId],
  );

  const canSubmitByBreakdown =
    !subjectId ||
    !semesterBreakdown ||
    semesterBreakdown.canAddSelectedSubject;

  async function handleSubmit(e) {
    e.preventDefault();

    if (!subjectId || !semesterId) {
      showToast('Vui lòng chọn môn học và học kỳ', 'error');
      return;
    }

    if (!isLikelyObjectId(semesterId)) {
      showToast('Học kỳ không hợp lệ. Vui lòng chọn lại học kỳ.', 'error');
      return;
    }

    if (!canSubmitByBreakdown) {
      showToast('Không thể thêm môn này vì sẽ vượt quá giới hạn 7 môn trong kỳ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await wishlistService.createWishlist({
        subjectId,
        semesterId,
        reason,
      });

      showToast('Tạo wishlist thành công', 'success');
      setReason('');
      setSubjectId('');
      await loadData();
    } catch (error) {
      console.error('Create wishlist failed:', error);
      showToast(error?.response?.data?.message || 'Tạo wishlist thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Wishlist môn học</h1>
          <p className="mt-1 text-sm text-slate-600">
            Chọn môn muốn học để gửi yêu cầu vào wishlist trước kỳ mới.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Tạo yêu cầu mới</h2>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Môn học muốn đưa vào wishlist</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                disabled={loading || wishlistCandidates.length === 0}
              >
                <option value="">-- Chọn môn --</option>
                {wishlistCandidates.map((item) => (
                  <option key={item.subjectId} value={item.subjectId}>
                    [{item.category === 'failed' ? 'Đã rớt' : 'Chưa học'}] {item.subjectCode} - {item.subjectName}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Học kỳ muốn học</label>
              <select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                disabled={loading}
              >
                <option value="">-- Chọn học kỳ --</option>
                {semesters.map((semester, index) => {
                  const optionId = resolveSemesterId(semester);
                  return (
                  <option key={optionId || `semester-${index}`} value={optionId}>
                    {semester.name || `${semester.code} (${semester.academicYear})`}
                  </option>
                  );
                })}
              </select>
            </div>

            <div className="mb-5">
              <label className="mb-1 block text-sm font-medium text-slate-700">Lý do (tuỳ chọn)</label>
              <textarea
                rows={4}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ví dụ: Cần học môn này sớm để đáp ứng điều kiện tiên quyết"
              />
            </div>

            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              {breakdownLoading ? (
                <p>Đang tính số môn trong kỳ...</p>
              ) : semesterBreakdown ? (
                <>
                  <p className="font-semibold">
                    Tổng môn hiện có trong kỳ: {semesterBreakdown.distinctSubjectsCurrent}/{semesterBreakdown.maxSubjectsPerSemester}
                  </p>
                  <p
                    className={`mt-1 font-medium ${
                      semesterBreakdown.distinctSubjectsAfterSelection > semesterBreakdown.maxSubjectsPerSemester
                        ? 'text-red-600'
                        : 'text-emerald-700'
                    }`}
                  >
                    Sau khi thêm môn đang chọn: {semesterBreakdown.distinctSubjectsAfterSelection}/{semesterBreakdown.maxSubjectsPerSemester}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <span>Planned: {semesterBreakdown.counts?.planned || 0}</span>
                    <span>Assigned: {semesterBreakdown.counts?.assigned || 0}</span>
                    <span>Wishlist: {semesterBreakdown.counts?.wishlist || 0}</span>
                  </div>
                </>
              ) : (
                <p>Chọn học kỳ để xem bộ đếm môn.</p>
              )}
            </div>

            {selectedSubject && (
              <div className="mb-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
                {selectedSubject.category === 'failed'
                  ? `Lần rớt gần nhất: lớp ${selectedSubject.failedInfo?.lastAttemptClass}, kỳ ${selectedSubject.failedInfo?.semester} - ${selectedSubject.failedInfo?.academicYear}.`
                  : 'Môn này chưa học trước đây, bạn có thể đăng ký học trước qua wishlist.'}
              </div>
            )}

            <button
              type="submit"
              disabled={
                submitting ||
                loading ||
                wishlistCandidates.length === 0 ||
                breakdownLoading ||
                !canSubmitByBreakdown
              }
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? 'Đang gửi...' : 'Gửi vào wishlist'}
            </button>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-slate-800">Wishlist của tôi</h2>

            {loading ? (
              <p className="py-10 text-center text-sm text-slate-500">Đang tải dữ liệu...</p>
            ) : myWishlist.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Chưa có yêu cầu wishlist nào.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Môn học</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Học kỳ</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Trạng thái</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Lý do / Phản hồi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myWishlist.map((item) => (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{item.subject?.subjectName || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{item.subject?.subjectCode || ''}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{item.semester?.name || item.semester?.code || 'N/A'}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600'}`}>
                            {STATUS_LABELS[item.status] || item.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">
                          <p>{item.reason || '—'}</p>
                          {item.reviewNote ? (
                            <p className="mt-1 text-xs text-slate-500">Phản hồi: {item.reviewNote}</p>
                          ) : null}
                          {item.enrolledClassSection?.classCode ? (
                            <p className="mt-1 text-xs text-emerald-600">Lớp xếp: {item.enrolledClassSection.classCode}</p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {!loading && wishlistCandidates.length === 0 && (
          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            Hiện tại không có môn học phù hợp để tạo wishlist (các môn đã qua sẽ không hiển thị).
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
}
