import { useState, useRef } from 'react';
import userService from '../../services/userService';

const AvatarUploader = ({ currentAvatar, onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      setCropImage({
        src: e.target.result,
        file: file,
      });
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropChange = (event) => {
    const canvas = canvasRef.current;
    if (!canvas || !cropImage) return;

    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const x = (img.width - size) / 2;
      const y = (img.height - size) / 2;

      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, x, y, size, size, 0, 0, size, size);
    };
    img.src = cropImage.src;
  };

  const handleCropConfirm = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      const croppedFile = new File([blob], 'avatar.webp', { type: 'image/webp' });
      await uploadAvatar(croppedFile);
      setShowCropDialog(false);
      setCropImage(null);
    }, 'image/webp', 0.9);
  };

  const uploadAvatar = async (file) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      await userService.updateAvatar(file, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      });

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      }, 500);
    } catch (error) {
      console.error('Upload failed:', error);
      setIsUploading(false);
      setUploadProgress(0);
      alert('Upload failed: ' + error.message);
    }
  };

  const handleEdit = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Display */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border-4 border-blue-200 flex items-center justify-center overflow-hidden">
          {currentAvatar ? (
            <img
              src={currentAvatar}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <svg
              className="w-20 h-20 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Edit Button */}
        <button
          onClick={handleEdit}
          disabled={isUploading}
          className="absolute bottom-0 right-0 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white p-2 rounded-full shadow-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Upload Progress Bar */}
      {isUploading && (
        <div className="w-48">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Uploading...
            </span>
            <span className="text-sm font-medium text-gray-700">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      {showCropDialog && cropImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Crop Avatar</h3>

            <div className="mb-4 flex justify-center">
              <canvas
                ref={canvasRef}
                className="max-w-sm border-2 border-gray-200 rounded-lg"
              />
            </div>

            <div className="mb-6">
              <img
                src={cropImage.src}
                alt="Crop Preview"
                className="hidden"
                onLoad={handleCropChange}
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCropDialog(false);
                  setCropImage(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Confirm Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarUploader;
