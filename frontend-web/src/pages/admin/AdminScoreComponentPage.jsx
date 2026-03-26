import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertCircle, Check, Trash2, Plus, Edit2, Save, X } from 'lucide-react';

/**
 * AdminScoreComponentPage - Quản lý công thức tính điểm cho từng môn học
 * Route: /admin/score-components
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const AdminScoreComponentPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [scoreComponent, setScoreComponent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newComponent, setNewComponent] = useState({
    code: '',
    name: '',
    weight: 0,
    description: '',
    isRequired: false,
    order: 0
  });

  // Tải danh sách các môn học
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Tải Score Component khi chọn môn học
  useEffect(() => {
    if (selectedSubject) {
      fetchScoreComponent(selectedSubject._id);
    }
  }, [selectedSubject]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/subjects`);
      setSubjects(response.data);
    } catch (err) {
      setError('Không thể tải danh sách môn học');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScoreComponent = async (subjectId) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/score-components/${subjectId}`
      );
      setScoreComponent(response.data);
      setError(null);
    } catch (err) {
      // Không tìm thấy score component là bình thường
      setScoreComponent(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComponent = () => {
    const components = scoreComponent?.components || [];
    const nextOrder = components.length > 0 
      ? Math.max(...components.map(c => c.order || 0)) + 1
      : 1;
    
    setNewComponent({
      code: '',
      name: '',
      weight: 0,
      description: '',
      isRequired: false,
      order: nextOrder
    });
    setShowAddForm(true);
  };

  const handleSaveNewComponent = async () => {
    if (!newComponent.code || !newComponent.name || newComponent.weight <= 0) {
      setError('Vui lòng nhập đủ thông tin: Code, Name, Weight');
      return;
    }

    try {
      const components = scoreComponent?.components || [];
      const updatedComponents = [...components, newComponent];
      
      // Kiểm tra tổng trọng số
      const totalWeight = updatedComponents.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        setError(`Tổng trọng số phải = 1.0 (hiện tại: ${totalWeight.toFixed(2)})`);
        return;
      }

      await saveScoreComponent(updatedComponents);
      setShowAddForm(false);
      setNewComponent({
        code: '',
        name: '',
        weight: 0,
        description: '',
        isRequired: false,
        order: 0
      });
      setSuccess('Thêm thành phần điểm thành công');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi thêm thành phần điểm: ' + err.message);
    }
  };

  const handleDeleteComponent = async (index) => {
    if (!window.confirm('Bạn chắc chắn muốn xóa thành phần này?')) return;

    try {
      const components = scoreComponent.components.filter((_, i) => i !== index);
      
      // Kiểm tra tổng trọng số
      const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        setError(`Tổng trọng số phải = 1.0 (hiện tại: ${totalWeight.toFixed(2)})`);
        return;
      }

      await saveScoreComponent(components);
      setSuccess('Xóa thành phần điểm thành công');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi xóa thành phần điểm: ' + err.message);
    }
  };

  const handleEditComponent = (index, component) => {
    setEditingComponent({ index, ...component });
  };

  const handleSaveEditComponent = async () => {
    if (!editingComponent.code || !editingComponent.name || editingComponent.weight <= 0) {
      setError('Vui lòng nhập đủ thông tin');
      return;
    }

    try {
      const components = scoreComponent.components.map((c, i) => 
        i === editingComponent.index 
          ? {
              code: editingComponent.code,
              name: editingComponent.name,
              weight: editingComponent.weight,
              description: editingComponent.description,
              isRequired: editingComponent.isRequired,
              order: editingComponent.order
            }
          : c
      );

      // Kiểm tra tổng trọng số
      const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
      if (Math.abs(totalWeight - 1.0) > 0.01) {
        setError(`Tổng trọng số phải = 1.0 (hiện tại: ${totalWeight.toFixed(2)})`);
        return;
      }

      await saveScoreComponent(components);
      setEditingComponent(null);
      setSuccess('Cập nhật thành phần điểm thành công');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Lỗi khi cập nhật thành phần điểm: ' + err.message);
    }
  };

  const saveScoreComponent = async (components) => {
    const subjectId = selectedSubject._id;
    await axios.post(`${API_BASE_URL}/score-components/${subjectId}`, {
      components,
      calculationType: 'WEIGHTED_AVG',
      note: 'Tính trung bình có trọng số'
    });
    await fetchScoreComponent(subjectId);
  };

  const calculateTotalWeight = (components) => {
    return components.reduce((sum, c) => sum + (c.weight || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quản lý Công thức Tính Điểm
          </h1>
          <p className="text-gray-600">
            Cấu hình lại những thành phần điểm và trọng số cho từng môn học
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
            <div className="flex items-center text-red-800">
              <AlertCircle className="w-5 h-5 mr-3" />
              {error}
            </div>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <div className="flex items-center text-green-800">
              <Check className="w-5 h-5 mr-3" />
              {success}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Subject List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">Chọn Môn Học</h2>
              </div>
              <div className="divide-y max-h-96 overflow-y-auto">
                {subjects.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    Không có môn học nào
                  </div>
                ) : (
                  subjects.map((subject) => (
                    <button
                      key={subject._id}
                      onClick={() => setSelectedSubject(subject)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        selectedSubject?._id === subject._id
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        {subject.subjectCode}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {subject.subjectName}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Score Component Details */}
          <div className="lg:col-span-3">
            {!selectedSubject ? (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                Chọn một môn học để xem và chỉnh sửa công thức tính điểm
              </div>
            ) : loading ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="inline-block animate-spin">⏳</div>
                <p className="mt-2 text-gray-600">Đang tải...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow">
                {/* Subject Header */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedSubject.subjectCode}
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {selectedSubject.subjectName}
                    </p>
                  </div>
                </div>

                {/* Components Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Tên Thành Phần
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Trọng Số
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Bắt Buộc
                        </th>
                        <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">
                          Thao Tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {scoreComponent?.components && scoreComponent.components.length > 0 ? (
                        scoreComponent.components.map((component, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            {editingComponent?.index === index ? (
                              <>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    value={editingComponent.code}
                                    onChange={(e) =>
                                      setEditingComponent({
                                        ...editingComponent,
                                        code: e.target.value
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="text"
                                    value={editingComponent.name}
                                    onChange={(e) =>
                                      setEditingComponent({
                                        ...editingComponent,
                                        name: e.target.value
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    value={editingComponent.weight}
                                    onChange={(e) =>
                                      setEditingComponent({
                                        ...editingComponent,
                                        weight: parseFloat(e.target.value)
                                      })
                                    }
                                    className="w-full px-2 py-1 border rounded"
                                  />
                                </td>
                                <td className="px-6 py-4">
                                  <input
                                    type="checkbox"
                                    checked={editingComponent.isRequired}
                                    onChange={(e) =>
                                      setEditingComponent({
                                        ...editingComponent,
                                        isRequired: e.target.checked
                                      })
                                    }
                                    className="w-4 h-4"
                                  />
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={handleSaveEditComponent}
                                    className="inline-flex items-center px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
                                  >
                                    <Save className="w-4 h-4 mr-1" /> Lưu
                                  </button>
                                  <button
                                    onClick={() => setEditingComponent(null)}
                                    className="inline-flex items-center px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500"
                                  >
                                    <X className="w-4 h-4 mr-1" /> Hủy
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4 font-medium text-gray-900">
                                  {component.code}
                                </td>
                                <td className="px-6 py-4 text-gray-700">
                                  {component.name}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                    {(component.weight * 100).toFixed(0)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  {component.isRequired ? (
                                    <span className="text-green-600">✓ Có</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => handleEditComponent(index, component)}
                                    className="inline-flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded mr-2"
                                  >
                                    <Edit2 className="w-4 h-4 mr-1" /> Sửa
                                  </button>
                                  <button
                                    onClick={() => handleDeleteComponent(index)}
                                    className="inline-flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" /> Xóa
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                            Chưa có thành phần điểm nào. Hãy thêm thành phần đầu tiên.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Add Component Form */}
                {showAddForm && (
                  <div className="border-t p-6 bg-gray-50">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Thêm Thành Phần Điểm
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="Code (e.g., PT1, GK)"
                        value={newComponent.code}
                        onChange={(e) =>
                          setNewComponent({ ...newComponent, code: e.target.value })
                        }
                        className="px-4 py-2 border rounded"
                      />
                      <input
                        type="text"
                        placeholder="Tên thành phần"
                        value={newComponent.name}
                        onChange={(e) =>
                          setNewComponent({ ...newComponent, name: e.target.value })
                        }
                        className="px-4 py-2 border rounded"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        placeholder="Trọng số (0-1)"
                        value={newComponent.weight}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            weight: parseFloat(e.target.value) || 0
                          })
                        }
                        className="px-4 py-2 border rounded"
                      />
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newComponent.isRequired}
                          onChange={(e) =>
                            setNewComponent({
                              ...newComponent,
                              isRequired: e.target.checked
                            })
                          }
                          className="w-4 h-4 mr-2"
                        />
                        <span className="text-gray-700">Bắt buộc</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Mô tả (tùy chọn)"
                        value={newComponent.description}
                        onChange={(e) =>
                          setNewComponent({
                            ...newComponent,
                            description: e.target.value
                          })
                        }
                        className="px-4 py-2 border rounded col-span-2"
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSaveNewComponent}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Thêm Thành Phần
                      </button>
                      <button
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer with Add Button and Total */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
                  <div>
                    {scoreComponent?.components && scoreComponent.components.length > 0 && (
                      <div className="text-sm text-gray-700">
                        <span className="font-semibold">Tổng trọng số: </span>
                        <span
                          className={
                            Math.abs(
                              calculateTotalWeight(scoreComponent.components) - 1.0
                            ) <= 0.01
                              ? 'text-green-600'
                              : 'text-red-600'
                          }
                        >
                          {calculateTotalWeight(scoreComponent.components).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  {!showAddForm && (
                    <button
                      onClick={handleAddComponent}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Thêm Thành Phần
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">📖 Hướng dẫn:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Tổng trọng số của tất cả thành phần phải = 100% (1.0)</li>
            <li>• Code (ví dụ: PT1, GK, CK) để xác định loại điểm khi nhập liệu</li>
            <li>• Đánh dấu "Bắt buộc" để yêu cầu nhập thành phần này</li>
            <li>• Hệ thống sẽ tự động tính điểm theo công thức: (Điểm x Trọng Số) + ...</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminScoreComponentPage;
