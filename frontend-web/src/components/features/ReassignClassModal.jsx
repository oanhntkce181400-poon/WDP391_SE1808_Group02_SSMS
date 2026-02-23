import { useState, useEffect } from "react";
import { X, Users, ArrowRight, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import classService from "../../services/classService";

export default function ReassignClassModal({
  sourceClass,
  onClose,
  onSuccess,
}) {
  const [targetClassId, setTargetClassId] = useState("");
  const [targetClasses, setTargetClasses] = useState([]);
  const [sourceEnrollments, setSourceEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [closeSourceClass, setCloseSourceClass] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Lấy danh sách lớp cùng môn học, cùng học kỳ
  useEffect(() => {
    async function fetchTargetClasses() {
      try {
        const response = await classService.getAllClasses({
          subject: sourceClass.subject?._id || sourceClass.subject,
          semester: sourceClass.semester,
          academicYear: sourceClass.academicYear,
          limit: 100,
          status: "published",
        });
        
        // Lọc bỏ lớp nguồn và các lớp đã đầy
        const classes = (response.data.data || []).filter(
          (cls) => 
            cls._id !== sourceClass._id && 
            cls.currentEnrollment < cls.maxCapacity
        );
        setTargetClasses(classes);
      } catch (err) {
        console.error("Error fetching target classes:", err);
      } finally {
        setLoadingTarget(false);
      }
    }

    if (sourceClass?.subject && sourceClass?.semester && sourceClass?.academicYear) {
      fetchTargetClasses();
    }
  }, [sourceClass]);

  // Lấy danh sách sinh viên của lớp nguồn
  useEffect(() => {
    async function fetchEnrollments() {
      setLoadingEnrollments(true);
      try {
        const response = await classService.getClassEnrollments(sourceClass._id);
        const enrollments = response.data.data || [];
        // Chỉ lấy sinh viên đang active (enrolled)
        setSourceEnrollments(enrollments.filter(e => e.status === "enrolled"));
      } catch (err) {
        console.error("Error fetching enrollments:", err);
        setSourceEnrollments([]);
      } finally {
        setLoadingEnrollments(false);
      }
    }

    if (sourceClass?._id) {
      fetchEnrollments();
    }
  }, [sourceClass]);

  // Handle select all
  useEffect(() => {
    if (selectAll) {
      setSelectedStudents(sourceEnrollments.map(e => e.student._id));
    } else {
      setSelectedStudents([]);
    }
  }, [selectAll, sourceEnrollments]);

  const handleToggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      }
      return [...prev, studentId];
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!targetClassId) {
      setError("Vui lòng chọn lớp đích");
      return;
    }

    if (selectedStudents.length === 0) {
      setError("Vui lòng chọn ít nhất 1 sinh viên để chuyển");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await classService.reassignClass({
        fromClassId: sourceClass._id,
        toClassId: targetClassId,
        studentIds: selectedStudents,
        closeSourceClass,
      });

      setSuccess(`Đã chuyển ${result.data.movedCount} sinh viên thành công!`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Đóng modal sau 1.5s
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Chuyển lớp thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetClassInfo = () => {
    return targetClasses.find(c => c._id === targetClassId);
  };

  const targetClass = getTargetClassInfo();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Chuyển lớp học phần</h2>
            <p className="text-sm text-slate-500 mt-1">
              {sourceClass.classCode} - {sourceClass.subject?.subjectName || sourceClass.className}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Source Class Info */}
        <div className="px-6 py-3 bg-blue-50 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-blue-700 uppercase">Lớp nguồn</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Mã lớp:</span>
              <span className="ml-2 font-medium">{sourceClass.classCode}</span>
            </div>
            <div>
              <span className="text-slate-500">Giảng viên:</span>
              <span className="ml-2 font-medium">{sourceClass.teacher?.fullName || "Chưa phân công"}</span>
            </div>
            <div>
              <span className="text-slate-500">Sĩ số:</span>
              <span className="ml-2 font-medium">{sourceClass.currentEnrollment}/{sourceClass.maxCapacity}</span>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {(error || success) && (
          <div className="px-6 py-3">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle size={16} />
                {success}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4">
          {/* Target Class Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chọn lớp đích <span className="text-red-500">*</span>
            </label>
            
            {loadingTarget ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" />
                Đang tải danh sách lớp...
              </div>
            ) : targetClasses.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                Không có lớp nào cùng môn học và học kỳ để chuyển.
              </div>
            ) : (
              <select
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setError(null);
                }}
                required
                className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                <option value="">-- Chọn lớp đích --</option>
                {targetClasses.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.classCode} - {cls.teacher?.fullName || "Chưa phân công"} | CS: {cls.currentEnrollment}/{cls.maxCapacity}
                  </option>
                ))}
              </select>
            )}

            {/* Target Class Info */}
            {targetClass && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="text-green-700 font-medium">
                    Lớp đích: {targetClass.classCode} - {targetClass.teacher?.fullName}
                  </span>
                  <span className="text-green-600">
                    (Còn {targetClass.maxCapacity - targetClass.currentEnrollment} chỗ)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Student Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">
                Chọn sinh viên chuyển <span className="text-red-500">*</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => setSelectAll(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                Chọn tất cả ({sourceEnrollments.length})
              </label>
            </div>

            {loadingEnrollments ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-4">
                <Loader2 size={16} className="animate-spin" />
                Đang tải danh sách sinh viên...
              </div>
            ) : sourceEnrollments.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm text-center">
                Lớp nguồn không có sinh viên nào
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto">
                {sourceEnrollments.map((enrollment) => (
                  <label
                    key={enrollment._id}
                    className="flex items-center gap-3 p-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(enrollment.student._id)}
                      onChange={() => handleToggleStudent(enrollment.student._id)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-slate-900">
                        {enrollment.student.fullName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {enrollment.student.studentCode} | {enrollment.student.email}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-2 text-sm text-slate-500 text-right">
              Đã chọn: {selectedStudents.length} sinh viên
            </div>
          </div>

          {/* Close Source Class Option */}
          <div className="mb-6">
            <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100">
              <input
                type="checkbox"
                checked={closeSourceClass}
                onChange={(e) => setCloseSourceClass(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">
                  Đóng lớp nguồn sau khi chuyển
                </div>
                <div className="text-xs text-slate-500">
                  Lớp nguồn sẽ được chuyển sang trạng thái "Đã hủy" nếu không còn sinh viên
                </div>
              </div>
            </label>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !targetClassId || selectedStudents.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang chuyển...
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Chuyển {selectedStudents.length} sinh viên
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
