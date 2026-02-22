// RegistrationPeriodPage.jsx
// Trang quản lý đợt đăng ký môn học - dành cho Academic Admin
// Chức năng: View, Create, Update, Delete, Toggle Status
// Tác giả: Group02 - WDP391

import { useState, useEffect } from 'react';
import registrationPeriodService from '../../services/registrationPeriodService';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  upcoming: 'Chưa bắt đầu',
  active: 'Đang mở',
  closed: 'Đã đóng',
};

const STATUS_STYLES = {
  upcoming: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  active: 'bg-green-100 text-green-800 border border-green-200',
  closed: 'bg-slate-100 text-slate-600 border border-slate-200',
};

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function RegistrationPeriodPage() {
  // ── STATE ──────────────────────────────────────────────────

  const [periods, setPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    periodName: '',

    startDate: '',
    endDate: '',
    allowedCohorts: '',
    description: '',
  });

  // ── LOAD DATA ──────────────────────────────────────────────
  useEffect(() => {
    loadPeriods();
  }, [selectedStatus]);


  async function loadPeriods() {
    setIsLoading(true);
    setError('');
    try {
      const params = {};
      if (selectedStatus) params.status = selectedStatus;

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

      startDate: '',
      endDate: '',
      allowedCohorts: '',
      description: '',
    });
  }

  async function handleCreate() {
    try {
      // Parse allowedCohorts từ string thành array
      const cohortsArray = formData.allowedCohorts
        .split(',')
        .map(c => parseInt(c.trim()))
        .filter(c => !isNaN(c));

      const payload = {
        ...formData,
        allowedCohorts: cohortsArray,
      };

      await registrationPeriodService.createPeriod(payload);
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
      const cohortsArray = formData.allowedCohorts
        .split(',')
        .map(c => parseInt(c.trim()))
        .filter(c => !isNaN(c));

      const payload = {
        ...formData,
        allowedCohorts: cohortsArray,
      };

      await registrationPeriodService.updatePeriod(selectedPeriod._id, payload);
      showSuccess('Cập nhật đợt đăng ký thành công!');
      setShowEditModal(false);
      resetForm();
      setSelectedPeriod(null);
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi cập nhật đợt đăng ký');
    }
  }

  async function handleToggleStatus(period) {
    const newStatus = period.status === 'active' ? 'closed' : 'active';
    const confirmMsg = newStatus === 'active' 
      ? 'Xác nhận MỞ đợt đăng ký này?' 
      : 'Xác nhận ĐÓNG đợt đăng ký này?';

    if (!confirm(confirmMsg)) return;

    try {
      await registrationPeriodService.toggleStatus(period._id, newStatus);
      showSuccess(`${newStatus === 'active' ? 'Mở' : 'Đóng'} đợt đăng ký thành công!`);
      loadPeriods();
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi thay đổi trạng thái');
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
    
    // Format datetime cho input datetime-local (format: YYYY-MM-DDTHH:mm)
    const formatDateTimeLocal = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setFormData({
      periodName: period.periodName,
      startDate: formatDateTimeLocal(period.startDate),
      endDate: formatDateTimeLocal(period.endDate),
      allowedCohorts: period.allowedCohorts?.join(', ') || '',
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
            <h1 className="text-3xl font-bold text-slate-800">Quản lý Đợt đăng ký</h1>
            <p className="text-slate-600 mt-1">
              Cấu hình thời gian đăng ký môn học cho từng học kỳ
            </p>
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
          <div className="flex gap-4 items-center">
            {/* Status filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="upcoming">Chưa bắt đầu</option>
              <option value="active">Đang mở</option>
              <option value="closed">Đã đóng</option>
            </select>

            <button
              onClick={() => {
                setSelectedSemester('');
                setSelectedStatus('');
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
            <div className="p-8 text-center text-slate-500">Chưa có đợt đăng ký nào</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Tên đợt
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
                        {period.semester?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <div>
                          {new Date(period.startDate).toLocaleString('vi-VN')}
                        </div>
                        <div className="text-xs text-slate-500">đến</div>
                        <div>
                          {new Date(period.endDate).toLocaleString('vi-VN')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {period.allowedCohorts?.length > 0
                          ? period.allowedCohorts.map(c => `K${c}`).join(', ')
                          : 'Tất cả'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            STATUS_STYLES[period.status]
                          }`}
                        >
                          {STATUS_LABELS[period.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleStatus(period)}
                            className={`px-3 py-1 text-xs rounded ${
                              period.status === 'active'
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                            title={period.status === 'active' ? 'Đóng' : 'Mở'}
                          >
                            {period.status === 'active' ? '🔒 Đóng' : '🔓 Mở'}
                          </button>
                          <button
                            onClick={() => handleEdit(period)}
                            className="text-blue-600 hover:text-blue-800"
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
          isEdit
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// PERIOD FORM MODAL (Create / Edit)
// ─────────────────────────────────────────────────────────────
function PeriodFormModal({
  title,
  formData,
  setFormData,
  onSubmit,
  onClose,
  isEdit = false,
}) {
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
                placeholder="VD: Đăng ký 3W"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày giờ bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày giờ kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Eligible Cohorts */}
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
              <p className="text-xs text-slate-500 mt-1">
                Nhập các khóa cách nhau bởi dấu phẩy
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mô tả
              </label>
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
