const https = require('https');
const http = require('http');
const { URL } = require('url');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Extract public_id and resource type from Cloudinary URL
 * @param {string} cloudinaryUrl - Cloudinary URL
 * @returns {Object|null} - {publicId, resourceType, format} or null
 */
const extractCloudinaryInfo = (cloudinaryUrl) => {
  try {
    // Format: https://res.cloudinary.com/{cloud_name}/{resource_type}/{type}/v{version}/{public_id}.{ext}
    const urlParts = cloudinaryUrl.split('/');
    
    // Find 'upload' index
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return null;
    
    // Get resource type (image, video, raw, auto)
    let resourceType = 'auto';
    if (uploadIndex >= 2) {
      const rtPart = urlParts[uploadIndex - 1];
      if (['image', 'video', 'raw'].includes(rtPart)) {
        resourceType = rtPart;
      }
    }
    
    // Get everything after 'upload/' (skip version if exists)
    let pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');
    
    // Remove version if exists (v1234567890)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    
    const pathAfterUploadWithoutVersion = pathAfterUpload;

    // Extract format/extension
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    let format = null;
    let publicId = pathAfterUpload;
    
    if (lastDotIndex !== -1) {
      format = pathAfterUpload.substring(lastDotIndex + 1);
      publicId = pathAfterUpload.substring(0, lastDotIndex);
    }
    
    console.log('Extracted Cloudinary info:', {
      publicId,
      resourceType,
      format,
      pathAfterUploadWithoutVersion,
    });
    
    return {
      publicId,
      resourceType,
      format,
      pathAfterUploadWithoutVersion,
    };
  } catch (error) {
    console.error('Error extracting Cloudinary info:', error);
    return null;
  }
};

/**
 * Generate signed Cloudinary URL with download transformation
 * @param {string} publicId - Cloudinary public_id
 * @param {string} resourceType - Resource type (auto, image, video, raw)
 * @param {string} format - File format/extension
 * @returns {string} - Signed URL
 */
const generateSignedUrl = (publicId, resourceType = 'auto', format = null) => {
  try {
    const options = {
      resource_type: resourceType,
      type: 'upload',
      sign_url: true,
      secure: true,
    };
    
    // Add format if available
    if (format) {
      options.format = format;
    }
    
    const signedUrl = cloudinary.url(publicId, options);
    console.log('Generated signed URL for:', { publicId, resourceType, format });
    
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
};

const getFileExtension = (filename = '') => {
  const normalized = String(filename || '').trim();
  const dotIndex = normalized.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === normalized.length - 1) return null;
  return normalized.substring(dotIndex + 1).toLowerCase();
};

const buildCloudinaryFallbackUrls = (cloudinaryUrl, filename) => {
  const info = extractCloudinaryInfo(cloudinaryUrl);
  if (!info?.publicId && !info?.pathAfterUploadWithoutVersion) {
    return [];
  }

  const candidateUrls = [];
  const extensionFromFilename = getFileExtension(filename);
  const parsedPath = info.pathAfterUploadWithoutVersion || '';

  // Some raw uploads keep extension inside public_id, others split into public_id + format.
  const publicIdCandidates = Array.from(
    new Set(
      [
        info.publicId,
        parsedPath,
        extensionFromFilename && info.publicId
          ? `${info.publicId}.${extensionFromFilename}`
          : null,
      ].filter(Boolean)
    )
  );

  const formatCandidates = Array.from(
    new Set([
      info.format || null,
      extensionFromFilename || null,
      null,
    ])
  );

  const resourceTypeCandidates = Array.from(
    new Set([
      info.resourceType || 'auto',
      'raw',
      'image',
      'auto',
    ])
  );

  resourceTypeCandidates.forEach((resourceType) => {
    publicIdCandidates.forEach((publicId) => {
      formatCandidates.forEach((format) => {
        candidateUrls.push(generateSignedUrl(publicId, resourceType, format));
      });
    });
  });

  // Ensure unique, non-empty candidates
  return Array.from(new Set(candidateUrls.filter(Boolean)));
};

const buildCloudinaryIdFallbackUrls = (cloudinaryId, filename) => {
  const normalizedId = String(cloudinaryId || '').trim();
  if (!normalizedId) return [];

  const extensionFromFilename = getFileExtension(filename);
  const formatCandidates = Array.from(new Set([extensionFromFilename || null, null]));
  const resourceTypeCandidates = ['raw', 'image', 'auto'];
  const candidateUrls = [];

  resourceTypeCandidates.forEach((resourceType) => {
    formatCandidates.forEach((format) => {
      candidateUrls.push(generateSignedUrl(normalizedId, resourceType, format));
    });
  });

  return Array.from(new Set(candidateUrls.filter(Boolean)));
};

/**
 * Proxy download file from Cloudinary with custom filename
 */
const downloadFile = async (req, res) => {
  try {
    const { url, filename, cloudinaryId } = req.query;
    const state = req._proxyState || { triedUrls: new Set(), retryCount: 0, maxRetryCount: 20 };

    if ((!url && !cloudinaryId) || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Missing filename and download source (url/cloudinaryId)',
      });
    }

    let requestUrl = url;
    if (!requestUrl && cloudinaryId) {
      const cloudinaryIdUrls = buildCloudinaryIdFallbackUrls(cloudinaryId, filename);
      requestUrl = cloudinaryIdUrls[0];
    }

    if (!requestUrl) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve download URL from request data',
      });
    }

    console.log('File proxy request:', { url: requestUrl, filename, cloudinaryId });
    state.triedUrls.add(requestUrl);

    // Parse URL to determine protocol
    const parsedUrl = new URL(requestUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    // Options for request
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    };

    // Make request to fetch file
    const proxyRequest = protocol.request(options, (fileResponse) => {
      console.log('Cloudinary response status:', fileResponse.statusCode);
      console.log('Cloudinary response headers:', fileResponse.headers);

      // Handle redirects (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(fileResponse.statusCode)) {
        const redirectUrl = fileResponse.headers.location;
        console.log('Redirecting to:', redirectUrl);

        if (!redirectUrl) {
          return res.status(502).json({
            success: false,
            message: 'Invalid redirect response from file source',
          });
        }

        if (state.retryCount >= state.maxRetryCount || state.triedUrls.has(redirectUrl)) {
          return res.status(502).json({
            success: false,
            message: 'Too many redirects while downloading file',
          });
        }
        state.retryCount += 1;
        
        // Retry with new URL
        return downloadFile(
          { query: { url: redirectUrl, filename, cloudinaryId }, _proxyState: state },
          res
        );
      }

      if (fileResponse.statusCode !== 200) {
        // Cloudinary PDF and some raw files may return 404/401 on the original URL.
        // Retry with signed URLs and alternative resource_type paths before failing.
        if (requestUrl.includes('cloudinary.com') && state.retryCount < state.maxRetryCount) {
          const fallbackUrls = [
            ...buildCloudinaryIdFallbackUrls(cloudinaryId, filename),
            ...buildCloudinaryFallbackUrls(requestUrl, filename),
          ];
          const nextUrl = fallbackUrls.find((candidate) => !state.triedUrls.has(candidate));

          if (nextUrl) {
            state.retryCount += 1;
            console.log('Retrying Cloudinary download with fallback URL:', nextUrl);
            return downloadFile(
              { query: { url: nextUrl, filename, cloudinaryId }, _proxyState: state },
              res
            );
          }
        }

        console.error('Failed to fetch file, status:', fileResponse.statusCode);
        return res.status(fileResponse.statusCode).json({
          success: false,
          message: `Failed to fetch file from URL (status: ${fileResponse.statusCode})`,
        });
      }

      // Set headers for download with custom filename
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Type', fileResponse.headers['content-type'] || 'application/octet-stream');
      
      if (fileResponse.headers['content-length']) {
        res.setHeader('Content-Length', fileResponse.headers['content-length']);
      }

      // Pipe the file stream to response
      fileResponse.pipe(res);
    });

    proxyRequest.on('error', (error) => {
      console.error('Error fetching file from Cloudinary:', error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: 'Failed to download file',
          error: error.message,
        });
      }
    });

    proxyRequest.end();
  } catch (error) {
    console.error('Error proxying file download:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to download file',
        error: error.message,
      });
    }
  }
};

module.exports = {
  downloadFile,
};
