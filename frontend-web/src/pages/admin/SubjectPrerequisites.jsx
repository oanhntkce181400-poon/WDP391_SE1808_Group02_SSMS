// Subject Prerequisites Page - Configure prerequisites for subjects (Tasks #XX)
// Based on the provided HTML design
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import nextIcon from '../../assets/next.png';
import chevronLeftIcon from '../../assets/left-chevron.png';
import chevronRightIcon from '../../assets/chevron.png';
import searchIcon from '../../assets/search.png';
import addIcon from '../../assets/circle.png';
import deleteIcon from '../../assets/delete.png';
import menuIcon from '../../assets/menu.png';
import subjectService from '../../services/subjectService';

export default function SubjectPrerequisites() {
  const { subjectId } = useParams();
  const navigate = useNavigate();

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedPrerequisites, setSelectedPrerequisites] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Reset to page 1 when search keyword changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchKeyword]);

  // Fetch selected subject and available subjects from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch all subjects for available list
        const subjectsResponse = await subjectService.getSubjects({ limit: 100 });
        const { data: subjectsData } = subjectsResponse.data;

        // Fetch selected subject details to get prerequisites
        let foundSubject = null;
        try {
          const subjectDetailResponse = await subjectService.getSubject(subjectId);
          // API returns { success: true, data: subject }, so we need to access .data.data
          foundSubject = subjectDetailResponse.data?.data || subjectDetailResponse.data;
        } catch (error) {
          console.error('Error fetching subject detail:', error);
          // Fallback to finding from list
          foundSubject = subjectsData.find(
            (item) => item._id === subjectId || item.id === subjectId
          );
        }

        if (foundSubject) {
          // Ensure prerequisites is an array, even if it's populated as objects
          const prerequisitesData = foundSubject.prerequisites || [];
          const prerequisitesArray = Array.isArray(prerequisitesData)
            ? prerequisitesData
            : [];

          setSelectedSubject({
            _id: foundSubject._id || foundSubject.id,
            id: foundSubject._id || foundSubject.id,
            code: foundSubject.subjectCode || foundSubject.code,
            name: foundSubject.subjectName || foundSubject.name,
            credits: foundSubject.credits,
            department: foundSubject.majorCodes || foundSubject.majorCode || [],
            prerequisites: prerequisitesArray, // Store existing prerequisites
          });

          // Set selected prerequisites from database - ensure we get code and name
          if (prerequisitesArray.length > 0) {
            setSelectedPrerequisites(
              prerequisitesArray.map((prereq) => ({
                code: prereq.code || prereq.subjectCode || '',
                name: prereq.name || prereq.subjectName || '',
              }))
            );
          } else {
            setSelectedPrerequisites([]);
          }
        }

        // Get selected subject's code for circular dependency check
        const selectedSubjectCode = foundSubject?.subjectCode || foundSubject?.code;
        // Get existing prerequisites codes of the selected subject
        const existingPrerequisitesCodes = (foundSubject?.prerequisites || [])
          .map((prereq) => prereq.code || prereq.subjectCode)
          .filter(Boolean);

        // Transform and filter available subjects (exclude current subject)
        // Filter by departments that match the selected subject's departments
        const selectedDepartments = (foundSubject?.majorCodes || foundSubject?.majorCode || []);
        const selectedDeptArray = Array.isArray(selectedDepartments)
          ? selectedDepartments
          : [selectedDepartments].filter(Boolean);

        const transformedSubjects = subjectsData
          .filter((item) => {
            const itemId = item._id || item.id;
            const itemCode = item.subjectCode || item.code;

            // Exclude current subject
            if (itemId === subjectId) return false;

            // Filter by matching departments if selected subject has departments
            if (selectedDeptArray.length > 0) {
              const itemDept = item.majorCodes || item.majorCode || [];
              const itemDeptArray = Array.isArray(itemDept) ? itemDept : [itemDept].filter(Boolean);

              // Check if at least one department matches
              const hasMatchingDept = itemDeptArray.some((dept) => selectedDeptArray.includes(dept));
              if (!hasMatchingDept) return false;
            }

            // Check if this subject is already a prerequisite of the selected subject
            // If so, hide it from the available list (already selected from before)
            if (existingPrerequisitesCodes.includes(itemCode)) {
              return false;
            }

            // Check for circular dependency: if current subject is already a prerequisite of this item,
            // then this item cannot be selected as a prerequisite (would create a loop)
            if (item.prerequisites && Array.isArray(item.prerequisites)) {
              const hasCircularDependency = item.prerequisites.some(
                (prereq) => prereq.code === selectedSubjectCode
              );
              if (hasCircularDependency) return false;
            }

            return true;
          })
          .map((item) => ({
            id: item._id || item.id,
            _id: item._id || item.id,
            code: item.subjectCode || item.code,
            name: item.subjectName || item.name,
            department: item.majorCodes || item.majorCode || [],
          }));

        setAvailableSubjects(transformedSubjects);
      } catch (error) {
        console.error('Error fetching data:', error);
        setAvailableSubjects([]);
      } finally {
        setLoading(false);
      }
    };

    if (subjectId) {
      fetchData();
    }
  }, [subjectId]);

  const handleAddPrerequisite = (subject) => {
    if (selectedPrerequisites.find((p) => p.code === subject.code)) {
      setToast({
        show: true,
        message: `"${subject.code} - ${subject.name}" đã là môn tiên quyết!`,
        type: 'warning',
      });
      return;
    }
    setSelectedPrerequisites([...selectedPrerequisites, subject]);
  };

  const handleRemovePrerequisite = (code) => {
    setSelectedPrerequisites(selectedPrerequisites.filter((p) => p.code !== code));
  };

  const handleSave = async () => {
    if (!selectedSubject) return;

    setSaving(true);
    try {
      // Transform prerequisites to match backend format
      const prerequisitesData = selectedPrerequisites.map((prereq) => ({
        code: prereq.code,
        name: prereq.name,
      }));

      await subjectService.updatePrerequisites(selectedSubject.id, prerequisitesData);

      setToast({
        show: true,
        message: 'Lưu cấu hình điều kiện tiên quyết thành công!',
        type: 'success',
      });

      // Navigate back to subjects page after 2 seconds
      setTimeout(() => {
        navigate('/admin/subjects');
      }, 2000);
    } catch (error) {
      console.error('Error saving prerequisites:', error);
      setToast({
        show: true,
        message: 'Lưu cấu hình thất bại! Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/subjects');
  };

  // Filter and paginate available subjects
  const filteredAvailableSubjects = availableSubjects.filter(
    (s) =>
      !selectedPrerequisites.find((p) => p.code === s.code) &&
      (s.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        s.name.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredAvailableSubjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSubjects = filteredAvailableSubjects.slice(startIndex, endIndex);

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  // Show loading while fetching
  if (loading && !selectedSubject) {
    return (
      <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1A237E] border-t-transparent"></div>
            <span className="text-slate-500 dark:text-slate-400 text-sm">Đang tải dữ liệu...</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6 flex-1">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="text-slate-500 text-sm font-medium hover:text-primary flex items-center"
              to="/dashboard"
            >
              <img src={searchIcon} alt="Home" className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            <Link
              className="text-slate-500 text-sm font-medium hover:text-primary"
              to="/admin/subjects"
            >
              Môn học
            </Link>
            <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
            {selectedSubject ? (
              <>
                <Link
                  className="text-slate-500 text-sm font-medium hover:text-primary"
                  to={`/subjects?id=${selectedSubject.id}`}
                >
                  {selectedSubject.code} - {selectedSubject.name}
                </Link>
                <img src={nextIcon} alt="Chevron" className="w-4 h-4" />
                <span className="text-amber-600 dark:text-amber-400 text-sm font-bold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                  Điều kiện tiên quyết
                </span>
              </>
            ) : (
              <span className="text-slate-400 text-sm">Đang tải...</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              onClick={handleCancel}
            >
              Hủy bỏ
            </button>
            <button
              className="px-5 py-2 text-sm font-bold text-white bg-[#1A237E] rounded-lg shadow-md hover:opacity-90 flex items-center gap-2 transition-all disabled:opacity-50"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <img src={addIcon} alt="Save" className="w-4 h-4" />
              )}
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>
        </div>

        {/* Subject Info Header */}
        <div className="mb-8 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <img src={searchIcon} alt="Icon" className="w-36 h-36" />
          </div>
          <div className="flex items-start gap-4">
            <div className="size-14 bg-[#1A237E]/10 rounded-2xl flex items-center justify-center">
              <img src={menuIcon} alt="Prerequisite" className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {selectedSubject ? `${selectedSubject.code} - ${selectedSubject.name}` : 'Đang tải...'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                <span className="font-medium">
                  Khoa:{' '}
                  {selectedSubject
                    ? (Array.isArray(selectedSubject.department)
                        ? selectedSubject.department.join(', ')
                        : selectedSubject.department)
                    : ''}
                </span>
              </p>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-2xl text-sm">
                Thiết lập các môn học tiên quyết bắt buộc. Sinh viên phải hoàn thành các môn học
                này trước khi được phép đăng ký vào lớp học hiện tại.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">
          {/* Available Subjects List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[650px] shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  
                  Kho môn học khả dụng
                </h3>
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded uppercase">
                  {filteredAvailableSubjects.length} Môn
                </span>
              </div>
              <div className="relative">
                <div className="flex w-full items-stretch rounded-lg h-11 border border-slate-200 dark:border-slate-700 focus-within:border-[#1A237E] focus-within:ring-2 focus-within:ring-[#1A237E]/10 transition-all bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="text-slate-400 flex items-center justify-center pl-3">
                    <img src={searchIcon} alt="Search" className="w-5 h-5" />
                  </div>
                  <input
                    className="form-input flex w-full flex-1 border-none bg-transparent focus:ring-0 text-slate-900 dark:text-white placeholder:text-slate-400 px-3 text-sm"
                    placeholder="Tìm kiếm mã hoặc tên môn..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              {filteredAvailableSubjects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <img src={searchIcon} alt="No data" className="w-12 h-12 opacity-30 mb-3" />
                  <p className="text-sm font-medium">
                    {searchKeyword
                      ? 'Không tìm thấy môn học phù hợp'
                      : 'Không có môn học trong khoa được chọn'}
                  </p>
                  <p className="text-xs mt-1 opacity-70 text-center max-w-[200px]">
                    {selectedSubject?.department
                      ? `Chỉ hiển thị môn học từ khoa: ${
                          Array.isArray(selectedSubject.department)
                            ? selectedSubject.department.join(', ')
                            : selectedSubject.department
                        }`
                      : ''}
                  </p>
                  <p className="text-[10px] mt-2 text-amber-500 dark:text-amber-400 text-center max-w-[200px]">
                    * Môn học đã có [{selectedSubject?.code || ''}] trong điều kiện tiên quyết sẽ không hiển thị để tránh vòng lặp phụ thuộc
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {paginatedSubjects.map((subject) => {
                    const isAlreadySelected = selectedPrerequisites.some((p) => p.code === subject.code);
                    return (
                      <div
                        key={subject.id}
                        className={`p-3 rounded-lg transition-all border ${
                          isAlreadySelected
                            ? 'bg-slate-50/50 dark:bg-slate-800/30 opacity-50 cursor-not-allowed'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group border-transparent hover:border-slate-200 dark:hover:border-slate-700'
                        }`}
                        onClick={() => handleAddPrerequisite(subject)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex gap-3">
                            <div className="size-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs">
                              {subject.code.substring(0, 2)}
                            </div>
                            <div>
                              <p className="text-[#1A237E] text-[10px] font-bold uppercase tracking-widest">
                                {subject.code}
                              </p>
                              <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">
                                {subject.name}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                {Array.isArray(subject.department)
                                  ? subject.department.join(', ')
                                  : subject.department}
                              </p>
                            </div>
                          </div>
                          <img
                            src={addIcon}
                            alt={isAlreadySelected ? 'Đã chọn' : 'Thêm'}
                            className={`w-5 h-5 ${
                              isAlreadySelected
                                ? 'text-green-500'
                                : 'text-slate-300 group-hover:text-[#1A237E] transition-colors'
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/30 border-t border-slate-100 dark:border-slate-800 rounded-b-xl flex justify-between items-center">
              <span className="text-slate-400 text-xs font-medium">
                Trang {currentPage} / {totalPages || 1}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center size-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#1A237E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src={chevronLeftIcon} alt="Previous" className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`flex items-center justify-center size-8 rounded border text-xs font-bold transition-colors ${
                      currentPage === page
                        ? 'border-[#1A237E] bg-[#1A237E] text-white'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 hover:text-[#1A237E] hover:border-[#1A237E]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages}
                  className="flex items-center justify-center size-8 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:text-[#1A237E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <img src={chevronRightIcon} alt="Next" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Prerequisites */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col h-[650px] shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                <img src={addIcon} alt="Verified" className="w-5 h-5" />
                Danh sách tiên quyết đã chọn
              </h3>
              <p className="text-slate-400 text-[11px] font-medium">
                Môn học cần hoàn thành trước khi học [{selectedSubject?.code || '...'}]:
              </p>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar p-3">
              <div className="space-y-3">
                {selectedPrerequisites.map((prereq) => (
                  <div
                    key={prereq.code}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-between group hover:border-slate-200 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                      <div>
                        <p className="text-[#1A237E] text-[10px] font-bold uppercase tracking-widest">
                          {prereq.code}
                        </p>
                        <p className="text-slate-900 dark:text-slate-200 text-sm font-bold leading-none mt-1">
                          {prereq.name}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                          <img src={searchIcon} alt="Link" className="w-3 h-3" />
                          Direct Requirement
                        </p>
                      </div>
                    </div>
                    <button
                      className="p-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      onClick={() => handleRemovePrerequisite(prereq.code)}
                    >
                      <img src={deleteIcon} alt="Delete" className="w-5 h-5" />
                    </button>
                  </div>
                ))}

                {/* Dependency Warning */}
              
              </div>
            </div>
            {/* <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Trạng thái xác thực
                </span>
                <span className="text-green-600 dark:text-green-400 text-[10px] font-bold flex items-center gap-1">
                  <img src={addIcon} alt="Verified" className="w-4 h-4" />
                  Hợp lệ (Không có vòng lặp)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full w-full shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
              </div>
            </div> */}
          </div>
        </div>

        {/* Toast Notification */}
        {toast.show && (
          <div
            className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
              toast.type === 'success'
                ? 'bg-green-600 text-white'
                : toast.type === 'error'
                ? 'bg-red-600 text-white'
                : toast.type === 'warning'
                ? 'bg-amber-500 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <span className="material-symbols-outlined">check_circle</span>
            ) : toast.type === 'error' ? (
              <span className="material-symbols-outlined">error</span>
            ) : toast.type === 'warning' ? (
              <img src={searchIcon} alt="Cảnh báo" className="w-5 h-5" />
            ) : (
              <span className="material-symbols-outlined">info</span>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              className="ml-2 text-white/80 hover:text-white"
              onClick={() => setToast({ show: false, message: '', type: 'success' })}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col items-center gap-6">
          <div className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-6 py-4 rounded-xl flex items-start gap-4 max-w-2xl">
            <img src={searchIcon} alt="Shield" className="w-6 h-6" />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Lưu ý về tính toàn vẹn dữ liệu
              </p>
              <p className="text-xs mt-1 leading-relaxed opacity-80 font-medium">
                Thay đổi điều kiện tiên quyết có thể ảnh hưởng đến lộ trình học tập của các sinh viên đã
                nhập học. Vui lòng kiểm tra kỹ sơ đồ chương trình đào tạo trước khi xác nhận.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8 text-slate-400 text-xs font-medium">
            <p>© 2026 Academic Management System</p>
            {/* <div className="flex gap-4">
              <a className="hover:text-[#1A237E] transition-colors" href="#">
                Hướng dẫn sử dụng
              </a>
              <span className="opacity-30">|</span>
              <a className="hover:text-[#1A237E] transition-colors" href="#">
                Nhật ký hệ thống
              </a>
            </div> */}
          </div>
        </footer>
      </main>
    </div>
  );
}

