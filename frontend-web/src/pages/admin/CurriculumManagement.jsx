// Curriculum Management Page - Drag and drop curriculum builder (Tasks #XX)
// Based on provided HTML design
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import searchIcon from '../../assets/search.png';
import filterIcon from '../../assets/filter.png';
import nextIcon from '../../assets/next.png';
import addIcon from '../../assets/circle.png';
import deleteIcon from '../../assets/delete.png';
import copyIcon from '../../assets/file.png';
import subjectService from '../../services/subjectService';
import curriculumService from '../../services/curriculumService';

export default function CurriculumManagement() {
  const navigate = useNavigate();
  const { curriculumId } = useParams();

  const normalizeCode = (code) => String(code || '').trim();

  // State for current curriculum
  const [currentCurriculum, setCurrentCurriculum] = useState(null);

  // State for saving
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // State for subjects data
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for curriculum semesters (empty initially - will be fetched from DB)
  const [semesters, setSemesters] = useState([
    {
      id: 1,
      name: 'Học kỳ 1',
      credits: 0,
      courses: [],
    },
    {
      id: 2,
      name: 'Học kỳ 2',
      credits: 0,
      courses: [],
    },
  ]);

  const [draggedSubject, setDraggedSubject] = useState(null);
  const [draggedCourse, setDraggedCourse] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [viewMode, setViewMode] = useState('board');
  const [dragOverSemester, setDragOverSemester] = useState(null); // Track which semester is being dragged over

  // Pagination state for "Môn cơ sở"
  const [currentPageBase, setCurrentPageBase] = useState(1);
  const itemsPerPage = 7;

  // Pagination state for "Môn chung cho toàn khoa"
  const [currentPageCommon, setCurrentPageCommon] = useState(1);

  // Reset to page 1 when search keyword changes
  useEffect(() => {
    setCurrentPageBase(1);
    setCurrentPageCommon(1);
  }, [searchKeyword]);

  // Fetch subjects from database
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const response = await subjectService.getSubjects({ limit: 100 });
        const { data: subjectsData } = response.data;

        // Transform data from database to component format
        const transformedSubjects = (subjectsData || []).map((item) => ({
          code: item.subjectCode || item.code,
          name: item.subjectName || item.name,
          credits: item.credits,
          prerequisites: Array.isArray(item.prerequisites)
            ? item.prerequisites
                .map((p) => normalizeCode(p.code || p.subjectCode))
                .filter(Boolean)
            : [],
          category: 'Cơ sở', // Default category - can be enhanced with actual category data
          color: 'primary',
          isCommon: item.isCommon || false,
          _id: item._id,
          id: item._id,
          department: item.majorCodes || item.majorCode || [],
        }));

        setAvailableSubjects(transformedSubjects);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        showToast('Lỗi khi tải danh sách môn học!', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch curriculum data when component mounts or curriculumId changes
  useEffect(() => {
    const fetchCurriculum = async () => {
      if (curriculumId) {
        try {
          const response = await curriculumService.getCurriculum(curriculumId);
          const curriculumData = response.data?.data;
          setCurrentCurriculum(curriculumData);
          
          // Set semesters from database if available
          if (curriculumData.semesters && curriculumData.semesters.length > 0) {
            setSemesters(curriculumData.semesters);
          }
        } catch (error) {
          console.error('Error fetching curriculum:', error);
          showToast('Lỗi khi tải dữ liệu khung chương trình!', 'error');
        }
      }
    };

    fetchCurriculum();
  }, [curriculumId]);

  // Calculate stats
  const totalCredits = semesters.reduce((sum, sem) => sum + sem.credits, 0);
  const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);

  const scheduledCourseCodes = new Set(
    semesters.flatMap((sem) => (sem.courses || []).map((c) => normalizeCode(c.code)))
  );

  const prereqMap = new Map(
    availableSubjects.map((s) => [normalizeCode(s.code), (s.prerequisites || []).map(normalizeCode)])
  );

  const dependentMap = (() => {
    const m = new Map();
    for (const [course, prereqs] of prereqMap.entries()) {
      for (const p of prereqs || []) {
        if (!m.has(p)) m.set(p, []);
        m.get(p).push(course);
      }
    }
    return m;
  })();

  const getSemesterIndexByCourseCode = (courseCode) => {
    const code = normalizeCode(courseCode);
    if (!code) return -1;
    return semesters.findIndex((sem) => (sem.courses || []).some((c) => normalizeCode(c.code) === code));
  };

  const validatePlacement = (courseCode, targetSemesterIndex) => {
    const code = normalizeCode(courseCode);
    if (!code) return { ok: false, message: 'Mã môn học không hợp lệ.' };

    // Rule A: prerequisites must be in earlier semesters
    const prereqs = prereqMap.get(code) || [];
    for (const prereqCode of prereqs) {
      const prereqIndex = getSemesterIndexByCourseCode(prereqCode);
      if (prereqIndex === -1) {
        return {
          ok: false,
          message: `Không thể xếp ${code} vì chưa xếp môn tiên quyết ${prereqCode} ở học kỳ trước.`,
        };
      }
      if (prereqIndex >= targetSemesterIndex) {
        return {
          ok: false,
          message: `Không thể xếp ${code} trước/đồng học kỳ với môn tiên quyết ${prereqCode}.`,
        };
      }
    }

    // Rule B: do not move prerequisite after its dependents
    const dependents = dependentMap.get(code) || [];
    for (const dependentCode of dependents) {
      const depIndex = getSemesterIndexByCourseCode(dependentCode);
      if (depIndex !== -1 && depIndex <= targetSemesterIndex) {
        return {
          ok: false,
          message: `Không thể xếp ${code} sau/đồng học kỳ với môn phụ thuộc ${dependentCode}.`,
        };
      }
    }

    return { ok: true };
  };

  // Filter available subjects
  const filteredSubjects = availableSubjects.filter(
    (subject) =>
      !scheduledCourseCodes.has(normalizeCode(subject.code)) &&
      (subject.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        subject.name.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  // Calculate pagination for "Môn cơ sở"
  const baseSubjects = filteredSubjects.filter((s) => s.category === 'Cơ sở' && !s.isCommon);
  const totalPagesBase = Math.ceil(baseSubjects.length / itemsPerPage);
  const startIndexBase = (currentPageBase - 1) * itemsPerPage;
  const endIndexBase = startIndexBase + itemsPerPage;
  const paginatedBaseSubjects = baseSubjects.slice(startIndexBase, endIndexBase);

  // Calculate pagination for "Môn chung cho toàn khoa"
  const commonSubjects = filteredSubjects.filter((s) => s.isCommon);
  const totalPagesCommon = Math.ceil(commonSubjects.length / itemsPerPage);
  const startIndexCommon = (currentPageCommon - 1) * itemsPerPage;
  const endIndexCommon = startIndexCommon + itemsPerPage;
  const paginatedCommonSubjects = commonSubjects.slice(startIndexCommon, endIndexCommon);

  // Pagination handlers for "Môn cơ sở"
  const handlePageChangeBase = (page) => {
    setCurrentPageBase(page);
  };

  const handlePrevPageBase = () => {
    if (currentPageBase > 1) setCurrentPageBase(currentPageBase - 1);
  };

  const handleNextPageBase = () => {
    if (currentPageBase < totalPagesBase) setCurrentPageBase(currentPageBase + 1);
  };

  // Pagination handlers for "Môn chung cho toàn khoa"
  const handlePageChangeCommon = (page) => {
    setCurrentPageCommon(page);
  };

  const handlePrevPageCommon = () => {
    if (currentPageCommon > 1) setCurrentPageCommon(currentPageCommon - 1);
  };

  const handleNextPageCommon = () => {
    if (currentPageCommon < totalPagesCommon) setCurrentPageCommon(currentPageCommon + 1);
  };

  // Drag and drop handlers
  const handleDragStartSubject = (e, subject) => {
    setDraggedSubject(subject);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartCourse = (e, course, fromSemesterId) => {
    setDraggedCourse({ course, fromSemesterId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, semesterId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = draggedCourse ? 'move' : 'copy';
    setDragOverSemester(semesterId);
  };

  const handleDragLeave = () => {
    setDragOverSemester(null);
  };

  const handleDropToSemester = (e, targetSemesterId) => {
    e.preventDefault();
    setDragOverSemester(null);

    const targetSemesterIndex = semesters.findIndex((s) => s.id === targetSemesterId);
    if (targetSemesterIndex === -1) {
      setDraggedSubject(null);
      setDraggedCourse(null);
      return;
    }

    if (draggedSubject) {
      // Add new subject from sidebar to semester
      const draggedCode = normalizeCode(draggedSubject.code);

      // Check if course already exists in any semester
      const courseExists = semesters.some((s) => (s.courses || []).some((c) => normalizeCode(c.code) === draggedCode));

      if (courseExists) {
        // Course already exists - show warning
        showToast('Môn học đã được xếp trong một học kỳ khác!', 'warning');
        setDraggedSubject(null);
        return;
      }

      const validation = validatePlacement(draggedCode, targetSemesterIndex);
      if (!validation.ok) {
        showToast(validation.message, 'warning');
        setDraggedSubject(null);
        return;
      }

      const newCourse = {
        code: draggedCode,
        name: draggedSubject.name,
        credits: draggedSubject.credits,
        hasPrerequisite: false,
      };

      setSemesters((prev) =>
        prev.map((sem) =>
          sem.id === targetSemesterId
            ? { ...sem, credits: sem.credits + newCourse.credits, courses: [...sem.courses, newCourse] }
            : sem
        )
      );
      setHasChanges(true);
      setDraggedSubject(null);
    } else if (draggedCourse) {
      // Move course between semesters
      const { course, fromSemesterId } = draggedCourse;

      // Don't allow dropping to the same semester
      if (fromSemesterId === targetSemesterId) {
        setDraggedCourse(null);
        return;
      }

      const movingCode = normalizeCode(course.code);
      const fromIndex = semesters.findIndex((s) => s.id === fromSemesterId);

      // Temporarily allow prerequisite check by considering course removed from old semester
      // If course is prerequisite of something scheduled in an earlier/equal semester than target, block.
      const validation = validatePlacement(movingCode, targetSemesterIndex);
      if (!validation.ok) {
        showToast(validation.message, 'warning');
        setDraggedCourse(null);
        return;
      }

      // Also ensure moving doesn't violate its own prerequisites relative order (already checked)
      // and doesn't create duplicates (should not happen but keep safe)
      const duplicate = semesters.some((s) => s.id !== fromSemesterId && (s.courses || []).some((c) => normalizeCode(c.code) === movingCode));
      if (duplicate) {
        showToast('Môn học đã tồn tại ở học kỳ khác!', 'warning');
        setDraggedCourse(null);
        return;
      }

      setSemesters((prev) =>
        prev.map((sem) => {
          if (sem.id === fromSemesterId) {
            return { ...sem, credits: sem.credits - course.credits, courses: sem.courses.filter((c) => c.code !== course.code) };
          }
          if (sem.id === targetSemesterId) {
            return { ...sem, credits: sem.credits + course.credits, courses: [...sem.courses, course] };
          }
          return sem;
        })
      );
      setHasChanges(true);
      setDraggedCourse(null);
    }
  };

  const handleRemoveCourse = (semesterId, courseCode) => {
    const course = semesters.find((s) => s.id === semesterId)?.courses.find((c) => c.code === courseCode);
    if (course) {
      setSemesters((prev) =>
        prev.map((sem) =>
          sem.id === semesterId
            ? { ...sem, credits: sem.credits - course.credits, courses: sem.courses.filter((c) => c.code !== courseCode) }
            : sem
        )
      );
      setHasChanges(true);
    }
  };

  const handleAddNewSemester = () => {
    const newId = Math.max(...semesters.map((s) => s.id)) + 1;
    const newSemester = {
      id: newId,
      name: `Học kỳ ${semesters.length + 1}`,
      credits: 0,
      courses: [],
    };
    setSemesters([...semesters, newSemester]);
    setHasChanges(true);
  };

  const handleSaveCurriculum = async () => {
    if (!curriculumId) {
      showToast('Thiếu curriculumId trên URL. Vui lòng vào từ trang danh sách để thiết lập.', 'error');
      return;
    }

    setSaving(true);
    try {
      // Calculate totals
      const totalCredits = semesters.reduce((sum, sem) => sum + sem.credits, 0);
      const totalCourses = semesters.reduce((sum, sem) => sum + sem.courses.length, 0);

      const resolvedCode = currentCurriculum?.code || currentCurriculum?.curriculumCode || 'CURR';
      const resolvedName = currentCurriculum?.name || currentCurriculum?.title || 'Khung chương trình';

      // Prepare curriculum data
      const curriculumData = {
        code: resolvedCode,
        name: resolvedName,
        academicYear: currentCurriculum?.academicYear || '2024/2025',
        major: currentCurriculum?.major || 'Khoa Kỹ thuật & Công nghệ',
        description: currentCurriculum?.description || '',
        status: currentCurriculum?.status || 'active',
        totalCredits,
        totalCourses,
        semesters: semesters.map(sem => ({
          id: sem.id,
          name: sem.name,
          credits: sem.credits,
          courses: sem.courses
        })),
      };

      const response = await curriculumService.updateCurriculum(curriculumId, curriculumData);
      setCurrentCurriculum(response.data?.data);
      showToast('Lưu khung chương trình thành công!', 'success');
    } catch (error) {
      console.error('Error saving curriculum:', error);
      showToast('Lưu thất bại! Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Available Subjects */}
        <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-20">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 uppercase text-xs tracking-wider">
                Môn học có sẵn
              </h3>
              <img src={filterIcon} alt="Lọc" className="w-5 h-5 text-slate-400 cursor-pointer hover:text-primary" />
            </div>
            <div className="relative">
              <img src={searchIcon} alt="Tìm kiếm" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-9 text-xs focus:ring-1 focus:ring-primary focus:border-primary text-slate-900 dark:text-white"
                placeholder="Tìm mã hoặc tên môn..."
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>
          </div>

          {/* Subjects List */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy môn học</p>
              </div>
            ) : (
              <>
                {/* Group by Category - Môn cơ sở */}
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">Môn cơ sở</p>
                {paginatedBaseSubjects
                  .map((subject) => (
                <div
                  key={subject.code}
                  draggable
                  onDragStart={(e) => handleDragStartSubject(e, subject)}
                  className="cursor-grab active:cursor-grabbing p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-primary/50 hover:shadow-sm transition-all border-l-4 relative overflow-hidden"
                  style={{ borderLeftColor: subject.color === 'primary' ? '#137fec' : '#14b8a6' }}
                >
                  {subject.isCommon && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                      CHUNG
                    </div>
                  )}
                  <div className="flex justify-between items-start mb-1 pr-8">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: subject.color === 'primary' ? '#137fec' : '#14b8a6',
                        backgroundColor: subject.color === 'primary' ? 'rgba(19,126,236,0.1)' : 'rgba(20,184,166,0.1)',
                      }}
                    >
                      {subject.code}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{subject.credits} Tín chỉ</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-2">{subject.name}</h4>
                </div>
              ))}

              {/* Pagination for "Môn cơ sở" */}
              {totalPagesBase > 1 && (
                <div className="flex items-center justify-center gap-1 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-2">
                  <button
                    onClick={handlePrevPageBase}
                    disabled={currentPageBase === 1}
                    className={`p-1 rounded transition-colors ${
                      currentPageBase === 1
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <img src={nextIcon} alt="Trước" className="w-4 h-4 rotate-180" />
                  </button>
                  {Array.from({ length: totalPagesBase }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChangeBase(page)}
                      className={`w-6 h-6 text-xs font-bold rounded transition-all ${
                        currentPageBase === page
                          ? 'bg-primary text-white'
                          : 'text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={handleNextPageBase}
                    disabled={currentPageBase === totalPagesBase}
                    className={`p-1 rounded transition-colors ${
                      currentPageBase === totalPagesBase
                        ? 'text-slate-300 cursor-not-allowed'
                        : 'text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <img src={nextIcon} alt="Sau" className="w-4 h-4" />
                  </button>
                </div>
              )}

            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 pt-3">Môn chung cho toàn khoa</p>
            {paginatedCommonSubjects
              .map((subject) => (
                <div
                  key={subject.code}
                  draggable
                  onDragStart={(e) => handleDragStartSubject(e, subject)}
                  className="cursor-grab active:cursor-grabbing p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-green-50 dark:bg-green-900/20 hover:border-green-500/50 hover:shadow-sm transition-all border-l-4 relative overflow-hidden"
                  style={{ borderLeftColor: '#22c55e' }}
                >
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl">
                    CHUNG
                  </div>
                  <div className="flex justify-between items-start mb-1 pr-12">
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50"
                    >
                      {subject.code}
                    </span>
                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">{subject.credits} Tín chỉ</span>
                  </div>
                  <h4 className="text-xs font-semibold text-green-800 dark:text-green-300 line-clamp-2">{subject.name}</h4>
                </div>
              ))}
              </>
            )}
          </div>

          {/* Pagination for "Môn chung cho toàn khoa" */}
          {totalPagesCommon > 1 && (
            <div className="flex items-center justify-center gap-2 py-2 border-t border-slate-200 dark:border-slate-800 bg-green-50 dark:bg-green-900/10">
              <button
                onClick={handlePrevPageCommon}
                disabled={currentPageCommon === 1}
                className={`p-1.5 rounded-md transition-colors ${
                  currentPageCommon === 1
                    ? 'text-green-300 cursor-not-allowed'
                    : 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                <img src={nextIcon} alt="Trước" className="w-4 h-4 rotate-180" />
              </button>
              {Array.from({ length: totalPagesCommon }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChangeCommon(page)}
                  className={`w-6 h-6 text-xs font-bold rounded-md transition-all ${
                    currentPageCommon === page
                      ? 'bg-green-600 text-white shadow-md shadow-green-600/20'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={handleNextPageCommon}
                disabled={currentPageCommon === totalPagesCommon}
                className={`p-1.5 rounded-md transition-colors ${
                  currentPageCommon === totalPagesCommon
                    ? 'text-green-300 cursor-not-allowed'
                    : 'text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
                }`}
              >
                <img src={nextIcon} alt="Sau" className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Footer hint */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-[10px] text-slate-500 leading-tight italic">
              Kéo thả môn học vào các học kỳ để xây dựng khung chương trình
            </p>
          </div>
        </aside>

        {/* Main Content - Curriculum Board */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-background-dark overflow-hidden">
          {/* Top Bar */}
          <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-4 text-sm">
              <Link to="/admin/curriculum" className="text-slate-500 hover:text-primary transition-colors">
                Khung chương trình
              </Link>
              <img src={nextIcon} alt=">" className="w-4 h-4 text-slate-400 rotate-90" />
              <span className="text-primary font-medium">
                {currentCurriculum?.name || 'Thiết lập khung chương trình'}
              </span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    {currentCurriculum?.name || 'Cử nhân KH Máy tính'}
                  </h2>
                  <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Đang áp dụng
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {currentCurriculum?.academicYear || '2024/2025'} • {currentCurriculum?.major || 'Khoa Kỹ thuật & Công nghệ'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 h-10 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  <img src={copyIcon} alt="Sao chép" className="w-5 h-5" />
                  <span>Sao chép</span>
                </button>
                <button
                  onClick={handleSaveCurriculum}
                  disabled={saving}
                  className={`flex items-center gap-2 h-10 px-6 rounded-lg text-white text-sm font-bold shadow-lg transition-all ${
                    saving
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Lưu thay đổi</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* View Options & Stats */}
            <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-md p-1">
                <button
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-all ${
                    viewMode === 'board'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                  onClick={() => setViewMode('board')}
                >
                  Dạng Board
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                  onClick={() => setViewMode('list')}
                >
                  Dạng Danh sách
                </button>
                <button
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                    viewMode === 'diagram'
                      ? 'bg-white dark:bg-slate-700 shadow-sm text-primary'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                  onClick={() => setViewMode('diagram')}
                >
                  Sơ đồ tiên quyết
                </button>
              </div>
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tổng tín chỉ</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{totalCredits}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Số môn học</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{totalCourses}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Trạng thái</span>
                  <span className="text-sm font-bold text-green-600">Đã phê duyệt</span>
                </div>
              </div>
            </div>
          </div>

          {/* Semesters Board */}
          <div className="flex-1 overflow-x-auto no-scrollbar p-6">
            <div className="flex gap-6 h-full min-w-max">
              {semesters.map((semester) => (
                <div key={semester.id} className="w-80 flex flex-col h-full">
                  {/* Semester Header */}
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">{semester.name}</h3>
                      <p className="text-xs text-slate-500">
                        {semester.credits} Tín chỉ • {semester.courses.length} Môn
                      </p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                      <img src={nextIcon} alt="Tùy chọn" className="w-5 h-5 rotate-90" />
                    </button>
                  </div>

                  {/* Courses Drop Zone */}
                  <div
                    className="flex-1 flex flex-col gap-3 p-3 bg-slate-200/50 dark:bg-slate-800/40 rounded-xl border-2 border-dashed border-transparent hover:border-primary/20 transition-all overflow-y-auto no-scrollbar"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDropToSemester(e, semester.id)}
                  >
                    {semester.courses.map((course) => (
                      <div
                        key={course.code}
                        draggable
                        onDragStart={(e) => handleDragStartCourse(e, course, semester.id)}
                        className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow relative overflow-hidden cursor-grab active:cursor-grabbing"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {course.code}
                          </span>
                          <button
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            onClick={() => handleRemoveCourse(semester.id, course.code)}
                          >
                            <img src={deleteIcon} alt="Xóa" className="w-5 h-5" />
                          </button>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2 line-clamp-2">
                          {course.name}
                        </h4>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1.5">
                            <img src={searchIcon} alt="Tín chỉ" className="w-4 h-4 text-slate-400" />
                            <span className="text-[11px] text-slate-500">{course.credits} Tín chỉ</span>
                          </div>
                          {course.hasPrerequisite && (
                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                              <img src={nextIcon} alt="Tiên quyết" className="w-3 h-3" />
                              Tiên quyết
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Drop Zone Placeholder */}
                    <div className="group flex-1 min-h-[80px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-white/50 dark:hover:bg-slate-800/30 transition-all">
                      <img src={addIcon} alt="Thêm" className="w-6 h-6 text-slate-300 dark:text-slate-600 group-hover:text-primary transition-colors" />
                      <p className="text-[10px] text-slate-400 group-hover:text-slate-600 transition-colors uppercase font-bold">
                        Thả tại đây
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Semester Button */}
              <button
                onClick={handleAddNewSemester}
                className="w-16 flex flex-col items-center justify-center bg-white/40 dark:bg-slate-800/20 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl hover:bg-white dark:hover:bg-slate-800 hover:border-primary transition-all group shrink-0"
              >
                <img src={addIcon} alt="Thêm học kỳ" className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                <span className="text-[10px] text-slate-400 group-hover:text-primary uppercase font-black mt-2 [writing-mode:vertical-lr]">
                  Thêm học kỳ mới
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <footer className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-green-500"></div>
                <span className="text-[11px] font-medium text-slate-500">Đã lưu thay đổi</span>
              </div>
              <span className="text-[11px] text-slate-300">|</span>
              <span className="text-[11px] text-slate-500">Chỉnh sửa lần cuối bởi Admin • 14 phút trước</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-[11px] font-bold text-primary hover:underline">Xuất PDF</button>
              <button className="text-[11px] font-bold text-primary hover:underline">Xuất Excel</button>
            </div>
          </footer>
        </div>
      </main>

      {/* Toast Notification */}
      {toast.show && (
        <div
          className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-bottom-5 ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="p-1 hover:opacity-80"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

