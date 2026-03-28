// Tuition Fee Management Page - Quản lý học phí theo khung chương trình
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import curriculumService from '../../services/curriculumService';
import majorService from '../../services/majorService';
import nextIcon from '../../assets/next.png';

/** VD: SEK26 → 26, CEK20 → 20 */
function extractCohortNumberFromCurriculumCode(code) {
  const s = String(code || '').trim().toUpperCase();
  const m = s.match(/^([A-Z]+)K(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    return Number.isInteger(n) ? n : null;
  }
  return null;
}

function parseCohortFilterValue(cohortFilter) {
  if (!cohortFilter || String(cohortFilter).trim() === '') {
    return null;
  }
  const n = Number(String(cohortFilter).replace(/^K/i, '').trim());
  return Number.isInteger(n) ? n : null;
}

/** Khóa: ưu tiên năm từ ngày bắt đầu sớm nhất của kỳ trong khung (API: cohortFromFrameworkStart), fallback mã SEK26 */
function deriveCohortMeta(curriculum) {
  if (curriculum.frameworkStartAt) {
    const n = Number(curriculum.cohortFromFrameworkStart);
    if (Number.isInteger(n) && n >= 0) {
      return {
        kNum: n,
        kLabel: `K${n}`,
        frameworkStartAt: curriculum.frameworkStartAt,
        source: 'frameworkStart',
      };
    }
  }
  const fromCode = extractCohortNumberFromCurriculumCode(curriculum.code);
  if (Number.isInteger(fromCode)) {
    return {
      kNum: fromCode,
      kLabel: `K${fromCode}`,
      frameworkStartAt: null,
      source: 'code',
    };
  }
  return { kNum: null, kLabel: null, frameworkStartAt: null, source: null };
}

function curriculumMatchesTuitionFilters(curriculum, cohortFilter, majorFilter, majorsByCode) {
  const cohortNum = parseCohortFilterValue(cohortFilter);
  if (Number.isInteger(cohortNum)) {
    const meta = deriveCohortMeta(curriculum);
    if (!Number.isInteger(meta.kNum) || meta.kNum !== cohortNum) {
      return false;
    }
  }

  if (majorFilter && String(majorFilter).trim() !== '') {
    const codeUp = String(majorFilter).trim().toUpperCase();
    const majorDoc = majorsByCode.get(codeUp);
    if (majorDoc && majorDoc._id && curriculum.majorId) {
      if (String(curriculum.majorId) !== String(majorDoc._id)) {
        return false;
      }
    } else {
      const ccode = String(curriculum.code || '').trim().toUpperCase();
      if (!ccode.startsWith(codeUp)) {
        return false;
      }
    }
  }

  return true;
}

function semesterCreditsTotal(semester) {
  const list = semester.courses;
  if (Array.isArray(list) && list.length > 0) {
    return list.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
  }
  return Number(semester.credits) || 0;
}

function courseLineTuition(course, pricePerCredit) {
  const fromDoc = Number(course.tuitionFee ?? course.subject?.tuitionFee);
  if (Number.isFinite(fromDoc) && fromDoc >= 0) {
    return fromDoc;
  }
  const cr = Number(course.credits) || 0;
  return cr * pricePerCredit;
}

export default function TuitionFeeManagement() {
  const navigate = useNavigate();
  const [curriculums, setCurriculums] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]); // Store all curriculums
  const [loading, setLoading] = useState(false);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  
  // Filter — mặc định «Tất cả» khóa để luôn thấy khung (vd SEK26) thay vì ép K20
  const [cohort, setCohort] = useState('');
  const [majorCode, setMajorCode] = useState('');
  const [majorsFromApi, setMajorsFromApi] = useState([]);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  // Price per credit (Giá mỗi tín chỉ)
  const PRICE_PER_CREDIT = 100; // 100 VND per credit

  const majorsByCode = useMemo(() => {
    const m = new Map();
    for (const mj of majorsFromApi) {
      if (mj.majorCode) {
        m.set(String(mj.majorCode).trim().toUpperCase(), mj);
      }
    }
    return m;
  }, [majorsFromApi]);

  const cohortOptions = useMemo(() => {
    const labels = new Set();
    for (const c of allCurriculums) {
      const meta = deriveCohortMeta(c);
      if (meta.kLabel) {
        labels.add(meta.kLabel);
      }
    }
    return Array.from(labels).sort((a, b) => {
      const na = parseCohortFilterValue(a);
      const nb = parseCohortFilterValue(b);
      return (nb || 0) - (na || 0);
    });
  }, [allCurriculums]);

  const fetchMajorsForFilter = async () => {
    try {
      const response = await majorService.getMajors({
        page: 1,
        limit: 500,
        isActive: true,
      });
      if (response?.data?.success) {
        setMajorsFromApi(response.data.data || []);
      }
    } catch (error) {
      showToast('Không tải được danh sách ngành (trang Quản lý ngành)', 'error');
    }
  };

  const fetchAllCurriculums = async () => {
    setLoading(true);
    try {
      const response = await curriculumService.getCurriculums({
        limit: 200,
        includeFrameworkStart: true,
      });
      setAllCurriculums(response.data?.data || []);
    } catch (error) {
      showToast('Không thể tải dữ liệu khung chương trình', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllCurriculums();
    fetchMajorsForFilter();
  }, []);

  useEffect(() => {
    if (!allCurriculums.length) return;

    const filtered = allCurriculums.filter((c) =>
      curriculumMatchesTuitionFilters(c, cohort, majorCode, majorsByCode),
    );

    filtered.sort((a, b) => {
      const ma = deriveCohortMeta(a);
      const mb = deriveCohortMeta(b);
      const ca = ma.kNum || 0;
      const cb = mb.kNum || 0;
      if (cb !== ca) {
        return cb - ca;
      }
      return String(a.code || '').localeCompare(String(b.code || ''));
    });

    setCurriculums(filtered);
  }, [cohort, majorCode, allCurriculums, majorsByCode]);

  const handleViewDetails = async (curriculum) => {
    if (!curriculum?._id) {
      return;
    }
    setIsModalOpen(true);
    setDetailLoading(true);
    setSelectedCurriculum(null);
    try {
      const res = await curriculumService.getCurriculum(curriculum._id);
      const full = res.data?.data;
      if (full) {
        setSelectedCurriculum(full);
      } else {
        setSelectedCurriculum(curriculum);
      }
    } catch (e) {
      showToast('Không tải được chi tiết khung (các kỳ / môn)', 'error');
      setSelectedCurriculum(curriculum);
    } finally {
      setDetailLoading(false);
    }
  };

  const calculateSemesterPrice = (semester) => {
    if (semester.courses && semester.courses.length > 0) {
      return semester.courses.reduce(
        (sum, c) => sum + courseLineTuition(c, PRICE_PER_CREDIT),
        0,
      );
    }
    return semesterCreditsTotal(semester) * PRICE_PER_CREDIT;
  };

  const calculateTotalPrice = (curriculum) => {
    if (
      curriculum.semesters &&
      Array.isArray(curriculum.semesters) &&
      curriculum.semesters.length > 0
    ) {
      const fromSemesters = curriculum.semesters.reduce(
        (sum, sem) => sum + calculateSemesterPrice(sem),
        0,
      );
      if (fromSemesters > 0) {
        return fromSemesters;
      }
    }
    return (Number(curriculum.totalCredits) || 0) * PRICE_PER_CREDIT;
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
            <div className="flex flex-wrap items-start justify-between gap-4">
              <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">
                Quản lý Học phí
              </h1>
              <button
                type="button"
                onClick={() => navigate('/admin/payment-summary')}
                className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
              >
                Nhắc học phí
              </button>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">
                Học phí theo từng học kỳ trong khung. <span className="font-medium text-slate-600 dark:text-slate-300">Khóa</span> lấy từ{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">thời điểm bắt đầu sớm nhất</span> của các kỳ trong khung
                (năm học → Kxx); nếu chưa có ngày kỳ trên CSDL thì fallback theo mã khung (vd SEK26).{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">Ngành</span> lấy từ dữ liệu{' '}
                <span className="font-medium text-slate-600 dark:text-slate-300">Quản lý ngành</span> (/admin/majors).
              </p>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Khóa:</label>
                <select
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[120px]"
                  value={cohort}
                  onChange={(e) => setCohort(e.target.value)}
                  title="Danh sách khóa suy ra từ ngày bắt đầu khung (các khung đang có trong hệ thống)"
                >
                  <option value="">Tất cả</option>
                  {cohortOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-center">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Ngành:</label>
                <select
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-w-[220px]"
                  value={majorCode}
                  onChange={(e) => setMajorCode(e.target.value)}
                  title="Danh sách ngành từ API /majors (trang Quản lý ngành)"
                >
                  <option value="">Tất cả</option>
                  {majorsFromApi.map((mj) => (
                    <option key={String(mj._id)} value={String(mj.majorCode || '').trim()}>
                      {[mj.majorCode, mj.majorName].filter(Boolean).join(' — ')}
                    </option>
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
              {curriculums.map((curriculum) => {
                const cohortMeta = deriveCohortMeta(curriculum);
                const startLabel =
                  cohortMeta.frameworkStartAt
                    ? new Date(cohortMeta.frameworkStartAt).toLocaleDateString('vi-VN')
                    : null;
                return (
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
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Khóa {cohortMeta.source === 'frameworkStart' ? '(theo ngày bắt đầu khung)' : '(theo mã khung)'}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {cohortMeta.kLabel || '—'}
                          {startLabel ? (
                            <span className="block text-xs font-normal text-slate-500 mt-0.5">
                              Bắt đầu: {startLabel}
                            </span>
                          ) : null}
                          <span className="block text-xs font-normal text-slate-500">
                            Niên khóa CT: {curriculum.academicYear}
                          </span>
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
              );
              })}
            </div>
          )}

          {!loading && curriculums.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Không có khung chương trình phù hợp
                {cohort || majorCode ? (
                  <>
                    {' '}
                    (lọc: {cohort || 'mọi khóa'}
                    {majorCode ? `, ngành ${majorCode}` : ''})
                  </>
                ) : null}
                . Gợi ý: để «Khóa» = Tất cả; danh sách khóa lấy từ ngày bắt đầu các khung đã tạo.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4"
          onClick={() => {
            setIsModalOpen(false);
            setSelectedCurriculum(null);
          }}
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
                    {selectedCurriculum?.code || 'Đang tải…'}
                  </h2>
                  <p className="text-slate-200 text-sm mt-1">
                    {selectedCurriculum?.name || ' '}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCurriculum(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {detailLoading && (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#1A237E] border-t-transparent" />
              </div>
            )}

            {!detailLoading && selectedCurriculum && (
              <>
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
                      key={String(semester._id ?? semester.id ?? semester.semesterOrder ?? '')}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
                    >
                      {/* Semester Header */}
                      <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">
                            {semester.name}
                          </h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {semester.courses?.length || 0} môn học • {semesterCreditsTotal(semester)} tín chỉ
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
                              key={course._id || course.subjectId || `${course.code || course.subjectCode}-${idx}`}
                              className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                      {course.code || course.subjectCode}
                                    </span>
                                    {course.hasPrerequisite && (
                                      <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded">
                                        Học trước
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    {course.name || course.subjectName}
                                  </p>
                                </div>
                                <div className="text-right ml-4">
                                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {course.credits} TC
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {courseLineTuition(course, PRICE_PER_CREDIT).toLocaleString('vi-VN')} ₫
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

            <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 bg-slate-50 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Đơn giá tham chiếu: <span className="font-semibold">{PRICE_PER_CREDIT.toLocaleString('vi-VN')} ₫</span>
                    /TC (nếu môn có học phí riêng trên CSDL thì dùng số đó).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedCurriculum(null);
                  }}
                  className="px-6 py-2 bg-[#1A237E] hover:bg-[#283593] text-white rounded-lg transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
              </>
            )}
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
