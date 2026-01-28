// Subject Detail Component - Popup modal for viewing subject details (Tasks #XX)
import { useState, useEffect } from 'react';
import menuIcon from '../../assets/menu.png';
import closeIcon from '../../assets/close.png';
import subjectService from '../../services/subjectService';

export default function SubjectDetail({ isOpen, onClose, subject }) {
  const [prerequisites, setPrerequisites] = useState([]);
  const [dependents, setDependents] = useState([]);
  const [loadingPrereqs, setLoadingPrereqs] = useState(false);
  const [loadingDependents, setLoadingDependents] = useState(false);

  // Fetch prerequisites and dependents when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !subject || !subject._id) return;

      // Fetch prerequisites
      try {
        setLoadingPrereqs(true);
        const prereqResponse = await subjectService.getPrerequisites(subject._id);
        setPrerequisites(prereqResponse.data.data || []);
      } catch (error) {
        console.error('Error fetching prerequisites:', error);
        setPrerequisites([]);
      } finally {
        setLoadingPrereqs(false);
      }

      // Fetch all subjects to find which ones have this subject as prerequisite
      try {
        setLoadingDependents(true);
        const subjectsResponse = await subjectService.getSubjects({ limit: 100 });
        const allSubjects = subjectsResponse.data.data || [];

        // Find subjects that have this subject as a prerequisite
        const dependentSubjects = allSubjects
          .filter((item) => {
            if (!item.prerequisites || !Array.isArray(item.prerequisites)) return false;
            return item.prerequisites.some((prereq) => prereq.code === subject.code);
          })
          .map((item) => ({
            code: item.subjectCode || item.code,
            name: item.subjectName || item.name,
          }));

        setDependents(dependentSubjects);
      } catch (error) {
        console.error('Error fetching dependents:', error);
        setDependents([]);
      } finally {
        setLoadingDependents(false);
      }
    };

    fetchData();
  }, [isOpen, subject]);

  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-[#1A237E]/10">
              <img src={menuIcon} alt="Môn học" className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Chi tiết môn học</h3>
          </div>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
            onClick={onClose}
          >
            <img src={closeIcon} alt="Đóng" className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body - Subject Details */}
        <div className="p-6 overflow-y-auto custom-scrollbar max-h-[calc(90vh-200px)]">
          {/* Subject Header */}
          <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                {subject.code} - {subject.name}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Môn học trong chương trình đào tạo
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                {subject.credits} Tín chỉ
              </span>
              {subject.isCommon && (
                <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                  Môn chung
                </span>
              )}
            </div>
          </div>

          {/* Subject Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            {/* Subject Code */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mã môn học
              </label>
              <p className="text-slate-900 dark:text-white font-semibold">{subject.code}</p>
            </div>

            {/* Credits */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Số tín chỉ
              </label>
              <p className="text-slate-900 dark:text-white font-semibold">{subject.credits} tín chỉ</p>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Khoa quản lý
              </label>
              <p className="text-slate-900 dark:text-white font-semibold">
                {subject.department
                  ? (Array.isArray(subject.department)
                      ? subject.department.join(', ')
                      : subject.department)
                  : 'Chưa phân công'}
              </p>
            </div>

            {/* Created At */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ngày tạo
              </label>
              <p className="text-slate-900 dark:text-white font-semibold">
                {subject.createdAt
                  ? new Date(subject.createdAt).toLocaleDateString('vi-VN')
                  : 'N/A'}
              </p>
            </div>

            {/* Updated At */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Cập nhật lần cuối
              </label>
              <p className="text-slate-900 dark:text-white font-semibold">
                {subject.updatedAt
                  ? new Date(subject.updatedAt).toLocaleDateString('vi-VN')
                  : 'N/A'}
              </p>
            </div>

            {/* ID */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mã định danh
              </label>
              <p className="text-slate-900 dark:text-white font-semibold text-sm">
                {subject._id || 'N/A'}
              </p>
            </div>
          </div>

          {/* Prerequisites Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <img src={menuIcon} alt="Prerequisites" className="w-4 h-4" />
                Điều kiện tiên quyết
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mt-1">
                {loadingPrereqs ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1A237E] border-t-transparent"></div>
                  </div>
                ) : prerequisites.length > 0 ? (
                  <div className="space-y-2">
                    {prerequisites.map((prereq, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-lg"
                      >
                        <div className="size-2.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                        <div>
                          <p className="text-[#1A237E] text-[10px] font-bold uppercase tracking-widest">
                            {prereq.code}
                          </p>
                          <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">
                            {prereq.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm italic text-center py-2">
                    Không có điều kiện tiên quyết cho môn học này.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dependents Section - Subjects that require this subject */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <img src={menuIcon} alt="Dependents" className="w-4 h-4" />
                Đã là điều kiện tiên quyết của môn khác
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mt-1">
                {loadingDependents ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#1A237E] border-t-transparent"></div>
                  </div>
                ) : dependents.length > 0 ? (
                  <div className="space-y-2">
                    {dependents.map((dept, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-2 bg-white dark:bg-slate-700 rounded-lg"
                      >
                        <div className="size-2.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <div>
                          <p className="text-[#1A237E] text-[10px] font-bold uppercase tracking-widest">
                            {dept.code}
                          </p>
                          <p className="text-slate-900 dark:text-slate-200 text-sm font-semibold">
                            {dept.name}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 dark:text-slate-400 text-sm italic text-center py-2">
                    Môn học này chưa là điều kiện tiên quyết của môn học nào.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Mô tả
              </label>
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg mt-1">
                <p className="text-slate-600 dark:text-slate-300 text-sm">
                  {subject.description || 'Không có mô tả cho môn học này.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          <button
            className="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-white text-sm font-bold hover:bg-white dark:hover:bg-slate-700 transition-all"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

