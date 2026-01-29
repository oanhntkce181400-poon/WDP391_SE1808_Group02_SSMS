import { useState, useEffect, useCallback } from 'react';
import errorLogService from '../../services/errorLogService';

export default function ErrorLogsPage() {
  const [errorLogs, setErrorLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State for filters
  const [filters, setFilters] = useState({
    statusCode: 'all',
    errorType: 'all',
  });

  // State for pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });

  // State for selected error detail
  const [selectedError, setSelectedError] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const statusCodeOptions = [
    { value: 'all', label: 'Tất cả Status Code' },
    { value: '400', label: '400 - Bad Request' },
    { value: '401', label: '401 - Unauthorized' },
    { value: '403', label: '403 - Forbidden' },
    { value: '404', label: '404 - Not Found' },
    { value: '500', label: '500 - Internal Server Error' },
  ];

  const errorTypeOptions = [
    { value: 'all', label: 'Tất cả mục đích' },
    { value: 'HttpError', label: 'HTTP Error' },
    { value: 'DatabaseError', label: 'Database Error' },
    { value: 'ValidationError', label: 'Validation Error' },
    { value: 'AuthenticationError', label: 'Authentication Error' },
    { value: 'NotFoundError', label: 'Not Found Error' },
  ];

  // Fetch error logs
  const fetchErrorLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          page,
          limit: pagination.limit,
          ...(filters.statusCode !== 'all' && { statusCode: filters.statusCode }),
          ...(filters.errorType !== 'all' && { errorType: filters.errorType }),
        };

        const response = await errorLogService.getErrorLogs(params);

        if (response?.data?.success) {
          setErrorLogs(response.data.data || []);
          setPagination((prev) => ({
            ...prev,
            currentPage: response.data.pagination?.page || 1,
            totalPages: response.data.pagination?.totalPages || 1,
            totalItems: response.data.pagination?.total || 0,
          }));
        }
      } catch (err) {
        console.error('Error fetching error logs:', err);
        setError('Không thể tải danh sách lỗi hệ thống');
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await errorLogService.getErrorStats();
      if (response?.data?.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  // Load error logs and stats on mount and when filters change
  useEffect(() => {
    fetchErrorLogs(1);
    fetchStats();
  }, [filters]);

  // Handle filter change
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Handle view detail
  const handleViewDetail = async (errorLog) => {
    try {
      const response = await errorLogService.getErrorLogById(errorLog._id);
      if (response?.data?.success) {
        setSelectedError(response.data.data);
        setIsDetailModalOpen(true);
      }
    } catch (err) {
      console.error('Error fetching error detail:', err);
    }
  };

  // Handle pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchErrorLogs(page);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Get status badge color
  const getStatusColor = (statusCode) => {
    if (statusCode >= 500) return 'bg-red-100 text-red-800';
    if (statusCode >= 400) return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  // Get error type badge color
  const getErrorTypeColor = (errorType) => {
    const colors = {
      DatabaseError: 'bg-red-100 text-red-800',
      HttpError: 'bg-orange-100 text-orange-800',
      ValidationError: 'bg-yellow-100 text-yellow-800',
      AuthenticationError: 'bg-purple-100 text-purple-800',
      NotFoundError: 'bg-gray-100 text-gray-800',
    };
    return colors[errorType] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
          <span>🏠 Cấu hình</span>
          <span>&gt;</span>
          <span className="text-slate-900 font-medium">Nhật ký lỗi hệ thống</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Nhật ký lỗi hệ thống</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📊</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase">Tổng số lỗi (24H)</p>
                <p className="text-2xl font-bold text-slate-900">{stats.totalToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase">Lỗi 500 (SERVER)</p>
                <p className="text-2xl font-bold text-red-600">{stats.errorsByStatus.server}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 text-xl">⚡</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase">Lỗi 4xx (CLIENT)</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.errorsByStatus.client}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">✅</span>
              </div>
              <div>
                <p className="text-xs text-slate-600 uppercase">UPTIME</p>
                <p className="text-2xl font-bold text-green-600">99.9%</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tất cả Status Code</label>
            <select
              value={filters.statusCode}
              onChange={(e) => handleFilterChange('statusCode', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {statusCodeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tất cả mục đích</label>
            <select
              value={filters.errorType}
              onChange={(e) => handleFilterChange('errorType', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {errorTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">Đang tải...</div>
        ) : error ? (
          <div className="p-12 text-center text-red-500">{error}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      STT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      TIMESTAMP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      PATH / ENDPOINT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      MESSAGE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      TYPE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">
                      ACTION
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {errorLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    errorLogs.map((errorLog, index) => (
                      <tr key={errorLog._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-center text-slate-700 font-medium">
                          {(pagination.currentPage - 1) * pagination.limit + index + 1}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(errorLog.statusCode)}`}
                          >
                            {errorLog.statusCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          {formatTimestamp(errorLog.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{errorLog.method}</div>
                            <div className="text-xs text-slate-500">{errorLog.path}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">
                          {errorLog.message}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getErrorTypeColor(errorLog.errorType)}`}
                          >
                            {errorLog.errorType}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleViewDetail(errorLog)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            👁️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                <p className="text-sm text-slate-700">
                  Hiển thị trang {pagination.currentPage} trong {pagination.totalPages} dòng
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ‹
                  </button>
                  <button className="px-3 py-1 bg-blue-600 text-white rounded">
                    {pagination.currentPage}
                  </button>
                  {pagination.currentPage < pagination.totalPages && (
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {pagination.currentPage + 1}
                    </button>
                  )}
                  {pagination.currentPage + 1 < pagination.totalPages && (
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 2)}
                      className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
                    >
                      {pagination.currentPage + 2}
                    </button>
                  )}
                  <button className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50">...</button>
                  <button
                    onClick={() => handlePageChange(pagination.totalPages)}
                    className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50"
                  >
                    {pagination.totalPages}
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-1 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && selectedError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Chi tiết lỗi</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status Code</label>
                  <span
                    className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedError.statusCode)}`}
                  >
                    {selectedError.statusCode}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Error Type</label>
                  <span
                    className={`inline-flex px-2 py-1 text-sm font-medium rounded ${getErrorTypeColor(selectedError.errorType)}`}
                  >
                    {selectedError.errorType}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Method</label>
                  <p className="text-sm text-slate-900">{selectedError.method}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Timestamp</label>
                  <p className="text-sm text-slate-900">{formatTimestamp(selectedError.createdAt)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Path</label>
                <p className="text-sm text-slate-900 font-mono bg-slate-50 p-2 rounded">
                  {selectedError.path}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <p className="text-sm text-slate-900 bg-red-50 p-3 rounded border border-red-200">
                  {selectedError.message}
                </p>
              </div>
              {selectedError.stack && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stack Trace</label>
                  <pre className="text-xs text-slate-900 bg-slate-50 p-3 rounded border border-slate-200 overflow-x-auto">
                    {selectedError.stack}
                  </pre>
                </div>
              )}
              {selectedError.userEmail && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                  <p className="text-sm text-slate-900">{selectedError.userEmail}</p>
                </div>
              )}
              {selectedError.ip && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IP Address</label>
                  <p className="text-sm text-slate-900">{selectedError.ip}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
