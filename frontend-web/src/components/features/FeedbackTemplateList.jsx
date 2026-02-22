// Feedback Template List - Component for displaying and managing feedback templates
import { useState, useEffect } from 'react';
import feedbackTemplateService from '../../services/feedbackTemplateService';
import FeedbackTemplateFormBuilder from './FeedbackTemplateFormBuilder';

export default function FeedbackTemplateList() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTarget, setFilterTarget] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, [page, filterStatus, filterTarget, searchKeyword]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await feedbackTemplateService.getFeedbackTemplates({
        page,
        limit: 10,
        keyword: searchKeyword,
        status: filterStatus || undefined,
        evaluationTarget: filterTarget || undefined
      });

      // API returns: { success, data: [...], total, totalPages, page }
      const apiResponse = result.data || {};
      setTemplates(Array.isArray(apiResponse.data) ? apiResponse.data : []);
      setTotalPages(apiResponse.totalPages || 1);
      setTotal(apiResponse.total || 0);
    } catch (err) {
      console.error('Error fetching feedback templates:', err);
      setError(err.response?.data?.message || 'Lỗi khi tải danh sách mẫu đánh giá');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setShowModal(true);
  };

  const handleEdit = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleViewDetail = async (template) => {
    try {
      const response = await feedbackTemplateService.getFeedbackTemplate(template._id);
      const detailData = response.data?.data || response.data;
      setDetailTemplate(detailData);
      setShowDetail(true);
    } catch (err) {
      console.error('Error fetching template detail:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mẫu đánh giá này?')) return;

    try {
      await feedbackTemplateService.deleteFeedbackTemplate(id);
      setTemplates(Array.isArray(templates) ? templates.filter(t => t._id !== id) : []);
      alert('Xóa mẫu đánh giá thành công');
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa mẫu đánh giá');
    }
  };

  const handleChangeStatus = async (id, newStatus) => {
    try {
      await feedbackTemplateService.changeStatus(id, newStatus);
      fetchTemplates();
      alert('Cập nhật trạng thái thành công');
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleFilterReset = () => {
    setPage(1);
    setFilterStatus('');
    setFilterTarget('');
    setSearchKeyword('');
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: 'bg-gray-100 text-gray-800',
      active: 'bg-green-100 text-green-800',
      closed: 'bg-red-100 text-red-800',
      archived: 'bg-yellow-100 text-yellow-800'
    };
    const statusLabels = {
      draft: 'Dự thảo',
      active: 'Đang mở',
      closed: 'Đã đóng',
      archived: 'Lưu trữ'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[status]}`}>
        {statusLabels[status]}
      </span>
    );
  };

  const getTargetLabel = (target) => {
    const labels = {
      teacher: 'Giáo viên',
      course: 'Khóa học',
      program: 'Chương trình'
    };
    return labels[target] || target;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Quản lý mẫu đánh giá</h1>
        <button
          onClick={handleCreateNew}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Tạo mẫu mới
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tên hoặc mô tả"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            >
              <option value="">Tất cả</option>
              <option value="draft">Dự thảo</option>
              <option value="active">Đang mở</option>
              <option value="closed">Đã đóng</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đối tượng đánh giá
            </label>
            <select
              value={filterTarget}
              onChange={(e) => {
                setFilterTarget(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2"
            >
              <option value="">Tất cả</option>
              <option value="teacher">Giáo viên</option>
              <option value="course">Khóa học</option>
              <option value="program">Chương trình</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleFilterReset}
              className="w-full px-3 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : templates.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Không tìm thấy mẫu đánh giá nào
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Tên mẫu
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Đối tượng
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Thời gian
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Câu hỏi
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Array.isArray(templates) && templates.length > 0 ? (
                  templates.map(template => (
                  <tr key={template._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {template.templateName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {getTargetLabel(template.evaluationTarget)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>
                        {formatDate(template.feedbackPeriod.startDate)} -{' '}
                        {formatDate(template.feedbackPeriod.endDate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {getStatusBadge(template.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {template.questions?.length || 0} câu
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleViewDetail(template)}
                          className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs"
                        >
                          Xem
                        </button>
                        <button
                          onClick={() => handleEdit(template)}
                          className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 text-xs"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(template._id)}
                          className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs"
                        >
                          Xóa
                        </button>
                        {template.status !== 'archived' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleChangeStatus(template._id, e.target.value);
                              }
                            }}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="">Đổi trạng thái</option>
                            {template.status !== 'draft' && <option value="draft">Dự thảo</option>}
                            {template.status !== 'active' && <option value="active">Đang mở</option>}
                            {template.status !== 'closed' && <option value="closed">Đã đóng</option>}
                            {template.status !== 'archived' && <option value="archived">Lưu trữ</option>}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                      Không tìm thấy mẫu đánh giá nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
            <div className="text-sm text-gray-600">
              Hiển thị {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} trên {total} mục
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Trước
              </button>
              <div className="flex items-center gap-1">
                <span className="px-3 py-2 bg-blue-600 text-white rounded">{page}</span>
              </div>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Tiếp
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <FeedbackTemplateFormBuilder
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedTemplate(null);
          }}
          onSuccess={() => {
            fetchTemplates();
            setShowModal(false);
            setSelectedTemplate(null);
          }}
          templateData={selectedTemplate}
        />
      )}

      {/* Detail Modal */}
      {showDetail && detailTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{detailTemplate.templateName}</h2>
              <button
                onClick={() => {
                  setShowDetail(false);
                  setDetailTemplate(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Đối tượng đánh giá</p>
                  <p className="font-medium">{getTargetLabel(detailTemplate.evaluationTarget)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Trạng thái</p>
                  <p>{getStatusBadge(detailTemplate.status)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Bắt đầu</p>
                  <p className="font-medium">{formatDate(detailTemplate.feedbackPeriod.startDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Kết thúc</p>
                  <p className="font-medium">{formatDate(detailTemplate.feedbackPeriod.endDate)}</p>
                </div>
              </div>

              {detailTemplate.description && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Mô tả</p>
                  <p>{detailTemplate.description}</p>
                </div>
              )}

              <div>
                <p className="font-semibold text-gray-900 mb-3">Các câu hỏi ({detailTemplate.questions.length})</p>
                <div className="space-y-3">
                  {detailTemplate.questions.map((q, idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded border">
                      <p className="font-medium">Câu {idx + 1}: {q.questionText}</p>
                      <p className="text-sm text-gray-600">
                        Loại: {getQuestionTypeLabel(q.questionType)}
                        {q.isRequired && ' (bắt buộc)'}
                      </p>
                      {q.options && q.options.length > 0 && (
                        <div className="mt-2 text-sm text-gray-600">
                          Lựa chọn: {q.options.map(o => o.label).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setDetailTemplate(null);
                  }}
                  className="px-6 py-2 border rounded hover:bg-gray-50"
                >
                  Đóng
                </button>
                <button
                  onClick={() => {
                    setShowDetail(false);
                    setDetailTemplate(null);
                    handleEdit(detailTemplate);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Chỉnh sửa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getQuestionTypeLabel(type) {
  const labels = {
    rating: 'Đánh giá sao',
    text: 'Ý kiến tự luận',
    multipleChoice: 'Chọn một lựa chọn'
  };
  return labels[type] || type;
}
