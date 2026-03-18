import { useCallback, useEffect, useMemo, useState } from 'react';
import addIcon from '../../assets/circle.png';
import nextIcon from '../../assets/next.png';
import semesterService from '../../services/semesterService';

const INITIAL_FORM = {
  code: '',
  name: '',
  semesterNum: '1',
  academicYear: '',
  startDate: '',
  endDate: '',
  description: '',
  isCurrent: false,
  isActive: true,
};

function Field({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return '-';
  return `${new Date(startDate).toLocaleDateString('vi-VN')} - ${new Date(endDate).toLocaleDateString('vi-VN')}`;
}

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    academicYear: '',
    status: 'all',
  });
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [autoEnrollmentResult, setAutoEnrollmentResult] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const fetchSemesters = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError('');

      try {
        const params = {
          page,
          limit: pagination.limit,
        };

        if (filters.academicYear.trim()) params.academicYear = filters.academicYear.trim();
        if (filters.status === 'active') params.isActive = true;
        if (filters.status === 'inactive') params.isActive = false;
        if (filters.status === 'current') params.isCurrent = true;

        const response = await semesterService.getAll(params);
        setSemesters(response?.data?.data || []);
        setPagination((prev) => ({
          ...prev,
          currentPage: response?.data?.pagination?.page || page,
          totalPages: response?.data?.pagination?.totalPages || 1,
          totalItems: response?.data?.pagination?.total || 0,
        }));
      } catch (err) {
        console.error('Error fetching semesters:', err);
        setError('Không thể tải danh sách học kỳ.');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    fetchSemesters(1);
  }, [fetchSemesters]);

  const currentSemester = useMemo(
    () => semesters.find((semester) => semester.isCurrent),
    [semesters],
  );

  const handleOpenModal = (semester = null) => {
    if (semester) {
      setSelectedSemester(semester);
      setFormData({
        code: semester.code || '',
        name: semester.name || '',
        semesterNum: String(semester.semesterNum || 1),
        academicYear: semester.academicYear || '',
        startDate: semester.startDate ? semester.startDate.split('T')[0] : '',
        endDate: semester.endDate ? semester.endDate.split('T')[0] : '',
        description: semester.description || '',
        isCurrent: Boolean(semester.isCurrent),
        isActive: semester.isActive !== false,
      });
    } else {
      setSelectedSemester(null);
      setFormData(INITIAL_FORM);
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSemester(null);
    setFormData(INITIAL_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setModalLoading(true);

    try {
      const shouldTriggerAutoEnrollment = formData.isCurrent && !selectedSemester?.isCurrent;
      if (
        shouldTriggerAutoEnrollment &&
        !window.confirm('Đặt học kỳ này là học kỳ hiện tại và chạy auto-enrollment ngay bây giờ?')
      ) {
        setModalLoading(false);
        return;
      }

      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        semesterNum: Number.parseInt(formData.semesterNum, 10),
        academicYear: formData.academicYear.trim() || null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        description: formData.description.trim() || null,
        isCurrent: formData.isCurrent,
        isActive: formData.isActive,
      };

      const response = selectedSemester
        ? await semesterService.update(selectedSemester.id, payload)
        : await semesterService.create(payload);

      showToast(selectedSemester ? 'Cập nhật học kỳ thành công.' : 'Tạo học kỳ mới thành công.');

      const autoResult = response?.data?.data?.autoEnrollment || null;
      setAutoEnrollmentResult(autoResult);
      if (autoResult?.summary) {
        showToast(
          `Auto-enrollment: ${autoResult.summary.totalEnrollments} đăng ký, ${autoResult.summary.waitlisted} waitlist.`,
        );
      } else if (autoResult && autoResult.success === false) {
        showToast(autoResult.message || 'Auto-enrollment không thành công.', 'error');
      }

      handleCloseModal();
      fetchSemesters(pagination.currentPage);
    } catch (err) {
      console.error('Error saving semester:', err);
      showToast(err.response?.data?.message || 'Có lỗi xảy ra khi lưu học kỳ.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSemester) return;

    setModalLoading(true);
    try {
      await semesterService.remove(selectedSemester.id);
      showToast('Xóa học kỳ thành công.');
      setIsDeleteModalOpen(false);
      setSelectedSemester(null);
      fetchSemesters(pagination.currentPage);
    } catch (err) {
      console.error('Error deleting semester:', err);
      showToast(err.response?.data?.message || 'Không thể xóa học kỳ.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  const currentStart =
    pagination.totalItems === 0 ? 0 : (pagination.currentPage - 1) * pagination.limit + 1;
  const currentEnd = Math.min(pagination.currentPage * pagination.limit, pagination.totalItems);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast.show ? (
        <div
          className={`fixed right-4 top-4 z-50 rounded-lg px-6 py-3 text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="border-b border-slate-200 bg-white">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Quản lý học kỳ</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <span>Cấu hình</span>
                <img src={nextIcon} alt="/" className="h-3 w-3" />
                <span className="font-medium text-slate-700">Học kỳ</span>
              </div>
            </div>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              <img src={addIcon} alt="+" className="h-4 w-4 invert" />
              <span className="font-medium">Thêm học kỳ mới</span>
            </button>
          </div>
        </div>
      </div>

      {autoEnrollmentResult ? (
        <div className="container mx-auto px-6 pb-2 pt-4">
          <div
            className={`rounded-lg p-4 ${
              autoEnrollmentResult.success === false
                ? 'border border-amber-200 bg-amber-50'
                : 'border border-emerald-200 bg-emerald-50'
            }`}
          >
            <div
              className={`mb-2 text-sm font-semibold ${
                autoEnrollmentResult.success === false ? 'text-amber-800' : 'text-emerald-800'
              }`}
            >
              Kết quả auto-enrollment gần nhất
            </div>
            {autoEnrollmentResult.summary ? (
              <div
                className={`grid grid-cols-2 gap-3 text-sm md:grid-cols-5 ${
                  autoEnrollmentResult.success === false ? 'text-amber-900' : 'text-emerald-900'
                }`}
              >
                <div>Tổng SV: {autoEnrollmentResult.summary.totalStudents}</div>
                <div>Đăng ký: {autoEnrollmentResult.summary.totalEnrollments}</div>
                <div>Waitlist: {autoEnrollmentResult.summary.waitlisted}</div>
                <div>Trùng: {autoEnrollmentResult.summary.duplicates}</div>
                <div>Lỗi: {autoEnrollmentResult.summary.failed}</div>
              </div>
            ) : (
              <div className="text-sm text-amber-900">
                {autoEnrollmentResult.message || 'Auto-enrollment không trả về summary.'}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="container mx-auto px-6 py-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Năm học</label>
              <input
                type="text"
                placeholder="Ví dụ: 2025-2026"
                value={filters.academicYear}
                onChange={(event) => setFilters((prev) => ({ ...prev, academicYear: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Trạng thái</label>
              <select
                value={filters.status}
                onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Ngừng hoạt động</option>
                <option value="current">Học kỳ hiện tại</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => fetchSemesters(1)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white transition-colors hover:bg-slate-800"
              >
                Áp dụng bộ lọc
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-6">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {currentSemester ? (
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm text-slate-700">
              Học kỳ hiện tại: <span className="font-semibold">{currentSemester.name}</span> ({currentSemester.code})
            </div>
          ) : null}

          {loading ? (
            <div className="p-12 text-center text-slate-500">Đang tải dữ liệu...</div>
          ) : error ? (
            <div className="p-12 text-center text-red-500">{error}</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">STT</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Mã học kỳ</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Tên học kỳ</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Số kỳ</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Năm học</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Thời gian</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Hiện tại</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Trạng thái</th>
                     <th className="px-6 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {semesters.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center text-slate-500">
                        Không có dữ liệu học kỳ.
                      </td>
                    </tr>
                  ) : (
                    semesters.map((semester, index) => (
                      <tr key={semester.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4 text-center font-medium text-slate-700">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-slate-700">{semester.code}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{semester.name}</td>
                        <td className="px-6 py-4 text-slate-700">Kỳ {semester.semesterNum}</td>
                        <td className="px-6 py-4 text-slate-700">{semester.academicYear || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatDateRange(semester.startDate, semester.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          {semester.isCurrent ? (
                            <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                              Hiện tại
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              semester.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {semester.isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenModal(semester)}
                              className="text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              Sửa
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => {
                                setSelectedSemester(semester);
                                setIsDeleteModalOpen(true);
                              }}
                              className="text-sm font-medium text-red-600 hover:text-red-800"
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
                <div className="text-sm text-slate-600">
                  Hiển thị {currentStart} đến {currentEnd} trong tổng số {pagination.totalItems} bản ghi
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchSemesters(Math.max(1, pagination.currentPage - 1))}
                    disabled={pagination.currentPage === 1}
                    className="rounded bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    &lt;
                  </button>
                  {Array.from({ length: pagination.totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => fetchSemesters(page)}
                      className={`rounded px-3 py-1 ${
                        page === pagination.currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => fetchSemesters(Math.min(pagination.totalPages, pagination.currentPage + 1))}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="rounded bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-xl font-bold text-slate-800">
                {selectedSemester ? 'Chỉnh sửa học kỳ' : 'Thêm học kỳ mới'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Số kỳ" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.semesterNum}
                    onChange={(event) => setFormData((prev) => ({ ...prev, semesterNum: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </Field>
                <Field label="Năm học">
                  <input
                    type="text"
                    value={formData.academicYear}
                    onChange={(event) => setFormData((prev) => ({ ...prev, academicYear: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="2025-2026"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Mã học kỳ" required>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(event) => setFormData((prev) => ({ ...prev, code: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="HK1"
                  />
                </Field>
                <Field label="Tên học kỳ" required>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                    placeholder="Học kỳ 1"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Ngày bắt đầu">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(event) => setFormData((prev) => ({ ...prev, startDate: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
                <Field label="Ngày kết thúc">
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(event) => setFormData((prev) => ({ ...prev, endDate: event.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  />
                </Field>
              </div>

              <Field label="Mô tả">
                <textarea
                  value={formData.description}
                  onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Mô tả ngắn về học kỳ..."
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isCurrent}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isCurrent: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Đặt là học kỳ hiện tại
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(event) => setFormData((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Đang hoạt động
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Đang lưu...' : selectedSemester ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="p-6">
              <h2 className="mb-4 text-xl font-bold text-slate-800">Xác nhận xóa</h2>
              <p className="mb-6 text-slate-600">
                Bạn có chắc chắn muốn xóa học kỳ <strong>{selectedSemester?.name}</strong>? Hành động này không thể
                hoàn tác.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedSemester(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={modalLoading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
