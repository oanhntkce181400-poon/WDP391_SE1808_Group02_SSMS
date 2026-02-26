import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import classService from '../../services/classService';
import registrationService from '../../services/registrationService';
import { 
  Search, 
  GraduationCap,
  Users,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Lock,
  DollarSign
} from 'lucide-react';

export default function ClassRegistrationPage() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({
    subject_id: '',
    semester: '',
  });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [toast, setToast] = useState(null);
  const navigate = useNavigate();

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Fetch classes
  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params = {
        keyword: searchKeyword,
        ...filters,
        page,
        limit: 12, // 12 cards per page
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const response = await classService.searchClasses(params);
      if (response.data.success) {
        setClasses(response.data.classes || response.data.data || []);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showToast('Không thể tải danh sách lớp', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, [page, filters]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchKeyword !== undefined) {
        setPage(1);
        fetchClasses();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // Validate registration for a class
  const validateRegistration = async (classId) => {
    try {
      const response = await registrationService.validateAll(classId);
      if (response.data.success) {
        setValidationResults((prev) => ({
          ...prev,
          [classId]: response.data.data,
        }));

        // Show validation result
        const { isEligible, validationErrors } = response.data.data;
        if (isEligible) {
          showToast('Bạn đủ điều kiện đăng ký lớp này!', 'success');
        } else {
          showToast(validationErrors.join(', '), 'error');
        }
      }
    } catch (error) {
      console.error('Error validating registration:', error);
      showToast('Không thể kiểm tra điều kiện đăng ký', 'error');
    }
  };

  // Get status color based on occupancy
  const getStatusColor = (occupancyPercentage) => {
    if (occupancyPercentage >= 100) return 'bg-red-100 text-red-800';
    if (occupancyPercentage >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // Get status label
  const getStatusLabel = (occupancyPercentage, isFull) => {
    if (isFull) return 'Đã đầy';
    if (occupancyPercentage >= 80) return 'Sắp đầy';
    return 'Còn chỗ';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Đăng ký tín chỉ
          </h1>
          <p className="text-gray-600">
            Tìm kiếm và đăng ký lớp học phần
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tìm kiếm lớp học
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nhập mã lớp, tên lớp..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Semester Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Học kỳ
              </label>
              <select
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Tất cả học kỳ</option>
                <option value="1">Học kỳ 1</option>
                <option value="2">Học kỳ 2</option>
                <option value="3">Học kỳ 3 (Hè)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Classes List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải danh sách lớp...</p>
          </div>
        ) : (
          <>
            {/* Results Count */}
            {pagination && (
              <div className="mb-4 text-sm text-gray-600">
                Tìm thấy {pagination.total} lớp học
              </div>
            )}

            {/* Class Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const validation = validationResults[cls._id];
                return (
                  <div
                    key={cls._id}
                    className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 border border-gray-200"
                  >
                    <div className="p-5">
                      {/* Header */}
                      <div className="mb-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900">
                            {cls.classCode}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              cls.occupancyPercentage
                            )}`}
                          >
                            {getStatusLabel(cls.occupancyPercentage, cls.isFull)}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm font-medium">{cls.className}</p>
                      </div>

                      {/* Class Info Grid */}
                      <div className="space-y-2 mb-4">
                        {/* Subject */}
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-gray-500">Môn học</div>
                            <div className="text-sm font-medium truncate">
                              {cls.subject?.subjectCode}
                            </div>
                          </div>
                        </div>

                        {/* Teacher */}
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-gray-500">Giảng viên</div>
                            <div className="text-sm font-medium truncate">
                              {cls.teacher?.firstName} {cls.teacher?.lastName}
                            </div>
                          </div>
                        </div>

                        {/* Time */}
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-gray-500">Thời gian</div>
                            <div className="text-sm font-medium truncate">
                              {cls.timeslot?.startTime} - {cls.timeslot?.endTime}
                            </div>
                          </div>
                        </div>

                        {/* Room */}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs text-gray-500">Phòng học</div>
                            <div className="text-sm font-medium truncate">
                              {cls.room?.roomNumber || 'TBA'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Sĩ số</span>
                          <span className="font-medium">
                            {cls.currentEnrollment}/{cls.maxCapacity}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              cls.occupancyPercentage >= 100
                                ? 'bg-red-600'
                                : cls.occupancyPercentage >= 80
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(cls.occupancyPercentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>

                      {/* Validation Status */}
                      {validation && (
                        <div className="mb-3">
                          {validation.isEligible ? (
                            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-green-900">
                                  ✓ Đủ điều kiện đăng ký
                                </div>
                                <div className="text-xs text-green-700 mt-1">
                                  Bạn có thể đăng ký lớp học này
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <div className="text-sm font-semibold text-red-900 mb-1">
                                  ✗ Không đủ điều kiện
                                </div>
                                <ul className="text-xs text-red-700 space-y-0.5">
                                  {validation.validationErrors?.map((error, idx) => (
                                    <li key={idx} className="flex items-start gap-1">
                                      <span className="text-red-500 flex-shrink-0">•</span>
                                      <span>{error}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Prerequisites Warning */}
                      {cls.subject?.prerequisites && cls.subject.prerequisites.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg">
                            <Lock className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-yellow-800">
                                Môn tiên quyết
                              </div>
                              <div className="text-xs text-yellow-700 mt-0.5 line-clamp-1">
                                {cls.subject.prerequisites.map((p) => p.name).join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Credits & Fee */}
                      {cls.subject && (
                        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                          <DollarSign className="h-4 w-4 flex-shrink-0" />
                          <span className="text-xs">
                            {cls.subject.credits} tín chỉ -{' '}
                            {((cls.subject.tuitionFee || 630000) * cls.subject.credits).toLocaleString('vi-VN')} VNĐ
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => validateRegistration(cls._id)}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={cls.isFull}
                        >
                          Kiểm tra
                        </button>
                        <button
                          onClick={() => navigate(`/student/classes/${cls._id}`)}
                          className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Trước
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Trang {page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sau
                </button>
              </div>
            )}

            {/* Empty State */}
            {classes.length === 0 && !loading && (
              <div className="text-center py-12">
                <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Không tìm thấy lớp học nào</p>
                <p className="text-gray-500 text-sm mt-2">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`flex items-start gap-3 p-4 rounded-lg shadow-xl max-w-md transition-all transform ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-blue-50 border border-blue-200'
            }`}
          >
            {toast.type === 'success' && (
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <AlertTriangle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  toast.type === 'success'
                    ? 'text-green-900'
                    : toast.type === 'error'
                    ? 'text-red-900'
                    : 'text-blue-900'
                }`}
              >
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
