import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import revenueReportService from '../../services/revenueReportService';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#8b5cf6', '#ec4899'];

const RevenueReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [byMajor, setByMajor] = useState([]);
  const [byMethod, setByMethod] = useState([]);
  const [statusDistribution, setStatusDistribution] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [activeChart, setActiveChart] = useState('trend');

  useEffect(() => {
    fetchAllData();
  }, [dateRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [summaryRes, trendRes, byMajorRes, byMethodRes, statusRes, transRes] = await Promise.all([
        revenueReportService.getSummary(dateRange),
        revenueReportService.getTrend(dateRange),
        revenueReportService.getByMajor(dateRange),
        revenueReportService.getByPaymentMethod(dateRange),
        revenueReportService.getStatusDistribution(dateRange),
        revenueReportService.getTransactions({ ...dateRange, page: 1 })
      ]);

      setSummary(summaryRes.data);
      setTrend(trendRes.data);
      setByMajor(byMajorRes.data);
      setByMethod(byMethodRes.data);
      setStatusDistribution(statusRes.data);
      setTransactions(transRes.data.transactions);
      setPagination({ page: transRes.data.page, totalPages: transRes.data.totalPages });
      
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 shadow-lg rounded-lg border">
          <p className="font-semibold">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Báo Cáo Doanh Thu Học Phí</h1>
        <p className="text-gray-500">Phân tích doanh thu và xu hướng thanh toán</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDateRange({
                startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Năm nay
            </button>
            <button
              onClick={() => setDateRange({
                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
                endDate: new Date().toISOString().split('T')[0]
              })}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Tháng này
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <p className="text-green-100 text-sm">Tổng thu</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalCollected)}</p>
            <p className="text-green-100 text-sm mt-2">{summary.totalTransactions} giao dịch</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white">
            <p className="text-amber-100 text-sm">Còn phải thu</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalOutstanding)}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <p className="text-blue-100 text-sm">Tổng phát hành</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(summary.totalBilled)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <p className="text-purple-100 text-sm">Tỷ lệ thu</p>
            <p className="text-2xl font-bold mt-1">{summary.collectionRate}%</p>
          </div>
        </div>
      )}

      {/* Chart Tabs */}
      <div className="flex gap-2 mb-6">
        {['trend', 'major', 'method', 'status'].map(chart => (
          <button
            key={chart}
            onClick={() => setActiveChart(chart)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeChart === chart ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'
            }`}
          >
            {chart === 'trend' ? 'Xu hướng' : 
             chart === 'major' ? 'Theo ngành' : 
             chart === 'method' ? 'Theo phương thức' : 'Trạng thái'}
          </button>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {activeChart === 'trend' && (
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Doanh thu theo thời gian</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'major' && (
          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-4">Doanh thu theo ngành</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMajor} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`} />
                <YAxis type="category" dataKey="major" width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeChart === 'method' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Theo phương thức</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={byMethod}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="revenue"
                    nameKey="method"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {byMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Chi tiết</h3>
              <div className="space-y-3">
                {byMethod.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-medium">{item.method}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                      <p className="text-sm text-gray-500">{item.count} giao dịch</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeChart === 'status' && (
          <>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Phân bổ trạng thái</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="amount"
                    nameKey="status"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-800 mb-4">Tổng quan</h3>
              <div className="space-y-4">
                {statusDistribution.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.status}
                      </span>
                      <span className="font-semibold">{formatCurrency(item.amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full"
                        style={{ width: `${(item.amount / summary?.totalBilled) * 100}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-800">Chi tiết giao dịch</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mã GD</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Số tiền</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phương thức</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngày</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((trans) => (
                <tr key={trans.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{trans.orderCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{trans.student?.fullName}</p>
                    <p className="text-sm text-gray-500">{trans.student?.studentCode}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-green-600">{formatCurrency(trans.amount)}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-gray-100 rounded text-sm">{trans.method}</span></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(trans.paidAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t flex justify-center gap-2">
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))} 
              disabled={pagination.page === 1} 
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Trước
            </button>
            <span className="px-3 py-1">Trang {pagination.page} / {pagination.totalPages}</span>
            <button 
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))} 
              disabled={pagination.page === pagination.totalPages} 
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Sau
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueReportPage;
