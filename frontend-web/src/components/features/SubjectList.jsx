// Subject List Component - Displays table of subjects (Tasks #XX)
// Features: Search, Filter, Pagination, Edit/Delete actions
import { useState } from 'react';
import searchIcon from '../../assets/search.png';
import filterIcon from '../../assets/filter.png';
import fileIcon from '../../assets/file.png';
import editIcon from '../../assets/edit.png';
import deleteIcon from '../../assets/delete.png';
import detailIcon from '../../assets/detail.png';
import prerequisiteIcon from '../../assets/menu.png';
import leftChevronIcon from '../../assets/left-chevron.png';
import chevronIcon from '../../assets/chevron.png';
import searchOffIcon from '../../assets/next.png';

export default function SubjectList({
  subjects,
  loading,
  pagination,
  onSearch,
  onFilter,
  onEdit,
  onDelete,
  onView,
  onPrerequisites,
  onPageChange,
  majorCodeToName,
}) {
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch(searchKeyword);
  };

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="w-full flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <form className="flex flex-1 h-11" onSubmit={handleSearch}>
          <div className="flex w-full items-stretch rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="text-slate-400 flex items-center justify-center pl-4">
              <img src={searchIcon} alt="Tìm kiếm" className="w-5 h-5" />
            </div>
            <input
              className="w-full border-none focus:ring-0 bg-transparent text-sm placeholder:text-slate-400 px-3 text-slate-900 dark:text-white"
              placeholder="Tìm kiếm theo mã môn hoặc tên môn..."
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>
        </form>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 px-4 h-11 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            onClick={onFilter}
          >
            <img src={filterIcon} alt="Lọc" className="w-5 h-5" />
            <span>Lọc</span>
          </button>
          <button className="flex items-center gap-2 px-4 h-11 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <img src={fileIcon} alt="Xuất Excel" className="w-5 h-5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Subject Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <th className="px-6 py-4 text-slate-700 dark:text-slate-200 text-[13px] font-bold uppercase tracking-wider">
                Mã môn học
              </th>
              <th className="px-6 py-4 text-slate-700 dark:text-slate-200 text-[13px] font-bold uppercase tracking-wider">
                Tên môn học
              </th>
              <th className="px-6 py-4 text-slate-700 dark:text-slate-200 text-[13px] font-bold uppercase tracking-wider">
                Số tín chỉ
              </th>
              <th className="px-6 py-4 text-slate-700 dark:text-slate-200 text-[13px] font-bold uppercase tracking-wider">
                Học phí
              </th>
              <th className="px-6 py-4 text-slate-700 dark:text-slate-200 text-[13px] font-bold uppercase tracking-wider">
                Khoa quản lý
              </th>
              <th className="px-6 py-4 text-slate-500 dark:text-slate-400 text-[13px] font-bold uppercase tracking-wider text-right">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1A237E] border-t-transparent"></div>
                    <span className="text-slate-500 dark:text-slate-400 text-sm">Đang tải dữ liệu...</span>
                  </div>
                </td>
              </tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <img src={searchOffIcon} alt="Không tìm thấy" className="w-12 h-12 opacity-50" />
                    <span className="text-slate-500 dark:text-slate-400 text-sm">
                      Không tìm thấy môn học nào
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr
                  key={subject.id || subject._id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <td className="px-6 py-5 text-slate-900 dark:text-white text-sm font-semibold">
                    {subject.code}
                  </td>
                  <td className="px-6 py-5 text-slate-600 dark:text-slate-300 text-sm">
                    {subject.name}
                  </td>
                  <td className="px-6 py-5 text-sm">
                    <div className="flex flex-wrap gap-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                        {subject.credits} Tín chỉ
                      </span>
                      {subject.isCommon && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                          Chung
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm">
                    <div className="flex flex-col">
                      <span className="text-slate-900 dark:text-white font-semibold">
                        {subject.tuitionFee ? subject.tuitionFee.toLocaleString('vi-VN') : (subject.credits * 630000).toLocaleString('vi-VN')} VNĐ
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {subject.credits * 630000 === subject.tuitionFee || !subject.tuitionFee ? `${(subject.credits * 630000 / 1000000).toFixed(1)}tr` : 'Tùy chỉnh'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-slate-500 text-sm dark:text-slate-400">
                    {subject.facultyCode 
                      ? majorCodeToName.get(String(subject.facultyCode).trim()) || subject.facultyCode
                      : subject.isCommon
                        ? 'Môn chung cho toàn khoa'
                        : subject.department
                          ? (Array.isArray(subject.department)
                              ? subject.department
                                  .map((code) => majorCodeToName.get(String(code || '').trim()) || code)
                                  .join(', ')
                              : majorCodeToName.get(String(subject.department || '').trim()) || subject.department)
                          : ''}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        className="p-2 text-slate-400 hover:text-[#1A237E] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                        title="Điều kiện tiên quyết"
                        onClick={() => onPrerequisites(subject)}
                      >
                        <img src={prerequisiteIcon} alt="Điều kiện tiên quyết" className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-[#1A237E] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                        title="Xem chi tiết"
                        onClick={() => onView(subject)}
                      >
                        <img src={detailIcon} alt="Xem chi tiết" className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-[#1A237E] hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-all"
                        title="Chỉnh sửa"
                        onClick={() => onEdit(subject)}
                      >
                        <img src={editIcon} alt="Chỉnh sửa" className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-all"
                        title="Xóa"
                        onClick={() => onDelete(subject)}
                      >
                        <img src={deleteIcon} alt="Xóa" className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 0 && (
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Hiển thị <span className="font-bold text-slate-900 dark:text-white">{pagination.currentStart}</span> đến{' '}
            <span className="font-bold text-slate-900 dark:text-white">{pagination.currentEnd}</span> trong số{' '}
            <span className="font-bold text-slate-900 dark:text-white">{pagination.totalItems}</span> môn học
          </p>
          <div className="flex items-center gap-1">
            <button
              className="flex size-9 items-center justify-center rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white transition-colors"
              disabled={pagination.currentPage === 1}
              onClick={() => onPageChange(pagination.currentPage - 1)}
            >
              <img src={leftChevronIcon} alt="Trang trước" className="w-5 h-5" />
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`text-sm font-normal flex size-9 items-center justify-center rounded transition-colors ${
                  page === pagination.currentPage
                    ? 'text-white bg-[#1A237E] shadow-sm'
                    : 'text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="flex size-9 items-center justify-center rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-white transition-colors"
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => onPageChange(pagination.currentPage + 1)}
            >
              <img src={chevronIcon} alt="Trang sau" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
