import { useEffect, useMemo, useState } from 'react';
import semesterService from '../../services/semesterService';
import autoEnrollmentService from '../../services/autoEnrollmentService';

export default function AutoEnrollmentPage() {
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [dryRun, setDryRun] = useState(false);
  const [limit, setLimit] = useState('');
  const [majorCodesInput, setMajorCodesInput] = useState('');
  const [onlyStudentsWithoutEnrollments, setOnlyStudentsWithoutEnrollments] = useState(false);
  const [loadingSemesters, setLoadingSemesters] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadSemesters = async () => {
      setLoadingSemesters(true);
      try {
        const response = await semesterService.getAll({ limit: 200, page: 1 });
        const data = response?.data?.data || [];
        setSemesters(data);

        const current = data.find((item) => item.isCurrent);
        if (current) {
          setSelectedSemesterId(current.id);
        } else if (data.length > 0) {
          setSelectedSemesterId(data[0].id);
        }
      } catch (err) {
        setError('Failed to load semesters');
      } finally {
        setLoadingSemesters(false);
      }
    };

    loadSemesters();
  }, []);

  const selectedSemester = useMemo(
    () => semesters.find((item) => item.id === selectedSemesterId),
    [semesters, selectedSemesterId],
  );

  const handleRun = async () => {
    if (!selectedSemesterId) return;

    setRunning(true);
    setError('');

    try {
      const response = await autoEnrollmentService.trigger(selectedSemesterId, {
        dryRun,
        limit: limit ? Number(limit) : undefined,
        majorCodes: majorCodesInput
          .split(/[\s,;\n]+/)
          .map((item) => item.trim().toUpperCase())
          .filter(Boolean),
        onlyStudentsWithoutEnrollments,
      });
      setResult(response?.data?.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to trigger auto enrollment');
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Auto Enrollment</h1>
        <p className="mt-1 text-sm text-slate-600">
          Assign active students to class sections for the selected semester.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Semester</label>
              <select
                value={selectedSemesterId}
                onChange={(e) => setSelectedSemesterId(e.target.value)}
                disabled={loadingSemesters || running}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {semesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {semester.name} ({semester.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Student limit</label>
              <input
                type="number"
                min="1"
                step="1"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                disabled={running}
                placeholder="Leave empty to process all"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Major codes</label>
              <input
                type="text"
                value={majorCodesInput}
                onChange={(e) => setMajorCodesInput(e.target.value)}
                disabled={running}
                placeholder="SE, CE, CA"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                disabled={running}
              />
              Dry run only
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={onlyStudentsWithoutEnrollments}
                onChange={(e) => setOnlyStudentsWithoutEnrollments(e.target.checked)}
                disabled={running}
              />
              Only students without current-semester enrollments
            </label>

            <button
              onClick={handleRun}
              disabled={!selectedSemesterId || running}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running ? 'Running...' : dryRun ? 'Run dry check' : 'Run auto enrollment'}
            </button>
          </div>
        </div>

        {selectedSemester && (
          <p className="mt-3 text-xs text-slate-500">
            Selected: {selectedSemester.name} - Semester {selectedSemester.semesterNum} - {selectedSemester.academicYear}
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Execution Summary</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SummaryItem label="Students" value={result.summary?.totalStudents || 0} />
              <SummaryItem label="Candidate Students" value={result.summary?.candidateStudents || 0} />
              <SummaryItem label="Enrollments" value={result.summary?.totalEnrollments || 0} />
              <SummaryItem label="Waitlisted" value={result.summary?.waitlisted || 0} />
              <SummaryItem label="Duplicates" value={result.summary?.duplicates || 0} />
              <SummaryItem label="Failed" value={result.summary?.failed || 0} />
              <SummaryItem label="Processed" value={result.summary?.processedStudents || 0} />
              <SummaryItem label="Error Students" value={result.summary?.studentsWithErrors || 0} />
              <SummaryItem label="Runtime" value={`${result.durationMs || 0} ms`} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Mode: {result.dryRun ? 'Dry run' : 'Live run'}
            </p>
            {result.filters && (
              <p className="mt-1 text-xs text-slate-500">Filters: {JSON.stringify(result.filters)}</p>
            )}
          </div>

          {result.preflight && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Preflight</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryItem
                  label="Active Curriculums"
                  value={result.preflight.activeCurriculumCount || 0}
                />
                <SummaryItem
                  label="Open Classes"
                  value={result.preflight.openClassSectionCount || 0}
                />
                <SummaryItem
                  label="Missing Enrollment Year"
                  value={result.preflight.studentsMissingEnrollmentYear || 0}
                />
              </div>

              {(result.preflight.warnings || []).length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <div className="text-sm font-semibold text-amber-800">Warnings</div>
                  <ul className="mt-2 space-y-1 text-sm text-amber-700">
                    {(result.preflight.warnings || []).map((warning) => (
                      <li key={warning}>- {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <JsonBlock
                  title="No Curriculum By Major"
                  value={result.preflight.studentsWithoutCurriculumByMajor || {}}
                />
                <JsonBlock
                  title="No Curriculum By Reason"
                  value={result.preflight.studentsWithoutCurriculumByReason || {}}
                />
              </div>
          </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Execution Logs</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-3 py-2 font-semibold text-slate-700">Student</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Enrolled</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Waitlisted</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Skipped</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Errors</th>
                    <th className="px-3 py-2 font-semibold text-slate-700">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(result.logs || []).map((row) => {
                    const detail =
                      row.errors?.[0] ||
                      row.waitlisted?.[0]?.message ||
                      row.skipped?.[0] ||
                      row.enrolled?.[0]?.subjectCode ||
                      '-';

                    return (
                    <tr key={row.studentId} className="border-b border-slate-100 align-top">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{row.fullName || '-'}</div>
                        <div className="text-xs text-slate-500">{row.studentCode || '-'}</div>
                        {row.curriculumSemesterOrder && (
                          <div className="text-xs text-slate-400">
                            Curriculum semester {row.curriculumSemesterOrder}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-green-700">{row.enrolled?.length || 0}</td>
                      <td className="px-3 py-2 text-amber-700">{row.waitlisted?.length || 0}</td>
                      <td className="px-3 py-2 text-slate-700">{row.skipped?.length || 0}</td>
                      <td className="px-3 py-2 text-red-700">{row.errors?.length || 0}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{detail}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function JsonBlock({ title, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-700">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
