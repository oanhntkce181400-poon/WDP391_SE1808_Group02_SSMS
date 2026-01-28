// Tuition Fee Management Page - Quản lý học phí theo khung chương trình
import { useState, useEffect } from 'react';
import curriculumService from '../../services/curriculumService';
import nextIcon from '../../assets/next.png';

export default function TuitionFeeManagement() {
  const [curriculums, setCurriculums] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]); // Store all curriculums
  const [loading, setLoading] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter
  const [cohort, setCohort] = useState('K20');
  const [majorName, setMajorName] = useState('');
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Price per credit (Giá mỗi tín chỉ)
  const PRICE_PER_CREDIT = 630000; // 630,000 VND per credit

  // Major mapping
  const majorOptions = [
    { value: 'Kỹ thuật phần mềm', label: 'SE - Kỹ thuật phần mềm' },
    { value: 'Công nghệ thông tin', label: 'CE - Công nghệ thông tin' },
    { value: 'Thiết kế đồ họa', label: 'CA - Thiết kế đồ họa' },
    { value: 'Kinh tế', label: 'BA - Kinh tế' },
  ];

  // Fetch all curriculums once
  const fetchAllCurriculums = async () => {
    setLoading(true);
    try {
      const response = await curriculumService.getCurriculums({
        status: 'active',
        limit: 100,
      });
      console.log('All curriculums:', response.data);
      setAllCurriculums(response.data?.data || []);
    } catch (error) {
      console.error('Error fetching curriculums:', error);
      showToast('Không thể tải dữ liệu khung chương trình', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCurriculums();
  }, []);

  // Filter curriculums based on cohort and major
  useEffect(() => {
    if (!allCurriculums.length) return;
    
    let filtered = allCurriculums;
    
    // Filter by cohort (check if code contains the cohort, e.g., "K20")
    if (cohort) {
      filtered = filtered.filter(c => c.code.includes(cohort));
    }
    
    // Filter by major name
    if (majorName) {
      filtered = filtered.filter(c => c.major === majorName);
    }
    
    setCurriculums(filtered);
  }, [cohort, majorName, allCurriculums]);

  // Handle view details
  const handleViewDetails = (curriculum) => {
    setSelectedCurriculum(curriculum);
    setIsModalOpen(true);
  };

  // Calculate total price for curriculum
  const calculateTotalPrice = (curriculum) => {
    return curriculum.totalCredits * PRICE_PER_CREDIT;
  };

  // Calculate price for semester
  const calculateSemesterPrice = (semester) => {
    return semester.credits * PRICE_PER_CREDIT;
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <main className="flex flex-1 justify-center py-8">
        <div className="layout-content-container flex flex-col w-full max-w-[1280px] px-6 gap-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <a className="hover:text-[#1A237E] dark:hover:text-white transition-colors" href="#">
              Dashboard
            </a>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            <span className="text-slate-900 dark:text-white font-medium">Học phí</span>
          </div>

          {/* Header */}
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Học phí
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mt-2">
                Quản lý học phí theo kỳ học, áp dụng giảm giá và tính toán chi phí.
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Khóa:</label>
                <select
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  <option value="K20">K20</option>
                  <option value="K19">K19</option>
                  <option value="K18">K18</option>
                  <option value="K17">K17</option>
                  <option value="K16">K16</option>
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Ngành:</label>
                <select
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  value={majorName}
                  onChange={(e) => setMajorName(e.target.value)}
                >
                  <option value="">Tất cả</option>
                  {majorOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1A237E] border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {curriculums.map((curriculum) => (
                <div
                  key={curriculum._id}
                  className="bg-white dark:bg-slate-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden cursor-pointer"
                  onClick={() => handleViewDetails(curriculum)}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                          {curriculum.code}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          {curriculum.name}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                        {curriculum.status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                      </span>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Khóa</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {curriculum.academicYear}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ngành</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {curriculum.major}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Số môn học</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {curriculum.totalCourses} môn
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Tổng tín chỉ</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {curriculum.totalCredits} TC
                        </p>
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Tổng học phí</span>
                        <span className="text-xl font-bold text-[#1A237E] dark:text-[#5C6BC0]">
                          {calculateTotalPrice(curriculum).toLocaleString('vi-VN')} ₫
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                        {PRICE_PER_CREDIT.toLocaleString('vi-VN')} ₫/tín chỉ
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && curriculums.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-slate-400">
                Không có dữ liệu khung chương trình {cohort && `cho khóa ${cohort}`} {majorName && `ngành ${majorName}`}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedCurriculum && isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#1A237E] to-[#283593] px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedCurriculum.code}
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">
                    {selectedCurriculum.name}
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Khóa - Ngành</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedCurriculum.academicYear} - {selectedCurriculum.major}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tổng tín chỉ</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    {selectedCurriculum.totalCredits} TC
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tổng học phí</p>
                  <p className="text-lg font-bold text-[#1A237E] dark:text-[#5C6BC0] mt-1">
                    {calculateTotalPrice(selectedCurriculum).toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              </div>

              {/* Semesters */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                  Chi tiết theo học kỳ
                </h3>
                
                {selectedCurriculum.semesters && selectedCurriculum.semesters.length > 0 ? (
                  selectedCurriculum.semesters.map((semester) => (
                    <div
                      key={semester.id}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                    >
                      {/* Semester Header */}
                      <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            {semester.name}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {semester.courses?.length || 0} môn học • {semester.credits} tín chỉ
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-[#1A237E] dark:text-[#5C6BC0]">
                            {calculateSemesterPrice(semester).toLocaleString('vi-VN')} ₫
                          </p>
                        </div>
                      </div>

                      {/* Courses List */}
                      {semester.courses && semester.courses.length > 0 && (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                          {semester.courses.map((course, idx) => (
                            <div
                              key={idx}
                              className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {course.code}
                                    </span>
                                    {course.hasPrerequisite && (
                                      <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                                        Học trước
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    {course.name}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {course.credits} TC
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {(course.credits * PRICE_PER_CREDIT).toLocaleString('vi-VN')} ₫
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                    Chưa có dữ liệu học kỳ
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Giá mỗi tín chỉ: <span className="font-semibold">{PRICE_PER_CREDIT.toLocaleString('vi-VN')} ₫</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-[#1A237E] hover:bg-[#283593] text-white rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          } text-white`}
        >
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
