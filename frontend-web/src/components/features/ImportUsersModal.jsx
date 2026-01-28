import React, { useState, useRef } from 'react';
import userService from '../../services/userService';

const ImportUsersModal = ({ isOpen, onClose, onImportSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv', // .csv
      ];

      if (!validTypes.includes(selectedFile.type)) {
        setError('Chỉ chấp nhận file Excel (.xlsx, .xls, .csv)');
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Kích thước file không được vượt quá 5MB');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Vui lòng chọn file');
      return;
    }

    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await userService.importUsers(formData);

      if (response.data && response.data.success) {
        setResult(response.data.data);
        setProgress(100);

        // Call success callback after 2 seconds
        setTimeout(() => {
          if (onImportSuccess) {
            onImportSuccess();
          }
        }, 2000);
      } else {
        setError(response.data?.message || 'Lỗi khi import users');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Lỗi khi import users');
    } finally {
      setLoading(false);
    }
  };

  const downloadErrorLog = () => {
    if (!result) return;

    let csvContent =
      'data:text/csv;charset=utf-8,' + 'Dòng,Email,Họ Tên,Lỗi\n';

    // Add invalid rows
    result.invalidRows.forEach((row) => {
      const errors = row.errors.join('; ');
      csvContent += `${row.rowIndex},"${row.email}","${row.fullName}","${errors}"\n`;
    });

    // Add import errors
    result.errors.forEach((err) => {
      csvContent += `${err.rowIndex},"${err.email}","","${err.error}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `import-error-log-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setFile(null);
    setProgress(0);
    setResult(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Import Users từ Excel</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {!result ? (
            <div>
              {/* File Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chọn file Excel
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".xlsx,.xls,.csv"
                    disabled={loading}
                    className="hidden"
                  />

                  {file ? (
                    <div className="text-gray-700">
                      <svg
                        className="mx-auto h-12 w-12 text-green-500 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <svg
                        className="mx-auto h-12 w-12 mb-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      <p className="font-medium">Click để chọn file hoặc kéo thả</p>
                      <p className="text-sm">Hỗ trợ: Excel (.xlsx, .xls), CSV (.csv)</p>
                    </div>
                  )}
                </div>

                {/* File Requirements */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded p-4 text-sm text-blue-800">
                  <p className="font-medium mb-2">Yêu cầu định dạng file:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Dòng đầu tiên là header: email, fullName, role, status</li>
                    <li>Email: bắt buộc, định dạng hợp lệ</li>
                    <li>fullName: bắt buộc, tối đa 255 ký tự</li>
                    <li>role: admin, staff, hoặc student (mặc định: student)</li>
                    <li>status: active, inactive, blocked, pending (mặc định: active)</li>
                  </ul>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Results */}
              <div className="space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-sm text-green-600">Thành công</p>
                    <p className="text-2xl font-bold text-green-700">
                      {result.successCount || 0}
                    </p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded p-4">
                    <p className="text-sm text-red-600">Thất bại</p>
                    <p className="text-2xl font-bold text-red-700">
                      {result.failureCount || 0}
                    </p>
                  </div>
                </div>

                {/* Success Message */}
                {result.successCount > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded p-4">
                    <p className="text-sm text-green-800">
                      ✅ Đã import thành công {result.successCount} users
                    </p>
                  </div>
                )}

                {/* Error Details Table */}
                {(result.invalidRows?.length > 0 || result.errors?.length > 0) && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">
                      Chi tiết lỗi ({result.failureCount})
                    </h3>
                    <div className="overflow-x-auto bg-gray-50 rounded border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 border-b">
                          <tr>
                            <th className="px-4 py-2 text-left text-gray-700">Dòng</th>
                            <th className="px-4 py-2 text-left text-gray-700">Email</th>
                            <th className="px-4 py-2 text-left text-gray-700">Họ Tên</th>
                            <th className="px-4 py-2 text-left text-gray-700">Lỗi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.invalidRows?.map((row, idx) => (
                            <tr key={`invalid-${idx}`} className="hover:bg-gray-100">
                              <td className="px-4 py-2 text-gray-600">{row.rowIndex}</td>
                              <td className="px-4 py-2 text-gray-600">{row.email}</td>
                              <td className="px-4 py-2 text-gray-600">{row.fullName}</td>
                              <td className="px-4 py-2 text-red-600">
                                {row.errors?.join('; ')}
                              </td>
                            </tr>
                          ))}
                          {result.errors?.map((err, idx) => (
                            <tr key={`error-${idx}`} className="hover:bg-gray-100">
                              <td className="px-4 py-2 text-gray-600">{err.rowIndex}</td>
                              <td className="px-4 py-2 text-gray-600">{err.email}</td>
                              <td className="px-4 py-2 text-gray-600">-</td>
                              <td className="px-4 py-2 text-red-600">{err.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Download Error Log Button */}
                    <button
                      onClick={downloadErrorLog}
                      className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <svg
                        className="h-4 w-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                      Tải file log lỗi
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {loading && (
          <div className="px-6 py-4 bg-gray-50 border-t">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t px-6 py-4 bg-gray-50">
          {result ? (
            <>
              <button
                onClick={() => {
                  setFile(null);
                  setProgress(0);
                  setResult(null);
                  setError(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Import thêm
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm text-sm font-medium hover:bg-blue-700"
              >
                Đóng
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={!file || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow-sm text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Đang xử lý...' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportUsersModal;
