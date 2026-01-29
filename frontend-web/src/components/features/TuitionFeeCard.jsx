// Tuition Fee Card Component - Hiển thị card học phí theo kỳ (như Cohorts & Rates)
export default function TuitionFeeCard({ tuitionFee, onViewDetails, onAddDiscount, onRemoveDiscount }) {
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' VNĐ';
  };

  const getStatusBadge = () => {
    switch (tuitionFee.status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs font-semibold rounded uppercase">
            Active
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold rounded uppercase">
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 text-xs font-semibold rounded uppercase">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {tuitionFee.cohort} - {tuitionFee.semester}
              </h3>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tuitionFee.majorCode} • {tuitionFee.academicYear}
            </p>
          </div>
        </div>
      </div>

      {/* Base Tuition */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-1">
          Học phí cơ bản
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900 dark:text-white">
            {formatMoney(tuitionFee.baseTuitionFee)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {tuitionFee.totalCredits} tín chỉ • {tuitionFee.subjects.length} môn học
        </p>
      </div>

      {/* Discounts */}
      {tuitionFee.discounts && tuitionFee.discounts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold mb-2">
            Giảm giá
          </p>
          <div className="flex flex-wrap gap-2">
            {tuitionFee.discounts.map((discount, index) => (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium rounded border border-blue-200 dark:border-blue-800"
              >
                <span>{discount.name}:</span>
                <span className="font-bold">
                  {discount.type === 'percentage' ? `-${discount.value}%` : `-${formatMoney(discount.value)}`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-green-600 dark:text-green-400 font-semibold mt-2">
            Tổng giảm: -{formatMoney(tuitionFee.totalDiscount)}
          </p>
        </div>
      )}

      {/* Final Fee */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Học phí cuối:
          </span>
          <span className="text-xl font-bold text-[#1A237E] dark:text-blue-400">
            {formatMoney(tuitionFee.finalTuitionFee)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={() => onViewDetails(tuitionFee)}
          className="w-full px-4 py-2 bg-[#1A237E] hover:bg-[#0D147A] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Xem chi tiết
        </button>
      </div>

      {/* Notes */}
      {tuitionFee.notes && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-300 italic">
            💡 {tuitionFee.notes}
          </p>
        </div>
      )}
    </div>
  );
}
