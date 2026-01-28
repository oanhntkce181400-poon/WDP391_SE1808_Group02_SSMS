// Tuition Fee Modal - Hiển thị chi tiết môn học + quản lý discount
import { useState } from 'react';
import closeIcon from '../../assets/close.png';

export default function TuitionFeeModal({ isOpen, onClose, tuitionFee, onAddDiscount, onRemoveDiscount }) {
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    name: '',
    type: 'percentage',
    value: 0,
    description: '',
  });

  if (!isOpen || !tuitionFee) return null;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
  };

  const handleSubmitDiscount = () => {
    if (!discountForm.name || !discountForm.value) {
      alert('Vui lòng điền đầy đủ thông tin!');
      return;
    }

    onAddDiscount(tuitionFee._id, {
      ...discountForm,
      value: parseFloat(discountForm.value),
    });

    // Reset form
    setDiscountForm({ name: '', type: 'percentage', value: 0, description: '' });
    setShowDiscountForm(false);
  };

  const handleDeleteDiscount = (discountId) => {
    if (confirm('Bạn có chắc muốn xóa giảm giá này?')) {
      onRemoveDiscount(tuitionFee._id, discountId);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {tuitionFee.cohort} - {tuitionFee.semester}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tuitionFee.majorCode} • {tuitionFee.academicYear}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <img src={closeIcon} alt="Close" className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase mb-1">Học phí gốc</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-200">{formatMoney(tuitionFee.baseTuitionFee)}</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 font-semibold uppercase mb-1">Giảm giá</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-200">-{formatMoney(tuitionFee.totalDiscount)}</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase mb-1">Học phí cuối</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-200">{formatMoney(tuitionFee.finalTuitionFee)}</p>
              </div>
            </div>

            {/* Subjects List */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Danh sách môn học ({tuitionFee.subjects.length})
              </h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase">Mã</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase">Tên môn học</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase">Tín chỉ</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase">Học phí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {tuitionFee.subjects.map((subject) => (
                      <tr key={subject._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white">{subject.subjectCode}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{subject.subjectName}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded">
                            {subject.credits}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-right text-slate-900 dark:text-white">
                          {formatMoney(subject.tuitionFee)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      <td colSpan="2" className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white">Tổng cộng</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-bold rounded">
                          {tuitionFee.totalCredits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-right text-purple-900 dark:text-purple-200">
                        {formatMoney(tuitionFee.baseTuitionFee)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Discounts Management */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Giảm giá</h3>
                <button
                  onClick={() => setShowDiscountForm(!showDiscountForm)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  + Thêm giảm giá
                </button>
              </div>

              {/* Discount Form */}
              {showDiscountForm && (
                <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Tên giảm giá</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="VD: Early Bird, Full Payment"
                        value={discountForm.name}
                        onChange={(e) => setDiscountForm({ ...discountForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Loại</label>
                      <select
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        value={discountForm.type}
                        onChange={(e) => setDiscountForm({ ...discountForm, type: e.target.value })}
                      >
                        <option value="percentage">Phần trăm (%)</option>
                        <option value="fixed">Số tiền cố định (VNĐ)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Giá trị {discountForm.type === 'percentage' ? '(%)' : '(VNĐ)'}
                      </label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder={discountForm.type === 'percentage' ? '5' : '500000'}
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Mô tả</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                        placeholder="Mô tả ngắn"
                        value={discountForm.description}
                        onChange={(e) => setDiscountForm({ ...discountForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSubmitDiscount}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg"
                    >
                      Thêm
                    </button>
                    <button
                      onClick={() => setShowDiscountForm(false)}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* Discounts List */}
              <div className="space-y-3">
                {tuitionFee.discounts && tuitionFee.discounts.length > 0 ? (
                  tuitionFee.discounts.map((discount) => (
                    <div
                      key={discount._id}
                      className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-blue-900 dark:text-blue-200">{discount.name}</span>
                          <span className="px-2 py-0.5 bg-blue-200 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 text-xs font-semibold rounded">
                            {discount.type === 'percentage' ? `${discount.value}%` : formatMoney(discount.value)}
                          </span>
                        </div>
                        {discount.description && (
                          <p className="text-sm text-blue-700 dark:text-blue-300">{discount.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteDiscount(discount._id)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500 dark:text-slate-400 py-8">Chưa có giảm giá nào</p>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
