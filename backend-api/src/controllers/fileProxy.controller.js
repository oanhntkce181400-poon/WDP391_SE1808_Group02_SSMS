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
    
    // Extract format/extension
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    let format = null;
    let publicId = pathAfterUpload;
    
    if (lastDotIndex !== -1) {
      format = pathAfterUpload.substring(lastDotIndex + 1);
      publicId = pathAfterUpload.substring(0, lastDotIndex);
    }
    
    console.log('Extracted Cloudinary info:', { publicId, resourceType, format });
    
    return { publicId, resourceType, format };
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

/**
 * Proxy download file from Cloudinary with custom filename
 */
const downloadFile = async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Missing url or filename parameter',
      });
    }

    console.log('File proxy request:', { url, filename });

    // Parse URL to determine protocol
    const parsedUrl = new URL(url);
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
        
        // Retry with new URL
        return downloadFile(
          { query: { url: redirectUrl, filename } },
          res
        );
      }

      // Handle 401 Unauthorized - Try with signed URL
      if (fileResponse.statusCode === 401 && url.includes('cloudinary.com')) {
        console.log('Got 401, trying with signed URL...');
        
        // Extract cloudinary info (public_id, resource_type, format)
        const cloudinaryInfo = extractCloudinaryInfo(url);
        
        if (cloudinaryInfo && cloudinaryInfo.publicId) {
          const { publicId, resourceType, format } = cloudinaryInfo;
          const signedUrl = generateSignedUrl(publicId, resourceType, format);
          
          if (signedUrl) {
            console.log('Retrying with signed URL');
            // Retry with signed URL
            return downloadFile(
              { query: { url: signedUrl, filename } },
              res
            );
          }
        }
        
        console.error('Failed to generate signed URL');
        return res.status(401).json({
          success: false,
          message: 'File access denied. Please re-upload the file.',
        });
      }

      if (fileResponse.statusCode !== 200) {
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
