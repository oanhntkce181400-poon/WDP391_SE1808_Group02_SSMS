// AddStudentModal.jsx - Modal for admin to manually add students to a class
import { useState, useEffect, useCallback } from "react";
import { X, Search, UserPlus, Users, AlertCircle, CheckCircle, Loader2, UserCheck } from "lucide-react";
import classService from "../../services/classService";
import studentService from "../../services/studentService";

export default function AddStudentModal({
  classSection,
  onClose,
  onSuccess,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [enrollingStudents, setEnrollingStudents] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Reset state on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  // Debounced search
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError(null);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (value.trim().length < 2) {
      setStudents([]);
      return;
    }

    const timeout = setTimeout(() => {
      fetchStudents(value.trim());
    }, 300);
    setSearchTimeout(timeout);
  };

  const fetchStudents = async (query) => {
    setLoadingStudents(true);
    try {
      const response = await studentService.getStudents({
        search: query,
        academicStatus: "enrolled",
        limit: 20,
      });
      const data = response.data?.data || [];
      // Filter out students already enrolled in this class
      if (data.length > 0) {
        const enrolledResponse = await classService.getClassEnrollments(classSection._id);
        const enrolledIds = new Set(
          (enrolledResponse.data?.data || [])
            .filter(e => e.status === "enrolled")
            .map(e => String(e.student?._id || e.student))
        );
        setStudents(data.filter(s => !enrolledIds.has(String(s._id))));
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Error searching students:", err);
      setError("Không thể tìm kiếm sinh viên. Vui lòng thử lại.");
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleEnroll = async (studentId) => {
    setEnrollingStudents((prev) => ({ ...prev, [studentId]: true }));
    setError(null);
    try {
      await classService.enrollStudent(classSection._id, studentId);
      // Remove from list and selection
      setStudents((prev) => prev.filter((s) => s._id !== studentId));
      setSelectedStudents((prev) => prev.filter((id) => id !== studentId));
      setSuccess(`Đã thêm sinh viên vào lớp thành công.`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || "Không thể thêm sinh viên.";
      setError(msg);
    } finally {
      setEnrollingStudents((prev) => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });
    }
  };

  const handleEnrollSelected = async () => {
    if (selectedStudents.length === 0) return;
    setError(null);
    let successCount = 0;
    let failCount = 0;

    for (const studentId of selectedStudents) {
      setEnrollingStudents((prev) => ({ ...prev, [studentId]: true }));
      try {
        await classService.enrollStudent(classSection._id, studentId);
        successCount++;
      } catch (err) {
        failCount++;
        console.error(`Failed to enroll student ${studentId}:`, err);
      } finally {
        setEnrollingStudents((prev) => {
          const next = { ...prev };
          delete next[studentId];
          return next;
        });
      }
    }

    // Remove successfully enrolled from list
    setStudents((prev) =>
      prev.filter((s) => !selectedStudents.slice(0, successCount).includes(s._id))
    );
    setSelectedStudents([]);

    if (failCount === 0) {
      setSuccess(`Đã thêm ${successCount} sinh viên vào lớp thành công.`);
    } else {
      setError(`Đã thêm ${successCount} sinh viên. ${failCount} sinh viên thất bại (có thể đã đăng ký hoặc lớp đầy).`);
    }
    setTimeout(() => setSuccess(null), 4000);
  };

  const isFull = classSection.currentEnrollment >= classSection.maxCapacity;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <UserPlus size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Thêm sinh viên vào lớp</h2>
              <p className="text-sm text-slate-500">
                Tìm và thêm sinh viên chưa đăng ký vào lớp này
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Class info banner */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="font-mono font-semibold text-slate-800">
                {classSection.classCode}
              </span>
              <span className="mx-2 text-slate-400">·</span>
              <span className="text-slate-600">{classSection.className}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-slate-400" />
              <span className={`font-medium ${isFull ? "text-red-600" : "text-slate-700"}`}>
                {classSection.currentEnrollment}/{classSection.maxCapacity}
              </span>
              {isFull && (
                <span className="text-xs text-red-600 font-medium">· Đã đầy</span>
              )}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Nhập mã SV hoặc tên sinh viên (ít nhất 2 ký tự)..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none"
              autoFocus
            />
            {loadingStudents && (
              <Loader2
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin"
              />
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Chỉ hiển thị sinh viên chưa đăng ký lớp này và có trạng thái đang học.
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2">
              <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {isFull && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-700">
                Lớp đã đầy. Không thể thêm sinh viên mới.
              </p>
            </div>
          )}

          {!isFull && students.length === 0 && !loadingStudents && searchQuery.length >= 2 && (
            <div className="text-center py-8 text-slate-400">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Không tìm thấy sinh viên phù hợp</p>
            </div>
          )}

          {!isFull && students.length === 0 && !loadingStudents && searchQuery.length < 2 && (
            <div className="text-center py-8 text-slate-400">
              <Search size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nhập mã SV hoặc tên để tìm kiếm</p>
            </div>
          )}

          {students.length > 0 && (
            <div className="space-y-2">
              {students.map((student) => {
                const isSelected = selectedStudents.includes(student._id);
                const isEnrolling = enrollingStudents[student._id];
                return (
                  <div
                    key={student._id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isSelected
                        ? "border-indigo-300 bg-indigo-50"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(student._id)}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 text-sm truncate">
                          {student.fullName}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono">{student.studentCode}</span>
                          {student.majorCode && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>{student.majorCode}</span>
                            </>
                          )}
                          {student.cohort && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span>K{student.cohort}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(student._id)}
                      disabled={isEnrolling}
                      className="ml-3 shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      {isEnrolling ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          Đang thêm...
                        </>
                      ) : (
                        <>
                          <UserPlus size={12} />
                          Thêm
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {selectedStudents.length > 0 ? (
                <span className="text-indigo-600 font-medium">
                  {selectedStudents.length} sinh viên được chọn
                </span>
              ) : (
                "Chọn sinh viên để thêm vào lớp"
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={handleEnrollSelected}
                disabled={selectedStudents.length === 0 || Object.keys(enrollingStudents).length > 0}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                <UserCheck size={14} />
                Thêm {selectedStudents.length > 0 ? `${selectedStudents.length} SV` : ""}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
