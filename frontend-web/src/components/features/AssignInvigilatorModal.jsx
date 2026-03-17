import { useEffect, useMemo, useState } from 'react';

export default function AssignInvigilatorModal({
  isOpen,
  onClose,
  onSave,
  exam,
  teachers,
  loading,
  initialSelectedIds = [],
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [checkConflict, setCheckConflict] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
      setCheckConflict(true);
    }
  }, [isOpen, initialSelectedIds]);

  const selectedTeacherNames = useMemo(() => {
    return teachers
      .filter((teacher) => selectedIds.includes(teacher._id))
      .map((teacher) => teacher.fullName)
      .join(', ');
  }, [teachers, selectedIds]);

  const toggleTeacher = (teacherId) => {
    setSelectedIds((prev) => {
      if (prev.includes(teacherId)) {
        return prev.filter((id) => id !== teacherId);
      }
      return [...prev, teacherId];
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Keep validation simple for students: must select at least one invigilator.
    if (selectedIds.length === 0) {
      return;
    }

    onSave(selectedIds, checkConflict);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assign Invigilator</h3>
          <button
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={onClose}
            disabled={loading}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="text-sm text-slate-700 dark:text-slate-300">
              <p>
                <span className="font-semibold">Exam:</span> {exam?.examCode || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Subject:</span> {exam?.subject?.subjectName || 'N/A'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Select teacher(s)</p>
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2 max-h-72 overflow-y-auto">
                {teachers.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No active teacher found</p>
                ) : (
                  teachers.map((teacher) => (
                    <label
                      key={teacher._id}
                      className="flex items-start gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selectedIds.includes(teacher._id)}
                        onChange={() => toggleTeacher(teacher._id)}
                        disabled={loading}
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {teacher.fullName} ({teacher.teacherCode}) - {teacher.department}
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={checkConflict}
                onChange={(e) => setCheckConflict(e.target.checked)}
                disabled={loading}
              />
              Check teacher schedule conflict (optional)
            </label>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Selected: {selectedIds.length > 0 ? selectedTeacherNames : 'None'}
            </div>

            {selectedIds.length === 0 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Please select at least one teacher.
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#1A237E] text-white disabled:opacity-50"
              disabled={loading || selectedIds.length === 0}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
