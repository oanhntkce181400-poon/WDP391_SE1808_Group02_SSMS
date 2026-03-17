// RegistrationPeriodManagement.jsx
// Trang quản lý đợt đăng ký môn học - dành cho Admin / Staff
// Chức năng: View, Create, Update, Toggle Status, Delete
// Tác giả: Group02 - WDP391

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import registrationPeriodService from '../../services/registrationPeriodService';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  upcoming: 'Sắp mở',
  active: 'Đang mở',
  closed: 'Đã đóng',
  cancelled: 'Đã hủy',
};

const STATUS_STYLES = {
  upcoming: 'bg-blue-100 text-blue-800 border border-blue-200',
  active: 'bg-green-100 text-green-800 border border-green-200',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200',
  cancelled: 'bg-red-100 text-red-800 border border-red-200',
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function RegistrationPeriodManagement() {
  // ── STATE ──────────────────────────────────────────────────

  const [periods, setPeriods] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSemester, setFilterSemester] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    periodName: '',
    requestType: 'all',
    semesterId: '',
    // startDate và endDate dùng kiểu Date để kết hợp với DatePicker
    startDate: null,
    endDate: null,
    allowedCohorts: '',
    description: '',
  });

  // ── LOAD DATA ──────────────────────────────────────────────
  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [filterStatus, filterSemester]);

  async function loadSemesters() {
    try {
      const res = await registrationPeriodService.getSemesters();
      setSemesters(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải semesters:', err);
    }
  }

  async function loadPeriods() {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterSemester) params.semesterId = filterSemester;

      const res = await registrationPeriodService.getPeriods(params);
      setPeriods(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải danh sách đợt đăng ký:', err);
      setError(err.response?.data?.message || 'Không tải được danh sách đợt đăng ký');
    } finally {
      setIsLoading(false);
    }
  }

  // ── HANDLERS ───────────────────────────────────────────────

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  }

  function resetForm() {
    setFormData({
      periodName: '',
      requestType: 'all',
      semesterId: '',
      startDate: null,
      endDate: null,
      allowedCohorts: '',
      description: '',
    });
  }

  async function handleCreate() {
    try {
      // Validate đơn giản: phải chọn đủ ngày giờ
      if (!formData.startDate || !formData.endDate) {
        alert('Vui lòng chọn đầy đủ ngày giờ bắt đầu và kết thúc');
        return;
      }

      // Parse allowedCohorts
      const cohortsArray = formData.allowedCohorts
        ? formData.allowedCohorts
            .split(',')
            .map((c) => parseInt(c.trim()))
            .filter((c) => !isNaN(c))
        : [];

      await registrationPeriodService.createPeriod({
        ...formData,
        allowedCohorts: cohortsArray,
      });

      showSuccess('Tạo đợt đăng ký thành công!');
      setShowCreateModal(false);
      resetForm();
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi tạo đợt đăng ký');
    }
  }

  async function handleUpdate() {
    try {
      if (!formData.startDate || !formData.endDate) {
        alert('Vui lòng chọn đầy đủ ngày giờ bắt đầu và kết thúc');
        return;
      }

      const cohortsArray = formData.allowedCohorts
        ? formData.allowedCohorts
            .split(',')
            .map((c) => parseInt(c.trim()))
            .filter((c) => !isNaN(c))
        : [];

      await registrationPeriodService.updatePeriod(selectedPeriod._id, {
        ...formData,
        allowedCohorts: cohortsArray,
      });

      showSuccess('Cập nhật đợt đăng ký thành công!');
      setShowEditModal(false);
      resetForm();
      setSelectedPeriod(null);
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật đợt đăng ký');
    }
  }

  async function handleToggleStatus(id, newStatus) {
    try {
      await registrationPeriodService.toggleStatus(id, newStatus);
      showSuccess('Cập nhật trạng thái thành công!');
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật trạng thái');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Xác nhận xóa đợt đăng ký này?')) return;

    try {
      await registrationPeriodService.deletePeriod(id);
      showSuccess('Xóa đợt đăng ký thành công!');
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi xóa đợt đăng ký');
    }
  }

  function handleEdit(period) {
    setSelectedPeriod(period);
    setFormData({
      periodName: period.periodName,
      requestType: period.requestType || 'all',
      semesterId: period.semester?._id || period.semester?.id || '',
      // Chuyển về Date object để DatePicker sử dụng
      startDate: period.startDate ? new Date(period.startDate) : null,
      endDate: period.endDate ? new Date(period.endDate) : null,
      allowedCohorts: period.allowedCohorts.join(', '),
      description: period.description || '',
    });
    setShowEditModal(true);
  }

  // ── RENDER ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Quản lý Đợt Đăng ký</h1>
            <p className="text-slate-600 mt-1">Cấu hình đợt đăng ký môn học cho sinh viên</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Tạo đợt đăng ký
          </button>
        </div>

        {/* Success message */}
        {successMsg && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
            {successMsg}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Semester filter */}
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả học kỳ</option>
              {semesters.map((s) => (
                <option key={s._id || s.id} value={s._id || s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="upcoming">Sắp mở</option>
              <option value="active">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <button
              onClick={() => {
                setFilterSemester('');
                setFilterStatus('all');
              }}
              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Đang tải...</div>
          ) : periods.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Không có đợt đăng ký nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Tên đợt đăng ký
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Loại đơn
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Học kỳ
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Thời gian
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Đối tượng
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Trạng thái
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period) => (
                    <tr key={period._id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {period.periodName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {period.requestType === 'repeat' && 'Học lại'}
                        {period.requestType === 'overload' && 'Học vượt'}
                        {period.requestType === 'change_class' && 'Chuyển lớp'}
                        {period.requestType === 'drop' && 'Hủy môn'}
                        {(!period.requestType || period.requestType === 'all') && 'Tất cả'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {period.semester?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>
                          {new Date(period.startDate).toLocaleString('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="text-xs text-slate-500">
                          đến{' '}
                          {new Date(period.endDate).toLocaleString('vi-VN', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {period.allowedCohorts.length > 0
                          ? period.allowedCohorts.map((c) => `K${c}`).join(', ')
                          : 'Tất cả khóa'}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={period.status}
                          onChange={(e) => handleToggleStatus(period._id, e.target.value)}
                          className={`px-2 py-1 text-xs font-medium rounded border-0 cursor-pointer ${
                            STATUS_STYLES[period.status]
                          }`}
                        >
                          <option value="upcoming">Sắp mở</option>
                          <option value="active">Đang mở</option>
                          <option value="closed">Đã đóng</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(period)}
                            className="text-green-600 hover:text-green-800"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(period._id)}
                            className="text-red-600 hover:text-red-800"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <PeriodFormModal
          title="Tạo đợt đăng ký mới"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false);
            resetForm();
          }}
          semesters={semesters}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <PeriodFormModal
          title="Cập nhật đợt đăng ký"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdate}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
            setSelectedPeriod(null);
          }}
          semesters={semesters}
          isEdit
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERIOD FORM MODAL (Create / Edit)
// ─────────────────────────────────────────────────────────────
function PeriodFormModal({ title, formData, setFormData, onSubmit, onClose, semesters, isEdit = false }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {/* Period Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tên đợt đăng ký <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.periodName}
                onChange={(e) => setFormData({ ...formData, periodName: e.target.value })}
                placeholder="VD: Đăng ký môn học Kỳ 1 2025-2026"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Request Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Loại đơn áp dụng <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.requestType}
                onChange={(e) => setFormData({ ...formData, requestType: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="all">Tất cả (mặc định)</option>
                <option value="repeat">Học lại</option>
                <option value="overload">Học vượt</option>
                <option value="change_class">Chuyển lớp</option>
                <option value="drop">Hủy môn</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Admin có thể cấu hình nhiều đợt khác nhau cho từng loại đơn.
              </p>
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Học kỳ <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.semesterId}
                onChange={(e) => setFormData({ ...formData, semesterId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Chọn học kỳ</option>
                {semesters.map((s) => (
                  <option key={s._id || s.id} value={s._id || s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày giờ bắt đầu <span className="text-red-500">*</span>
              </label>
              {/* DatePicker giúp chọn ngày + giờ mượt hơn so với input mặc định */}
              <DatePicker
                selected={formData.startDate}
                onChange={(date) => setFormData({ ...formData, startDate: date })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Chọn ngày giờ bắt đầu"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày giờ kết thúc <span className="text-red-500">*</span>
              </label>
              <DatePicker
                selected={formData.endDate}
                onChange={(date) => setFormData({ ...formData, endDate: date })}
                showTimeSelect
                timeFormat="HH:mm"
                timeIntervals={15}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Chọn ngày giờ kết thúc"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Allowed Cohorts */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Đối tượng khóa (để trống = tất cả)
              </label>
              <input
                type="text"
                value={formData.allowedCohorts}
                onChange={(e) => setFormData({ ...formData, allowedCohorts: e.target.value })}
                placeholder="VD: 17, 18, 19, 20"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Nhập các khóa cách nhau bởi dấu phẩy</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Ghi chú hoặc mô tả chi tiết về đợt đăng ký..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={onSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
