import { useState, useEffect } from 'react';
import payosService from '../../services/payosService';

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    semesterCode: '',
    studentId: '',
    startDate: '',
    endDate: '',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
  });

  useEffect(() => {
    loadTransactions();
  }, [filters, pagination.page]);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      };
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });

      const res = await payosService.getAllTransactions(params);
      if (res.data && res.data.data) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    loadTransactions();
  };

  const getMethodLabel = (method) => {
    const labels = {
      cash: 'Tiền mặt',
      bank_transfer: 'Chuyển khoản',
      online: 'Online',
      other: 'Khác',
    };
    return labels[method] || method;
  };

  const getMethodColor = (method) => {
    const colors = {
      cash: 'bg-gray-100 text-gray-700',
      bank_transfer: 'bg-blue-100 text-blue-700',
      online: 'bg-green-100 text-green-700',
      other: 'bg-purple-100 text-purple-700',
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Lịch sử giao dịch</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý lịch sử thanh toán học phí của sinh viên
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Mã sinh viên</label>
              <input
                type="text"
                name="studentId"
                value={filters.studentId}
                onChange={handleFilterChange}
                placeholder="Nhập mã SV..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Học kỳ</label>
              <input
                type="text"
                name="semesterCode"
                value={filters.semesterCode}
                onChange={handleFilterChange}
                placeholder="VD: 2025-2026_1"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Từ ngày</label>
              <input
                type="date"
                name="startDate"
                value={filters.startDate}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Đến ngày</label>
              <input
                type="date"
                name="endDate"
                value={filters.endDate}
                onChange={handleFilterChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleSearch}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Tìm kiếm
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">Tổng số giao dịch</p>
            <p className="text-2xl font-bold text-slate-800">{transactions.length}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-green-600">Tổng tiền đã thu</p>
            <p className="text-2xl font-bold text-green-600">
              {formatMoney(transactions.reduce((sum, t) => sum + (t.amount || 0), 0))}
            </p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-blue-600">Giao dịch Online</p>
            <p className="text-2xl font-bold text-blue-600">
              {transactions.filter(t => t.method === 'online').length}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <p className="text-4xl">📋</p>
              <p className="mt-3">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">STT</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Sinh viên</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Học kỳ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Số tiền</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Phương thức</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ngày thanh toán</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((txn, index) => (
                    <tr key={txn._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {txn.student?.user?.fullname || 'N/A'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {txn.student?.studentId || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {txn.semesterCode || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600">
                          {formatMoney(txn.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getMethodColor(txn.method)}`}>
                          {getMethodLabel(txn.method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(txn.paidAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {txn.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Trang {pagination.page} - Hiển thị {transactions.length} kết quả
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Trước
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={transactions.length < pagination.limit}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
