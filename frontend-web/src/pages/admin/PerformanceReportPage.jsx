import { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import performanceReportService from '../../services/performanceReportService';

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PerformanceReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ majorCode: '', cohort: '' });
  const [overview, setOverview] = useState(null);
  const [gpaDistribution, setGpaDistribution] = useState([]);
  const [gpaBySemester, setGpaBySemester] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchAllData();
  }, [filters]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      const [overviewRes, gpaDistRes, gpaSemesterRes, topRes, atRiskRes] = await Promise.all([
        performanceReportService.getOverview(filters),
        performanceReportService.getGPADistribution(filters),
        performanceReportService.getGPABySemester(filters),
        performanceReportService.getTopStudents({ ...filters, limit: 10 }),
        performanceReportService.getAtRiskStudents({ ...filters, limit: 20 })
      ]);

      setOverview(overviewRes.data);
      setGpaDistribution(gpaDistRes.data);
      setGpaBySemester(gpaSemesterRes.data);
      setTopStudents(topRes.data);
      setAtRiskStudents(atRiskRes.data);
      
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGPAColor = (gpa) => {
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 2.5) return 'text-blue-600';
    if (gpa >= 2.0) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Báo Cáo Hiệu Suất Học Tập</h1>
        <p className="text-gray-500">Phân tích GPA và thành tích sinh viên</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngành</label>
            <input
              type="text"
              placeholder="VD: SE, AI"
              value={filters.majorCode}
              onChange={(e) => setFilters(prev => ({ ...prev, majorCode: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khóa</label>
            <input
              type="text"
              placeholder="VD: 18, 19"
              value={filters.cohort}
              onChange={(e) => setFilters(prev => ({ ...prev, cohort: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {overview && overview.passRate && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
            <p className="text-green-100 text-sm">Tỷ lệ đạt</p>
            <p className="text-3xl font-bold mt-1">{overview.passRate.rate}%</p>
            <p className="text-green-100 text-sm mt-2">{overview.passRate.passed} sinh viên</p>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
            <p className="text-red-100 text-sm">Tỷ lệ không đạt</p>
            <p className="text-3xl font-bold mt-1">{(100 - overview.passRate.rate).toFixed(1)}%</p>
            <p className="text-red-100 text-sm mt-2">{overview.passRate.failed} sinh viên</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <p className="text-blue-100 text-sm">Môn học được phân tích</p>
            <p className="text-3xl font-bold mt-1">{overview.avgBySubject?.length || 0}</p>
            <p className="text-blue-100 text-sm mt-2">môn</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg">
        {['overview', 'gpa', 'top', 'atRisk'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab === 'overview' ? 'Tổng quan' : 
             tab === 'gpa' ? 'Phân bổ GPA' : 
             tab === 'top' ? 'Top sinh viên' : 'Sinh viên nguy cơ'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* GPA Trend by Semester */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">GPA trung bình theo học kỳ</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gpaBySemester}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="semester" label={{ value: 'Học kỳ', position: 'insideBottom', offset: -5 }} />
                    <YAxis domain={[0, 4]} />
                    <Tooltip formatter={(value) => [`GPA: ${value}`, 'Trung bình']} />
                    <Legend />
                    <Line type="monotone" dataKey="avgGPA" name="GPA" stroke="#3b82f6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* GPA Distribution */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Phân bổ GPA</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={gpaDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" name="Số sinh viên" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Performing Subjects */}
              <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
                <h3 className="font-semibold text-gray-800 mb-4">Điểm trung bình theo môn học</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Môn học</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">ĐTB</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Thấp nhất</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Cao nhất</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {overview?.avgBySubject?.slice(0, 10).map((subject, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{subject._id}</p>
                            <p className="text-sm text-gray-500">{subject.name}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${getGPAColor(subject.avgScore)}`}>
                              {subject.avgScore.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center text-red-600">{subject.minScore.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center text-green-600">{subject.maxScore.toFixed(1)}</td>
                          <td className="px-4 py-3 text-center">{subject.totalStudents}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gpa' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Biểu đồ phân bổ GPA</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={gpaDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="count"
                      nameKey="range"
                      label={({ range, percent }) => `${range} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {gpaDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-800 mb-4">Chi tiết phân bổ</h3>
                <div className="space-y-4">
                  {gpaDistribution.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {item.range}
                        </span>
                        <span className="font-semibold">{item.count} sinh viên</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${(item.count / gpaDistribution.reduce((sum, g) => sum + g.count, 0)) * 100}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'top' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">Top 10 Sinh viên xuất sắc</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Xếp hạng</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngành</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Khóa</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">GPA</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Môn đã học</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {topStudents.map((student, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-white' :
                            idx === 1 ? 'bg-gray-300 text-gray-800' :
                            idx === 2 ? 'bg-amber-600 text-white' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {student.rank}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium">{student.fullName}</p>
                          <p className="text-sm text-gray-500">{student.studentCode}</p>
                        </td>
                        <td className="px-4 py-3">{student.majorCode}</td>
                        <td className="px-4 py-3 text-center">K{student.cohort}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold text-lg ${getGPAColor(student.avgGrade)}`}>
                            {student.avgGrade}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{student.completedCourses}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'atRisk' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-red-50">
                <h3 className="font-semibold text-red-800">Sinh viên cần hỗ trợ (GPA {'<'} 2.0)</h3>
                <p className="text-sm text-red-600 mt-1">Danh sách sinh viên có nguy cơ không đạt yêu cầu học tập</p>
              </div>
              {atRiskStudents.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Không có sinh viên nào trong danh sách nguy cơ
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sinh viên</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ngành</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Khóa</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">GPA</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Môn không đạt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {atRiskStudents.map((student, idx) => (
                        <tr key={idx} className="hover:bg-red-50">
                          <td className="px-4 py-3">
                            <p className="font-medium">{student.fullName}</p>
                            <p className="text-sm text-gray-500">{student.studentCode}</p>
                          </td>
                          <td className="px-4 py-3">{student.majorCode}</td>
                          <td className="px-4 py-3 text-center">K{student.cohort}</td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-bold text-lg text-red-600">
                              {student.avgGrade}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                              {student.failedCourses} môn
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PerformanceReportPage;
