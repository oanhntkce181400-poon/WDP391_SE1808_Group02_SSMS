import { useEffect, useMemo, useState } from 'react';
import academicCalendarService from '../../services/academicCalendarService';

const COLOR_PRESETS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6'];

const HOLIDAY_TYPES = [
  { value: 'holiday', label: 'Nghỉ lễ' },
  { value: 'exam-break', label: 'Nghỉ thi' },
  { value: 'semester-break', label: 'Nghỉ giữa kỳ/kết kỳ' },
  { value: 'other', label: 'Khác' },
];

function toDateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('vi-VN');
}

export default function AcademicCalendarManagementPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    holidayType: 'holiday',
    startDate: '',
    endDate: '',
    color: '#ef4444',
    isActive: true,
  });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const yearOptions = useMemo(
    () => Array.from({ length: 5 }, (_, idx) => currentYear - 1 + idx),
    [currentYear],
  );

  async function loadEvents(year = selectedYear) {
    setLoading(true);
    try {
      const response = await academicCalendarService.getEvents({
        year,
        includeInactive: true,
      });
      setEvents(response?.data?.data || []);
    } catch (error) {
      console.error('Load academic calendar events failed:', error);
      showToast(error?.response?.data?.message || 'Không thể tải dữ liệu lịch nghỉ', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents(selectedYear);
  }, [selectedYear]);

  function resetForm() {
    setEditingId('');
    setForm({
      name: '',
      description: '',
      holidayType: 'holiday',
      startDate: '',
      endDate: '',
      color: '#ef4444',
      isActive: true,
    });
  }

  function startEdit(item) {
    setEditingId(item._id);
    setForm({
      name: item.name || '',
      description: item.description || '',
      holidayType: item.holidayType || 'holiday',
      startDate: toDateInputValue(item.startDate),
      endDate: toDateInputValue(item.endDate),
      color: item.color || '#ef4444',
      isActive: item.isActive !== false,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.name || !form.startDate || !form.endDate) {
      showToast('Vui lòng nhập tên kỳ nghỉ, ngày bắt đầu và ngày kết thúc', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        year: selectedYear,
      };

      if (editingId) {
        await academicCalendarService.updateEvent(editingId, payload);
        showToast('Cập nhật kỳ nghỉ thành công', 'success');
      } else {
        await academicCalendarService.createEvent(payload);
        showToast('Tạo kỳ nghỉ thành công', 'success');
      }

      resetForm();
      await loadEvents(selectedYear);
    } catch (error) {
      console.error('Save academic calendar event failed:', error);
      showToast(error?.response?.data?.message || 'Lưu kỳ nghỉ thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    const ok = window.confirm(`Xóa kỳ nghỉ "${item.name}"?`);
    if (!ok) return;

    setDeletingId(item._id);
    try {
      await academicCalendarService.deleteEvent(item._id);
      showToast('Đã xóa kỳ nghỉ', 'success');
      await loadEvents(selectedYear);
    } catch (error) {
      console.error('Delete academic calendar event failed:', error);
      showToast(error?.response?.data?.message || 'Xóa kỳ nghỉ thất bại', 'error');
    } finally {
      setDeletingId('');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Academic Calendar</h1>
            <p className="mt-1 text-sm text-slate-600">
              Thiết lập các kỳ nghỉ cố định trong năm để sinh viên xem lịch màu theo khoảng ngày.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Năm học</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Tên kỳ nghỉ</label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ví dụ: Nghỉ Tết Nguyên Đán"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Loại</label>
              <select
                value={form.holidayType}
                onChange={(e) => setForm((prev) => ({ ...prev, holidayType: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {HOLIDAY_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Hiển thị cho sinh viên
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
              <input
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Ghi chú thêm (không bắt buộc)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="lg:col-span-4">
              <label className="mb-2 block text-sm font-medium text-slate-700">Màu hiển thị trên lịch</label>
              <div className="flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color }))}
                    className={`h-8 w-8 rounded-full border-2 ${form.color === color ? 'border-slate-900' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
                <input
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                  placeholder="#ef4444"
                  className="ml-2 w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật kỳ nghỉ' : 'Thêm kỳ nghỉ'}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Hủy sửa
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-500">Đang tải lịch nghỉ...</p>
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Chưa có kỳ nghỉ nào cho năm {selectedYear}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Kỳ nghỉ</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Khoảng ngày</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Màu</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Trạng thái</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-600">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="font-medium text-slate-800">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.description || '—'}</p>
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color || '#ef4444' }} />
                          {item.color || '#ef4444'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {item.isActive ? 'Đang hiển thị' : 'Ẩn'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === item._id}
                            onClick={() => handleDelete(item)}
                            className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                          >
                            Xóa
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

      {toast ? (
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
      ) : null}
    </div>
  );
}
