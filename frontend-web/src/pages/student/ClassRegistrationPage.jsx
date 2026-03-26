import { useEffect, useMemo, useState } from 'react';
import classService from '../../services/classService';
import registrationService from '../../services/registrationService';
import registrationPeriodService from '../../services/registrationPeriodService';
import { useSocket } from '../../contexts/SocketContext';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  GraduationCap,
  Lock,
  MapPin,
  Search,
  Users,
  XCircle,
} from 'lucide-react';

export default function ClassRegistrationPage() {
  const { socket } = useSocket();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [eligibility, setEligibility] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentRegistrationPeriod, setCurrentRegistrationPeriod] = useState(null);
  const [semesterOptions, setSemesterOptions] = useState([]);
  const [targetSemesterId, setTargetSemesterId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [conflictPopup, setConflictPopup] = useState(null);

  const getSemesterIdFromPeriod = (period) => {
    if (!period?.semester) return '';
    if (typeof period.semester === 'string') return period.semester;
    return period.semester?._id || period.semester?.id || '';
  };

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Gọi API summary để lấy toàn bộ "giới hạn đăng ký" của sinh viên.
  // Khối dữ liệu này nuôi trực tiếp 4 feature trên UI:
  // - Limit Course Overload
  // - Verify Student Cohort Eligibility
  // - Check Maximum Credit Limit
  // - disable Register theo eligibility tổng hợp
  const fetchEligibility = async () => {
    try {
      const response = await registrationService.getEligibilitySummary(null, targetSemesterId || null);
      setEligibility(response?.data?.data || null);
    } catch (error) {
      setEligibility(null);
    }
  };

  const fetchSemesters = async () => {
    try {
      const limit = 100;
      const firstResponse = await registrationPeriodService.getSemesters({ limit, page: 1 });
      const firstSemesters = firstResponse?.data?.data || [];
      const totalPages = Number(firstResponse?.data?.pagination?.totalPages || 1);

      let semesters = [...firstSemesters];
      if (totalPages > 1) {
        const remainingResponses = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, index) =>
            registrationPeriodService.getSemesters({ limit, page: index + 2 }),
          ),
        );

        remainingResponses.forEach((res) => {
          const items = res?.data?.data || [];
          semesters = semesters.concat(items);
        });
      }

      setSemesterOptions(semesters);

      if (!targetSemesterId && semesters.length > 0) {
        const current = semesters.find((item) => item.isCurrent);
        setTargetSemesterId(current?.id || semesters[0]?.id || '');
      }
    } catch (error) {
      setSemesterOptions([]);
    }
  };

  const fetchCurrentRegistrationPeriod = async () => {
    try {
      const response = await registrationPeriodService.getCurrentPeriod();
      const period = response?.data?.data || null;
      setCurrentRegistrationPeriod(period);

      const periodSemesterId = getSemesterIdFromPeriod(period);
      if (periodSemesterId) {
        setTargetSemesterId(periodSemesterId);
      }
    } catch (error) {
      setCurrentRegistrationPeriod(null);
    }
  };

  const preValidateClasses = async (classList) => {
    if (!classList.length) {
      setValidationResults({});
      return;
    }

    // FE chủ động validate trước từng class để badge/cảnh báo hiện sẵn khi page load,
    // thay vì đợi người dùng bấm Register mới biết bị chặn vì prerequisite/overload/cohort.
    const entries = await Promise.all(
      classList.map(async (cls) => {
        try {
          const response = await registrationService.validateAll(cls._id, targetSemesterId || null);
          return [cls._id, response?.data?.data || null];
        } catch (error) {
          return [cls._id, null];
        }
      }),
    );

    setValidationResults(Object.fromEntries(entries));
  };

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const params = {
        keyword: searchKeyword,
        semesterId: targetSemesterId || undefined,
        page,
        limit: 12,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const response = await classService.searchClasses(params);
      const classList = response?.data?.classes || response?.data?.data || [];
      setClasses(classList);
      setPagination(response?.data?.pagination || null);
      await preValidateClasses(classList);
    } catch (error) {
      showToast('Cannot load class list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemesters();
    fetchCurrentRegistrationPeriod();
  }, []);

  useEffect(() => {
    fetchEligibility();
  }, [targetSemesterId]);

  useEffect(() => {
    if (!socket) return;

    const handleRegistrationPeriodUpdated = () => {
      fetchCurrentRegistrationPeriod();
    };

    socket.on('registration-period-updated', handleRegistrationPeriodUpdated);

    return () => {
      socket.off('registration-period-updated', handleRegistrationPeriodUpdated);
    };
  }, [socket]);

  useEffect(() => {
    fetchClasses();
  }, [page, targetSemesterId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchClasses();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const creditInfo = eligibility?.limits?.credit;
  const overloadInfo = eligibility?.limits?.overload;

  // Progress bar "x/y tín chỉ" dùng currentCredits và maxCredits từ BE.
  const creditPercent = useMemo(() => {
    if (!creditInfo?.maxCredits) return 0;
    return Math.min(100, Math.round((creditInfo.currentCredits / creditInfo.maxCredits) * 100));
  }, [creditInfo]);

  const getStatusColor = (occupancyPercentage) => {
    if (occupancyPercentage >= 100) return 'bg-red-100 text-red-800';
    if (occupancyPercentage >= 80) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
  };

  const getStatusLabel = (occupancyPercentage, isFull) => {
    if (isFull) return 'Full';
    if (occupancyPercentage >= 80) return 'Nearly full';
    return 'Available';
  };

  const getPageItems = (currentPage, totalPages) => {
    if (!totalPages || totalPages <= 1) return [];

    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    const normalized = [...pages]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);

    const items = [];
    normalized.forEach((p, index) => {
      const prev = normalized[index - 1];
      if (index > 0 && p - prev > 1) {
        items.push('ellipsis');
      }
      items.push(p);
    });

    return items;
  };

  const validateSingleClass = async (classId) => {
    try {
      const response = await registrationService.validateAll(classId, targetSemesterId || null);
      const data = response?.data?.data || null;
      setValidationResults((prev) => ({ ...prev, [classId]: data }));
      return data;
    } catch (error) {
      showToast('Cannot validate this class now', 'error');
      return null;
    }
  };

  const checkScheduleConflictNow = async (classId, { showWhenNoConflict = false } = {}) => {
    try {
      const response = await registrationService.validateScheduleConflict(classId, targetSemesterId || null);
      const result = response?.data?.data || null;

      if (result?.hasConflict) {
        setConflictPopup({
          classId,
          message: result.message,
          conflicts: result.conflicts || [],
          selectedClass: result.selectedClass || null,
        });
        return result;
      }

      setConflictPopup(null);
      if (showWhenNoConflict) {
        showToast('No schedule conflict. You can continue registration.', 'success');
      }
      return result;
    } catch (error) {
      showToast(error?.response?.data?.message || 'Cannot check schedule conflict now', 'error');
      return null;
    }
  };

  const handleSelectClass = async (cls) => {
    setSelectedClassId(cls._id);
    await checkScheduleConflictNow(cls._id, { showWhenNoConflict: false });
  };

  const handleRegister = async (cls) => {
    const scheduleConflict = await checkScheduleConflictNow(cls._id, { showWhenNoConflict: false });
    if (scheduleConflict?.hasConflict) {
      showToast('Schedule conflict detected. Please choose another class section.', 'error');
      return;
    }

    // Nếu pre-validation chưa có thì check lại trước khi đăng ký thật.
    // Đây là chốt cuối FE trước khi gọi selfEnroll.
    let validation = validationResults[cls._id];
    if (!validation) {
      validation = await validateSingleClass(cls._id);
    }

    if (!validation?.isEligible) {
      const errMessage = validation?.validationErrors?.[0] || 'Class is not eligible for registration';
      showToast(errMessage, 'error');
      return;
    }

    try {
      await classService.selfEnroll(cls._id);
      showToast('Registration successful', 'success');
      await fetchEligibility();
      await fetchClasses();
    } catch (error) {
      showToast(error?.response?.data?.message || 'Registration failed', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Đăng ký học lại / học vượt</h1>
          <p className="text-gray-600">Tìm lớp phù hợp và đăng ký theo đợt repeat hoặc overload đang mở.</p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Search className="h-4 w-4" />
                Tìm lớp
              </div>
            <input
              type="text"
              placeholder="Class code, class name"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="mt-3">
              <select
                value={targetSemesterId}
                onChange={(e) => {
                  setTargetSemesterId(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select semester</option>
                {semesterOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.code} ({item.academicYear})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            {/* "Your limits" là vùng FE gom 3 rule chính:
                cohort, overload, credit.
                Đây là phần dễ nhất để demo các chức năng 5, 10, 11, 13 trên UI. */}
            <div className="mb-2 text-sm font-semibold text-slate-700">Your limits</div>
            <div className="text-sm text-slate-600">
              Cohort: <span className="font-semibold text-slate-900">K{eligibility?.student?.cohort || '-'}</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Overload: <span className="font-semibold text-slate-900">{overloadInfo?.currentOverloadCount || 0}/2</span>
            </div>
            <div className="mt-2 text-sm text-slate-600">
              Credits: <span className="font-semibold text-slate-900">{creditInfo?.currentCredits || 0}/{creditInfo?.maxCredits || 20}</span>
            </div>
            {currentRegistrationPeriod?.periodName && (
              <div className="mt-2 text-xs text-slate-500">
                Active period: {currentRegistrationPeriod.periodName}
              </div>
            )}
            <div className="mt-2 h-2 w-full rounded bg-slate-200">
              <div className="h-2 rounded bg-blue-600" style={{ width: `${creditPercent}%` }} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-600">Loading classes...</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600">Found {pagination?.total || 0} classes</div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => {
                const validation = validationResults[cls._id];
                const validationErrors = validation?.validationErrors || [];
                // cannotRegister là tổng hợp tất cả điều kiện chặn ở tầng UI:
                // - lớp đầy
                // - cohort bị chặn
                // - validation backend trả class không đủ điều kiện
                const cannotRegister =
                  cls.isFull ||
                  (validation ? !validation.isEligible : false);

                return (
                  <div
                    key={cls._id}
                    onClick={() => handleSelectClass(cls)}
                    className={`cursor-pointer rounded-lg border bg-white shadow-sm transition ${
                      selectedClassId === cls._id
                        ? 'border-blue-400 ring-1 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="p-5">
                      <div className="mb-4 flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold text-gray-900">{cls.classCode}</h3>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(cls.occupancyPercentage)}`}>
                          {getStatusLabel(cls.occupancyPercentage, cls.isFull)}
                        </span>
                      </div>

                      <p className="mb-3 text-sm font-medium text-gray-800">{cls.className}</p>

                      <div className="mb-4 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4" />
                          <span>{cls.subject?.subjectCode}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{cls.teacher?.fullName || 'TBA'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{cls.timeslot?.startTime || '--'} - {cls.timeslot?.endTime || '--'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{cls.room?.roomCode || cls.room?.roomNumber || 'TBA'}</span>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="mb-1 flex justify-between text-xs text-gray-600">
                          <span>Enrollment</span>
                          <span>{cls.currentEnrollment}/{cls.maxCapacity}</span>
                        </div>
                        <div className="h-2 w-full rounded bg-gray-200">
                          <div
                            className={`h-2 rounded ${
                              cls.occupancyPercentage >= 100
                                ? 'bg-red-600'
                                : cls.occupancyPercentage >= 80
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(cls.occupancyPercentage || 0, 100)}%` }}
                          />
                        </div>
                      </div>

                      {validation?.isEligible && (
                        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700">
                          <div className="flex items-center gap-1 font-semibold">
                            <CheckCircle className="h-4 w-4" />
                            Đủ điều kiện đăng ký
                          </div>
                        </div>
                      )}

                      {!validation?.isEligible && validationErrors.length > 0 && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                          <div className="mb-1 flex items-center gap-1 font-semibold">
                            <XCircle className="h-4 w-4" />
                            Bị chặn đăng ký
                          </div>
                          <ul className="space-y-1">
                            {validationErrors.slice(0, 2).map((err) => (
                              <li key={err}>- {err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validation?.scheduleConflict?.hasConflict && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                          <div className="mb-1 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            Schedule conflict detected
                          </div>
                          <p>{validation.scheduleConflict.message}</p>
                        </div>
                      )}

                      {overloadInfo?.currentOverloadCount >= 2 && validation?.overload?.enrollingCourseIsOverload && (
                        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                          <div className="flex items-center gap-1 font-semibold">
                            <AlertTriangle className="h-4 w-4" />
                            You already registered 2 overload courses
                          </div>
                        </div>
                      )}

                      {cls.subject?.prerequisites?.length > 0 && (
                        <div className="mb-3 rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-xs text-yellow-700">
                          <div className="flex items-center gap-1 font-semibold">
                            <Lock className="h-4 w-4" />
                            Prerequisites required
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            validateSingleClass(cls._id);
                          }}
                          className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Check
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRegister(cls);
                          }}
                          disabled={cannotRegister}
                          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          Đăng ký
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {getPageItems(page, pagination.totalPages).map((item, index) => {
                    if (item === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-1 text-sm text-slate-500">
                          ...
                        </span>
                      );
                    }

                    const isActive = item === page;
                    return (
                      <button
                        key={item}
                        onClick={() => setPage(item)}
                        disabled={isActive}
                        className={`min-w-9 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'border-blue-600 bg-blue-600 text-white'
                            : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                        } disabled:cursor-default disabled:opacity-100`}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`max-w-md rounded-lg border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      {conflictPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl border border-red-200 bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Schedule Conflict Warning</h3>
            </div>
            <p className="mb-3 text-sm text-red-700">{conflictPopup.message}</p>

            {conflictPopup.conflicts?.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="mb-2 text-sm font-semibold text-red-800">Conflicted classes:</p>
                <ul className="space-y-1 text-sm text-red-700">
                  {conflictPopup.conflicts.map((item) => (
                    <li key={item.classId || `${item.classCode}-${item.startTime}`}>
                      • {item.classCode} ({item.subjectCode}) - Day {item.dayOfWeek}, {item.startTime} - {item.endTime}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setConflictPopup(null)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Choose another class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
