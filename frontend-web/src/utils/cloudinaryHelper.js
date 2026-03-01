/**
 * Cloudinary Helper Functions
 */

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Download file via backend proxy to ensure proper filename
 * @param {string} cloudinaryUrl - Original Cloudinary URL
 * @param {string} fileName - Desired filename for download
 */
export function downloadCloudinaryFile(cloudinaryUrl, fileName) {
  // Use backend proxy endpoint to download with proper filename
  const proxyUrl = `${API_URL}/api/file-proxy/download?url=${encodeURIComponent(cloudinaryUrl)}&filename=${encodeURIComponent(fileName)}`;
  
  // Open in new window/tab - browser will handle the download
  window.open(proxyUrl, '_blank');
}
