import { useState, useEffect } from 'react';
import financeService from '../../services/financeService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminPaymentSummaryPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingReminderId, setSendingReminderId] = useState('');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [filters, setFilters] = useState({
    semesterId: '',
    majorCode: '',
    graduationYear: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const params = {};
      if (filters.semesterId) params.semesterId = filters.semesterId;
      if (filters.majorCode) params.majorCode = filters.majorCode;
      if (filters.graduationYear) params.graduationYear = filters.graduationYear;

      const res = await financeService.getAllStudentsPaymentSummary(params);
      if (res.data && res.data.data) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error loading payment summary:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    loadData();
  };

  const handleReset = () => {
    setFilters({
      semesterId: '',
      majorCode: '',
      graduationYear: '',
    });
    setTimeout(loadData, 100);
  };

  const getStatusBadge = (isPaid, debt) => {
    if (isPaid) {
      return <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">Đã nộp</span>;
    }
    return <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">Còn nợ</span>;
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    window.setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 2600);
  };

  const handleSendReminder = async (student) => {
    if (!student?.studentId) return;
    setSendingReminderId(String(student.studentId));
    try {
      const semesterCode = data?.summary?.semesterCode || '';
      const response = await financeService.remindStudentTuition(student.studentId, semesterCode || null);
      const result = response?.data?.data;

      if (result?.sent) {
        showToast(`Đã gửi nhắc học phí cho ${student.fullName}`);
      } else {
        showToast(response?.data?.message || 'Không gửi được email nhắc học phí', 'error');
      }
    } catch (error) {
      showToast(error?.response?.data?.message || 'Gửi email nhắc học phí thất bại', 'error');
    } finally {
      setSendingReminderId('');
    }
  };

  const handleSendBulkReminders = async () => {
    const students = data?.students || [];
    const unpaidStudents = students.filter((item) => Number(item.remainingDebt || 0) > 0);

    if (unpaidStudents.length === 0) {
      showToast('Không có sinh viên nào đang nợ học phí', 'error');
      return;
    }

    const confirmed = window.confirm(
      `Gửi nhắc học phí cho ${unpaidStudents.length} sinh viên còn nợ?`,
    );
    if (!confirmed) return;

    setIsBulkSending(true);
    try {
      const semesterCode = data?.summary?.semesterCode || '';
      const results = await Promise.allSettled(
        unpaidStudents.map((student) =>
          financeService.remindStudentTuition(student.studentId, semesterCode || null),
        ),
      );

      let successCount = 0;
      let failCount = 0;

      results.forEach((result) => {
        if (result.status !== 'fulfilled') {
          failCount += 1;
          return;
        }

        if (result.value?.data?.data?.sent) {
          successCount += 1;
        } else {
          failCount += 1;
        }
      });

      if (failCount === 0) {
        showToast(`Đã gửi email nhắc học phí cho ${successCount} sinh viên`);
      } else {
        showToast(`Đã gửi ${successCount}, lỗi ${failCount}`, 'error');
      }
    } catch (_error) {
      showToast('Gửi nhắc học phí hàng loạt thất bại', 'error');
    } finally {
      setIsBulkSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Tổng hợp thanh toán học phí</h1>
            <p className="mt-1 text-sm text-slate-500">
              Theo dõi tình trạng thanh toán học phí của sinh viên
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            {showFilters ? 'Ẩn bộ lọc' : 'Hiển thị bộ lọc'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Học kỳ</label>
                <input
                  type="text"
                  name="semesterId"
                  value={filters.semesterId}
                  onChange={handleFilterChange}
                  placeholder="VD: 2025-2026_1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Mã khoa</label>
                <input
                  type="text"
                  name="majorCode"
                  value={filters.majorCode}
                  onChange={handleFilterChange}
                  placeholder="VD: CE, CS, AI"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Năm ra trường</label>
                <input
                  type="number"
                  name="graduationYear"
                  value={filters.graduationYear}
                  onChange={handleFilterChange}
                  placeholder="VD: 2027"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleSearch}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Tìm kiếm
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        {data?.summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Học kỳ</p>
              <p className="text-xl font-bold text-slate-800">{data.summary.semesterName || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tổng sinh viên</p>
              <p className="text-2xl font-bold text-slate-800">{data.summary.totalStudents}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-green-600">Đã nộp</p>
              <p className="text-2xl font-bold text-green-600">{data.summary.totalPaidStudents}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-red-600">Còn nợ</p>
              <p className="text-2xl font-bold text-red-600">{data.summary.totalUnpaidStudents}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-blue-600">Tổng tiền đã thu</p>
              <p className="text-xl font-bold text-blue-600">{formatMoney(data.summary.totalPaid)}</p>
            </div>
          </div>
        )}

        {/* Additional Stats */}
        {data?.summary && (
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Tổng học phí</p>
              <p className="text-2xl font-bold text-slate-800">{formatMoney(data.summary.totalTuition)}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-red-600">Tổng tiền còn nợ</p>
              <p className="text-2xl font-bold text-red-600">{formatMoney(data.summary.totalDebt)}</p>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800">Danh sách sinh viên</h2>
              <button
                type="button"
                onClick={handleSendBulkReminders}
                disabled={isBulkSending || isLoading}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isBulkSending ? 'Đang gửi hàng loạt...' : 'Nhắc tất cả còn nợ'}
              </button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : data?.students?.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-4xl">📋</p>
              <p className="mt-3">Không có dữ liệu sinh viên</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">STT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Mã SV</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Họ tên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Khoa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Khóa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Tín chỉ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Học phí</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Đã nộp</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-slate-500">Còn nợ</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Trạng thái</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.students?.map((student, index) => (
                    <tr key={student.studentId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-800">{student.studentCode}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">{student.fullName}</p>
                          <p className="text-xs text-slate-500">{student.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{student.majorCode}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">K{student.cohort}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 text-center">{student.credits}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-slate-700">{formatMoney(student.totalAmount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-green-600">{formatMoney(student.paidAmount)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${student.remainingDebt > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {formatMoney(student.remainingDebt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(student.isPaid, student.remainingDebt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {student.remainingDebt > 0 ? (
                          <button
                            type="button"
                            disabled={
                              isBulkSending ||
                              sendingReminderId === String(student.studentId)
                            }
                            onClick={() => handleSendReminder(student)}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {sendingReminderId === String(student.studentId) ? 'Đang gửi...' : 'Nhắc học phí'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {toast.show ? (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
