/**
 * Cloudinary Helper Functions
 */

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Download file via backend proxy to ensure proper filename
 * @param {string} cloudinaryUrl - Original Cloudinary URL
 * @param {string} fileName - Desired filename for download
 * @param {string} cloudinaryId - Cloudinary public_id (optional but recommended)
 */
export function downloadCloudinaryFile(cloudinaryUrl, fileName, cloudinaryId) {
  // Use backend proxy endpoint to download with proper filename
  const params = new URLSearchParams();
  if (cloudinaryUrl) {
    params.set('url', cloudinaryUrl);
  }
  params.set('filename', fileName);
  if (cloudinaryId) {
    params.set('cloudinaryId', cloudinaryId);
  }

  const proxyUrl = `${API_URL}/api/file-proxy/download?${params.toString()}`;

  // Trigger download via anchor to avoid opener-related browser warnings.
  const link = document.createElement('a');
  link.href = proxyUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
