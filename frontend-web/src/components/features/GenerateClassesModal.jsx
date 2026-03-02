import { useState, useEffect } from "react";
import { X, BookOpen, Plus, AlertCircle, CheckCircle, GraduationCap } from "lucide-react";
import curriculumService from "../../services/curriculumService";
import classService from "../../services/classService";

export default function GenerateClassesModal({ onClose, onSuccess }) {
  const [curriculums, setCurriculums] = useState([]);
  const [selectedCurriculum, setSelectedCurriculum] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Fetch curriculums
  useEffect(() => {
    curriculumService.getCurriculums({ limit: 100 })
      .then(r => {
        console.log('Curriculums API response:', r.data);
        setCurriculums(r.data.data || [])
      })
      .catch(() => {});
  }, []);

  // Fetch semesters when curriculum selected
  useEffect(() => {
    if (!selectedCurriculum) {
      setSemesters([]);
      setSelectedSemester("");
      setAcademicYear("");
      return;
    }
    
    // Auto-fill academic year from selected curriculum
    const selectedCur = curriculums.find(c => c._id === selectedCurriculum);
    if (selectedCur?.academicYear) {
      setAcademicYear(selectedCur.academicYear);
    }
    
    // Use semesters from curriculum if available, otherwise fetch from API
    if (selectedCur?.semesters && selectedCur.semesters.length > 0) {
      console.log('Using embedded semesters from curriculum:', selectedCur.semesters);
      setSemesters(selectedCur.semesters);
    } else {
      console.log('Fetching semesters from API for:', selectedCurriculum);
      curriculumService.getSemesters(selectedCurriculum)
        .then(r => {
          console.log('Semesters API response:', r?.data);
          setSemesters(r?.data?.data || []);
        })
        .catch(err => console.error('Error fetching semesters:', err));
    }
  }, [selectedCurriculum]);

  // Fetch subjects when semester selected
  useEffect(() => {
    if (!selectedCurriculum || !selectedSemester) {
      setSubjects([]);
      return;
    }
    setLoading(true);
    
    console.log('selectedSemester:', selectedSemester, 'type:', typeof selectedSemester);
    console.log('semesters:', semesters);
    
    // Find semester - check both id and semesterOrder fields
    const semesterData = semesters.find(s => {
      console.log('comparing:', s.id, s.semesterOrder, 'with', selectedSemester);
      return s.id == selectedSemester || s.semesterOrder == selectedSemester || s._id === selectedSemester;
    });
    
    if (semesterData?.courses && semesterData.courses.length > 0) {
      console.log('Using embedded courses from semester:', JSON.stringify(semesterData.courses, null, 2));
      setSubjects(semesterData.courses);
      setLoading(false);
      return;
    }
    
    // Fallback to API if no embedded data
    console.log('No embedded courses, using API:', selectedCurriculum, selectedSemester);
    curriculumService.getSubjectsBySemester(selectedCurriculum, selectedSemester)
      .then(r => {
        console.log('Subjects API response:', r?.data);
        setSubjects(r?.data?.data || []);
      })
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false));
  }, [selectedCurriculum, selectedSemester, semesters]);

  const handleCreate = async () => {
    if (!selectedCurriculum || !selectedSemester || !academicYear) {
      setError("Vui lòng chọn đầy đủ thông tin");
      return;
    }

    if (subjects.length === 0) {
      setError("Không có môn học nào trong học kỳ này");
      return;
    }

    setCreating(true);
    setError(null);
    setResult(null);

    try {
      const classes = subjects.map(s => {
        // Handle different data structures
        const subjectId = s.subject?._id || s.subjectId || s.subject;
        return {
          subjectId,
          semester: parseInt(selectedSemester, 10),
          academicYear,
          maxCapacity: 50,
        };
      });

      console.log('Creating classes with data:', JSON.stringify(classes, null, 2));
      const res = await classService.bulkCreate(classes);
      setResult(res.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error creating classes:', err);
      setError(err?.response?.data?.message || "Tạo lớp thất bại");
    } finally {
      setCreating(false);
    }
  };

  const getCurrentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}/${year + 1}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <GraduationCap className="text-indigo-600" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Tạo lớp từ khung chương trình</h2>
              <p className="text-sm text-slate-500">Tạo nhiều lớp học phần cùng lúc</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Chọn khung chương trình */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Khung chương trình <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCurriculum}
              onChange={(e) => {
                setSelectedCurriculum(e.target.value);
                setSelectedSemester("");
                setSubjects([]);
              }}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
            >
              <option value="">-- Chọn khung chương trình --</option>
              {curriculums.map(c => (
                <option key={c._id} value={c._id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Chọn học kỳ */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Học kỳ <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={!selectedCurriculum}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white disabled:bg-slate-100"
              >
                <option value="">-- Chọn học kỳ --</option>
                {semesters.map(s => (
                  <option key={s._id} value={s.id || s.semesterOrder || s.semester}>
                    {s.name || `Học kỳ ${s.id || s.semesterOrder || s.semester}`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Năm học <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder={getCurrentAcademicYear()}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>

          {/* Danh sách môn học */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Môn học trong học kỳ ({subjects.length} môn)
            </label>
            {loading ? (
              <div className="text-center py-4 text-slate-500">Đang tải...</div>
            ) : subjects.length === 0 ? (
              <div className="text-center py-4 text-slate-500">
                {selectedCurriculum && selectedSemester ? "Không có môn học" : "Vui lòng chọn CT và học kỳ"}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Mã môn</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Tên môn</th>
                      <th className="px-3 py-2 text-center font-medium text-slate-600">TC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, idx) => (
                      <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">
                          {s.subject?.subjectCode || s.subjectCode || s.code || s.subject?._id?.substring(0, 8) || '-'}
                        </td>
                        <td className="px-3 py-2">
                          {s.subject?.subjectName || s.subjectName || s.name || '-'}
                        </td>
                        <td className="px-3 py-2 text-center">{s.credits || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-700 text-sm mb-4">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                <CheckCircle size={16} />
                {result.message}
              </div>
              {result.data?.success?.length > 0 && (
                <div className="text-sm text-green-600 mb-1">
                  ✅ Tạo thành công: {result.data.success.length} lớp
                </div>
              )}
              {result.data?.failed?.length > 0 && (
                <div className="text-sm text-red-600">
                  ❌ Thất bại: {result.data.failed.length} lớp
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Đóng
          </button>
          <button
            onClick={handleCreate}
            disabled={!selectedCurriculum || !selectedSemester || !academicYear || subjects.length === 0 || creating}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {creating ? (
              <>Đang tạo...</>
            ) : (
              <>
                <Plus size={16} />
                Tạo {subjects.length} lớp học phần
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
