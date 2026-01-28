/**
 * Example Usage - Student Profile & Avatar Upload Feature
 * 
 * This file demonstrates how to use the new student profile
 * and avatar upload functionality in your application.
 */

// ============================================
// EXAMPLE 1: Using AvatarUploader Component
// ============================================

import React from 'react';
import AvatarUploader from './components/features/AvatarUploader';

function StudentProfileWithAvatarExample() {
  const [student, setStudent] = React.useState(null);

  const handleAvatarUploadSuccess = () => {
    // Called when avatar is successfully uploaded
    console.log('Avatar updated!');
    // Refresh student data from API
    fetchStudentProfile();
  };

  const fetchStudentProfile = async () => {
    try {
      const response = await fetch('/api/users/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStudent(data.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  React.useEffect(() => {
    fetchStudentProfile();
  }, []);

  return (
    <div className="p-8">
      <h1>My Profile</h1>
      
      {student && (
        <>
          {/* Avatar Uploader Component */}
          <AvatarUploader 
            currentAvatar={student.avatarUrl}
            onUploadSuccess={handleAvatarUploadSuccess}
          />
          
          <div className="mt-8">
            <h2>{student.fullName}</h2>
            <p>{student.email}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 2: Using userService Directly
// ============================================

import userService from './services/userService';

async function uploadAvatarExample() {
  try {
    // Get file from input
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) return;

    // Upload with progress tracking
    const response = await userService.updateAvatar(file, (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(`Upload progress: ${percentCompleted}%`);
      
      // Update UI with progress
      updateProgressBar(percentCompleted);
    });

    console.log('Upload successful!', response);
    
    // Refresh avatar in UI
    const profileResponse = await userService.getProfile();
    updateAvatarInUI(profileResponse.data.avatarUrl);

  } catch (error) {
    console.error('Upload failed:', error);
    showErrorMessage(error.message);
  }
}

// ============================================
// EXAMPLE 3: Update User Profile
// ============================================

async function updateUserProfileExample() {
  try {
    const response = await userService.updateProfile({
      fullName: 'Nguyễn Văn An',
      email: 'student@example.com'
    });

    if (response.success) {
      console.log('Profile updated:', response.data);
      showSuccessMessage('Profile updated successfully!');
    }
  } catch (error) {
    console.error('Update failed:', error);
    showErrorMessage(error.message);
  }
}

// ============================================
// EXAMPLE 4: Get User Profile
// ============================================

async function getUserProfileExample() {
  try {
    const response = await userService.getProfile();
    
    if (response.success) {
      const user = response.data;
      console.log('User profile:', {
        name: user.fullName,
        email: user.email,
        avatar: user.avatarUrl,
        role: user.role,
        status: user.status
      });
    }
  } catch (error) {
    console.error('Failed to fetch profile:', error);
  }
}

// ============================================
// EXAMPLE 5: Backend - File Upload Handler
// ============================================

// In your backend controller (user.controller.js):

const userController = {
  // Handle avatar upload with progress
  updateAvatar: async (req, res) => {
    try {
      // File is already processed by Multer middleware
      // And uploaded to Cloudinary
      
      // Check results
      if (uploadResult.secure_url) {
        // Success - avatar is now on Cloudinary
        const avatarUrl = uploadResult.secure_url;
        console.log(`New avatar URL: ${avatarUrl}`);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Avatar upload failed'
      });
    }
  }
};

// ============================================
// EXAMPLE 6: Image Crop Implementation Details
// ============================================

/**
 * How image cropping works in AvatarUploader:
 * 
 * 1. User selects image file
 * 2. FileReader reads file as data URL
 * 3. Crop dialog displays the image
 * 4. User can see the square crop area (centered)
 * 5. Canvas extracts the cropped portion
 * 6. Canvas is converted to WebP blob
 * 7. Blob is wrapped in a File object
 * 8. File is sent to backend via multipart/form-data
 */

// Manual crop example:
function manualImageCropExample() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    // Create square crop from center
    const size = Math.min(img.width, img.height);
    const x = (img.width - size) / 2;
    const y = (img.height - size) / 2;

    // Draw cropped portion onto canvas
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, x, y, size, size, 0, 0, size, size);

    // Convert to blob for upload
    canvas.toBlob((blob) => {
      const file = new File([blob], 'avatar.webp', { type: 'image/webp' });
      uploadFile(file);
    }, 'image/webp', 0.9);
  };
  
  img.src = imageDataUrl; // Set image source
}

// ============================================
// EXAMPLE 7: Error Handling
// ============================================

const errorHandlingExample = {
  handleUploadError: (error) => {
    if (error.response?.status === 400) {
      // Bad request - likely no file
      alert('Please select an image file');
    } else if (error.response?.status === 404) {
      // User not found - shouldn't happen if logged in
      alert('User not found. Please login again.');
    } else if (error.response?.status === 500) {
      // Server error - likely Cloudinary issue
      alert('Failed to upload image. Please try again.');
    } else {
      alert('An error occurred: ' + error.message);
    }
  },

  validateFile: (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select an image.');
      return false;
    }

    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
      return false;
    }

    return true;
  }
};

// ============================================
// EXAMPLE 8: Using with React Hooks
// ============================================

import { useState, useCallback } from 'react';

function useStudentProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userService.getProfile();
      setProfile(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateAvatar = useCallback(async (file) => {
    setLoading(true);
    try {
      await userService.updateAvatar(file, (progress) => {
        console.log(`Upload: ${progress.loaded}/${progress.total}`);
      });
      await fetchProfile(); // Refresh profile
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  return { profile, loading, error, fetchProfile, updateAvatar };
}

// Usage:
function MyProfileComponent() {
  const { profile, loading, error, fetchProfile, updateAvatar } = useStudentProfile();

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>{profile?.fullName}</h1>
      <img src={profile?.avatarUrl} alt="Avatar" />
    </div>
  );
}

// ============================================
// EXAMPLE 9: Cloudinary Integration Details
// ============================================

/**
 * How Cloudinary processes uploads:
 * 
 * 1. Backend receives buffer from Multer
 * 2. Uploads to Cloudinary with options:
 *    - folder: 'ssms/avatars'
 *    - resource_type: 'auto'
 *    - format: 'webp'
 *    - quality: 'auto'
 *    - width: 400
 *    - height: 400
 *    - crop: 'fill'
 * 
 * 3. Cloudinary returns:
 *    - secure_url: HTTPS URL to image
 *    - public_id: Unique identifier
 *    - width, height, format
 * 
 * 4. Backend saves to MongoDB
 * 5. Frontend displays image from secure_url
 */

// ============================================
// EXAMPLE 10: Testing Avatar Upload with cURL
// ============================================

/**
 * Test avatar upload endpoint with cURL:
 * 
 * curl -X PATCH http://localhost:3000/api/users/avatar \
 *   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
 *   -F "avatar=@/path/to/image.jpg"
 * 
 * Response on success:
 * {
 *   "success": true,
 *   "message": "Avatar updated successfully",
 *   "data": {
 *     "avatarUrl": "https://res.cloudinary.com/.../image.webp"
 *   }
 * }
 */

// ============================================
// EXAMPLE 11: Form Upload Integration
// ============================================

function FormUploadExample() {
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    const file = formData.get('avatar');

    try {
      // Manual upload for custom handling
      const uploadFormData = new FormData();
      uploadFormData.append('avatar', file);

      const response = await fetch('/api/users/avatar', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: uploadFormData
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Uploaded:', result.data.avatarUrl);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <input type="file" name="avatar" accept="image/*" required />
      <button type="submit">Upload Avatar</button>
    </form>
  );
}

// ============================================
// EXAMPLE 12: Styling with Tailwind
// ============================================

/**
 * Components use Tailwind CSS classes:
 * 
 * - w-32 h-32: Avatar size (128x128px)
 * - rounded-full: Circular avatar
 * - bg-gradient-to-br: Gradient background
 * - border-4 border-blue-200: Avatar border
 * - absolute bottom-0 right-0: Edit button position
 * - bg-blue-500 hover:bg-blue-600: Button styling
 * - transition-colors: Smooth color transition
 * - w-full h-full: Full width/height fill
 * - object-cover: Image fill without distortion
 * - fixed inset-0: Full screen modal backdrop
 * - z-50: Modal stacking order
 */

export default {
  uploadAvatarExample,
  updateUserProfileExample,
  getUserProfileExample,
  manualImageCropExample,
  errorHandlingExample,
  useStudentProfile,
  FormUploadExample,
  MyProfileComponent
};
