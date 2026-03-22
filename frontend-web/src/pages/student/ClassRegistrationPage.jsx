import { useEffect, useMemo, useState } from 'react';
import classService from '../../services/classService';
import registrationService from '../../services/registrationService';
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
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filters, setFilters] = useState({ semester: '' });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [eligibility, setEligibility] = useState(null);
  const [toast, setToast] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [conflictPopup, setConflictPopup] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEligibility = async () => {
    try {
      const response = await registrationService.getEligibilitySummary();
      setEligibility(response?.data?.data || null);
    } catch (error) {
      setEligibility(null);
    }
  };

  const preValidateClasses = async (classList) => {
    if (!classList.length) {
      setValidationResults({});
      return;
    }

    const entries = await Promise.all(
      classList.map(async (cls) => {
        try {
          const response = await registrationService.validateAll(cls._id);
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
        semester: filters.semester,
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
    fetchEligibility();
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [page, filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchClasses();
    }, 400);

    return () => clearTimeout(timer);
  }, [searchKeyword]);

  const creditInfo = eligibility?.limits?.credit;
  const overloadInfo = eligibility?.limits?.overload;
  const cohortInfo = eligibility?.limits?.cohortAccess;

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
      const response = await registrationService.validateAll(classId);
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
      const response = await registrationService.validateScheduleConflict(classId);
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

  const isCohortBlocked = cohortInfo && !cohortInfo.allowed;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Course Registration</h1>
          <p className="text-gray-600">Search and register class sections.</p>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Search className="h-4 w-4" />
              Search classes
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
                value={filters.semester}
                onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All semesters</option>
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Semester 3</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
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
            <div className="mt-2 h-2 w-full rounded bg-slate-200">
              <div className="h-2 rounded bg-blue-600" style={{ width: `${creditPercent}%` }} />
            </div>
          </div>
        </div>

        {isCohortBlocked && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {cohortInfo?.message || 'Your cohort is not allowed in current registration period'}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-600">Loading classes...</div>
        ) : (
          <>
            <div className="mb-4 text-sm text-slate-600">Found {pagination?.total || 0} classes</div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => {
                const validation = validationResults[cls._id];
                const validationErrors = validation?.validationErrors || [];
                const cannotRegister =
                  cls.isFull ||
                  isCohortBlocked ||
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
                            Eligible to register
                          </div>
                        </div>
                      )}

                      {!validation?.isEligible && validationErrors.length > 0 && (
                        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                          <div className="mb-1 flex items-center gap-1 font-semibold">
                            <XCircle className="h-4 w-4" />
                            Registration blocked
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
                          Register
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
