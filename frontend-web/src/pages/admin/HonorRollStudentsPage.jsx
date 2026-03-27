import { useState, useEffect } from 'react';
import gradesService from '../../services/gradesService';

export default function HonorRollStudentsPage() {
  const [honorRollData, setHonorRollData] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [sortBy, setSortBy] = useState('gpa');
  const [sortOrder, setSortOrder] = useState('desc');

  // Fetch semesters on mount
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        console.log('📚 Fetching semesters...');
        const response = await gradesService.getHonorRollSemesters();
        console.log('📚 Raw response:', response);
        
        // Axios wraps response as { data: { success: true, data: [...] } }
        let semestersList = [];
        
        // Try different nesting levels
        if (response?.data?.data && Array.isArray(response.data.data)) {
          semestersList = response.data.data;
          console.log('📚 Got from response.data.data');
        } else if (response?.data && Array.isArray(response.data)) {
          semestersList = response.data;
          console.log('📚 Got from response.data');
        } else if (Array.isArray(response)) {
          semestersList = response;
          console.log('📚 Got from response direct');
        }
        
        console.log('📚 Extracted semesters:', semestersList);
        
        if (semestersList && semestersList.length > 0) {
          console.log('✅ Loaded semesters:', semestersList.length);
          setSemesters(semestersList);
          // Auto-select first semester
          const firstSemesterId = semestersList[0]._id;
          console.log('🎓 Auto-selecting first semester:', firstSemesterId);
          setSelectedSemester(firstSemesterId);
          setError(null);
        } else {
          console.warn('⚠️ Empty semesters list received');
          setError('Không tìm thấy kỳ học nào. Vui lòng kiểm tra database.');
        }
      } catch (err) {
        console.error('❌ Error fetching semesters:', err);
        const errMsg = err?.response?.data?.message || err.message || 'Không thể tải kỳ học';
        setError('Lỗi: ' + errMsg);
      }
    };
    fetchSemesters();
  }, []);

  // Fetch honor roll data when semester changes
  useEffect(() => {
    if (selectedSemester) {
      console.log('🎓 Semester selected:', selectedSemester);
      fetchHonorRoll();
    }
  }, [selectedSemester]);

  const fetchHonorRoll = async () => {
    if (!selectedSemester) {
      console.warn('⚠️ No semester selected');
      setError('Vui lòng chọn kỳ học');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('🔄 Fetching honor roll for semester:', selectedSemester);
    
    try {
      const response = await gradesService.getHonorRollStudents({
        semesterId: selectedSemester,
      });

      console.log('📊 Honor roll raw response:', response);

      let honorRollResult = null;
      
      // Axios wraps as { data: { success: true, data: {...} } }
      if (response?.data?.data) {
        honorRollResult = response.data.data;
        console.log('📊 Got from response.data.data');
      } else if (response?.data) {
        honorRollResult = response.data;
        console.log('📊 Got from response.data');
      } else {
        honorRollResult = response;
        console.log('📊 Got from response direct');
      }

      console.log('📊 Parsed honor roll data:', honorRollResult);

      if (honorRollResult) {
        console.log('✅ Honor roll data loaded:', honorRollResult.honorRollStudents?.length || 0, 'students');
        setHonorRollData(honorRollResult);
        setError(null);
      } else {
        const errMsg = 'Không có dữ liệu';
        console.error('❌ Error:', errMsg);
        setError(errMsg);
      }
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || 'Lỗi khi lấy danh sách xuất sắc';
      console.error('❌ Exception:', errMsg, err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!honorRollData || !honorRollData.honorRollStudents) {
      setError('Không có dữ liệu để xuất');
      return;
    }

    try {
      // Load ExcelJS library
      if (!window.ExcelJS) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/exceljs/dist/exceljs.min.js';
        script.onload = () => {
          gradesService.exportHonorRollToExcel(
            honorRollData.honorRollStudents,
            honorRollData.semester?.name || 'DanhSachXuatSac'
          );
        };
        document.head.appendChild(script);
      } else {
        await gradesService.exportHonorRollToExcel(
          honorRollData.honorRollStudents,
          honorRollData.semester?.name || 'DanhSachXuatSac'
        );
      }
    } catch (err) {
      setError('Lỗi khi xuất danh sách: ' + err.message);
      console.error('Export error:', err);
    }
  };

  const getSortedStudents = () => {
    if (!honorRollData?.honorRollStudents) return [];
    
    const students = [...honorRollData.honorRollStudents];
    students.sort((a, b) => {
      let compareA = a[sortBy];
      let compareB = b[sortBy];

      if (typeof compareA === 'string') {
        compareA = compareA.toLowerCase();
        compareB = compareB.toLowerCase();
        return sortOrder === 'asc' 
          ? compareA.localeCompare(compareB)
          : compareB.localeCompare(compareA);
      }

      return sortOrder === 'asc' ? compareA - compareB : compareB - compareA;
    });

    return students;
  };

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const sortedStudents = getSortedStudents();

  return (
    <div className="space-y-6 p-6 bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🏆 Danh sách sinh viên xuất sắc</h1>
          <p className="mt-2 text-gray-600">
            Sinh viên có GPA ≥ 8.0 và không có điểm F (điểm dưới 4.0)
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn kỳ học
            </label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- Chọn kỳ học --</option>
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} ({sem.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div></div>

          <div className="flex gap-2">
            <button
              onClick={fetchHonorRoll}
              disabled={loading || !selectedSemester}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? 'Đang tải...' : 'Áp dụng bộ lọc'}
            </button>
            <button
              onClick={handleExport}
              disabled={!honorRollData?.honorRollStudents?.length}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              📥 Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {honorRollData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">Tổng sinh viên xuất sắc</p>
            <p className="text-2xl font-bold text-blue-600">{honorRollData.totalCount}</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">GPA trung bình</p>
            <p className="text-2xl font-bold text-green-600">
              {honorRollData.statistics?.avgGPA?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">GPA cao nhất</p>
            <p className="text-2xl font-bold text-purple-600">
              {honorRollData.statistics?.maxGPA?.toFixed(2) || '0.00'}
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-sm text-gray-600">Tổng sinh viên tham gia</p>
            <p className="text-2xl font-bold text-orange-600">
              {honorRollData.statistics?.totalStudents || '0'}
            </p>
          </div>
        </div>
      )}

      {/* Students Table */}
      {honorRollData && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('studentCode')}>
                    Mã SV {sortBy === 'studentCode' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('fullName')}>
                    Họ và tên {sortBy === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('major')}>
                    Chuyên ngành {sortBy === 'major' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('gpa')}>
                    GPA {sortBy === 'gpa' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('totalCredits')}>
                    Tổng TC {sortBy === 'totalCredits' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => toggleSort('enrollmentCount')}>
                    Số môn {sortBy === 'enrollmentCount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.length > 0 ? (
                  sortedStudents.map((student, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{student.studentCode}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{student.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{student.major || 'N/A'}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 font-bold rounded-full">
                          {student.gpa.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{student.totalCredits}</td>
                      <td className="px-4 py-3 text-sm text-center text-gray-700">{student.enrollmentCount}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      {loading ? 'Đang tải...' : 'Không có sinh viên xuất sắc trong kỳ học này'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !honorRollData && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      )}
    </div>
  );
}
