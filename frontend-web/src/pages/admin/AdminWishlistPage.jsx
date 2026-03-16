import { useEffect, useMemo, useState } from 'react';
import semesterService from '../../services/semesterService';
import wishlistService from '../../services/wishlistService';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Từ chối' },
];

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

export default function AdminWishlistPage() {
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState('');
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [wishlistRows, setWishlistRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function loadSemesters() {
    const response = await semesterService.getAll();
    const data = response?.data?.data || [];
    setSemesters(data);

    if (!selectedSemesterId && data.length > 0) {
      const current = data.find((item) => item.isCurrent);
      setSelectedSemesterId(current?._id || data[0]._id);
    }

    return data;
  }

  async function loadWishlistBySemester(semesterId, nextPage = page, nextStatus = statusFilter) {
    if (!semesterId) return;

    setLoading(true);
    try {
      const params = {
        page: nextPage,
        limit: 20,
      };
      if (nextStatus !== 'all') {
        params.status = nextStatus;
      }

      const response = await wishlistService.getWishlistBySemester(semesterId, params);
      setWishlistRows(response?.data?.data || []);
      setPagination(response?.data?.pagination || null);
    } catch (error) {
      console.error('Load admin wishlist failed:', error);
      showToast(error?.response?.data?.message || 'Không thể tải danh sách wishlist', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSemesters().catch((error) => {
      console.error('Load semesters failed:', error);
      showToast('Không thể tải danh sách học kỳ', 'error');
    });
  }, []);

  useEffect(() => {
    if (!selectedSemesterId) return;
    loadWishlistBySemester(selectedSemesterId, page, statusFilter);
  }, [selectedSemesterId, page, statusFilter]);

  const selectedSemester = useMemo(
    () => semesters.find((item) => item._id === selectedSemesterId) || null,
    [semesters, selectedSemesterId],
  );

  async function handleApprove(item) {
    setReviewingId(item._id);
    try {
      await wishlistService.approveWishlist(item._id, {});
      showToast('Đã duyệt wishlist', 'success');
      await loadWishlistBySemester(selectedSemesterId, page, statusFilter);
    } catch (error) {
      console.error('Approve wishlist failed:', error);
      showToast(error?.response?.data?.message || 'Duyệt wishlist thất bại', 'error');
    } finally {
      setReviewingId('');
    }
  }

  async function handleReject(item) {
    const reason = window.prompt('Lý do từ chối wishlist:', 'Không phù hợp với kế hoạch mở lớp');
    if (reason === null) return;

    setReviewingId(item._id);
    try {
      await wishlistService.rejectWishlist(item._id, { reason });
      showToast('Đã từ chối wishlist', 'success');
      await loadWishlistBySemester(selectedSemesterId, page, statusFilter);
    } catch (error) {
      console.error('Reject wishlist failed:', error);
      showToast(error?.response?.data?.message || 'Từ chối wishlist thất bại', 'error');
    } finally {
      setReviewingId('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Duyệt Wishlist</h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý yêu cầu wishlist môn học của sinh viên theo từng học kỳ.
          </p>
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Học kỳ</label>
            <select
              value={selectedSemesterId}
              onChange={(e) => {
                setSelectedSemesterId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn học kỳ --</option>
              {semesters.map((semester) => (
                <option key={semester._id} value={semester._id}>
                  {semester.name || semester.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              {selectedSemester ? `Đang xem: ${selectedSemester.name || selectedSemester.code}` : 'Chưa chọn học kỳ'}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Đang tải wishlist...</p>
          ) : wishlistRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Không có wishlist nào trong bộ lọc hiện tại.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Sinh viên</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Môn học</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Trạng thái</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Lý do</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {wishlistRows.map((item) => {
                    const isPending = item.status === 'pending';
                    const isBusy = reviewingId === item._id;
                    return (
                      <tr key={item._id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{item.student?.fullName || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{item.student?.studentCode || ''}</p>
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-800">{item.subject?.subjectName || 'N/A'}</p>
                          <p className="text-xs text-slate-500">{item.subject?.subjectCode || ''}</p>
                        </td>
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
                        </td>
                        <td className="px-3 py-2 text-right">
                          {isPending ? (
                            <div className="inline-flex gap-2">
                              <button
                                onClick={() => handleApprove(item)}
                                disabled={isBusy}
                                className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleReject(item)}
                                disabled={isBusy}
                                className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Đã xử lý</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Trước
            </button>
            <span className="text-sm text-slate-600">
              Trang {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={page === pagination.totalPages}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Sau
            </button>
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
