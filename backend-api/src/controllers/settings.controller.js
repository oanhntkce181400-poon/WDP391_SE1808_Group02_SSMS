const SystemSettings = require('../models/systemSettings.model');
const { uploadImage, deleteImage } = require('../external/cloudinary.provider');

// Get system settings
exports.getSettings = async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    
    if (!settings) {
      settings = new SystemSettings();
      await settings.save();
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update system settings
exports.updateSettings = async (req, res) => {
  try {
    // Only allow authenticated users for now (debugging)
    if (!req.auth) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authentication required' });
    }

    console.log('updateSettings called, req.auth:', req.auth);
    console.log('updateSettings req.body:', req.body);
    console.log('updateSettings req.file:', req.file ? 'File provided' : 'No file');

    const { schoolName, schoolCode, contactEmail, contactPhone, address, website, description, primaryColor, secondaryColor } = req.body;

    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    // Update fields
    if (schoolName) settings.schoolName = schoolName;
    if (schoolCode) settings.schoolCode = schoolCode;
    if (contactEmail) settings.contactEmail = contactEmail;
    if (contactPhone) settings.contactPhone = contactPhone;
    if (address) settings.address = address;
    if (website) settings.website = website;
    if (description) settings.description = description;
    if (primaryColor) settings.primaryColor = primaryColor;
    if (secondaryColor) settings.secondaryColor = secondaryColor;

    // Handle logo upload if provided
    if (req.file) {
      console.log('Processing logo upload...');
      try {
        // Delete old logo from Cloudinary if exists
        if (settings.logoCloudinaryId) {
          console.log('Deleting old logo from Cloudinary...');
          try {
            await deleteImage(settings.logoCloudinaryId);
          } catch (error) {
            console.warn('Failed to delete old logo:', error.message);
          }
        }

        // Upload new logo to Cloudinary
        console.log('Uploading new logo to Cloudinary...');
        const uploadResult = await uploadImage(req.file.buffer, {
          folder: 'ssms/logos',
          resource_type: 'auto',
          format: 'png',
          quality: 'auto',
          width: 500,
          height: 500,
          crop: 'fill',
        });

        console.log('Logo uploaded successfully:', uploadResult.public_id);
        settings.logoUrl = uploadResult.secure_url;
        settings.logoCloudinaryId = uploadResult.public_id;
      } catch (uploadError) {
        console.error('Logo upload error:', uploadError.message);
        console.error('Logo upload error stack:', uploadError.stack);
        return res.status(500).json({ 
          success: false, 
          message: 'Logo upload failed: ' + uploadError.message
        });
      }
    }

    console.log('Saving settings to database...');
    settings.updatedBy = req.auth.id || req.auth.sub;
    await settings.save();
    console.log('Settings saved successfully');

    console.log('Sending response...');
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings,
    });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('updateSettings error full:', error.message);
    console.error('updateSettings error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: error.message,
      debug: error.stack 
    });
  }
};
