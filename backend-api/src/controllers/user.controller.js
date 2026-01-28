const User = require('../models/user.model');
const Wallet = require('../models/wallet.model');
const { uploadImage, deleteImage } = require('../external/cloudinary.provider');
const { validateImportRows, normalizeCellValue, mapHeaders, findHeaderRowIndex } = require('../utils/importHelper');
const ExcelJS = require('exceljs');

// List users (for IT Admin)
exports.listUsers = async (req, res) => {
  try {
    console.log('listUsers called, req.auth:', req.auth);
    
    // Allow any authenticated user for now (debugging)
    if (!req.auth) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authentication required' });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const filter = {};
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.auth.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user avatar
exports.updateAvatar = async (req, res) => {
  try {
    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatarUrl && user.avatarCloudinaryId) {
      try {
        await deleteImage(user.avatarCloudinaryId);
      } catch (error) {
        console.warn('Failed to delete old avatar:', error.message);
      }
    }

    // Upload new avatar to Cloudinary
    const uploadResult = await uploadImage(req.file.buffer, {
      folder: 'ssms/avatars',
      resource_type: 'auto',
      format: 'webp',
      quality: 'auto',
      width: 400,
      height: 400,
      crop: 'fill',
    });

    // Update user avatar in database
    user.avatarUrl = uploadResult.secure_url;
    user.avatarCloudinaryId = uploadResult.public_id;

    await user.save();

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;
    const user = await User.findById(req.auth.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update allowed fields
    if (fullName) user.fullName = fullName;
    if (email && email !== user.email) {
      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
      user.email = email;
    }

    user.updatedBy = req.auth.id;
    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user by admin (role, status, block/unblock)
exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, status } = req.body;

    // Only allow authenticated users for now (debugging)
    if (!req.auth) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authentication required' });
    }

    console.log('updateUser called, req.auth:', req.auth);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update allowed fields
    if (role && ['admin', 'staff', 'student'].includes(role)) {
      user.role = role;
    }
    if (status && ['active', 'inactive', 'blocked', 'pending'].includes(status)) {
      user.status = status;
    }

    user.updatedBy = req.auth.id || req.auth.sub;
    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('updateUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user by admin
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow authenticated users for now (debugging)
    if (!req.auth) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authentication required' });
    }

    console.log('deleteUser called, req.auth:', req.auth);

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: { id: user._id },
    });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Import users from Excel file
exports.importUsers = async (req, res) => {
  let session;
  let transactionStarted = false;

  try {
    // Check authentication
    if (!req.auth) {
      return res.status(403).json({ success: false, message: 'Forbidden: Authentication required' });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Try to start transaction (will fail on standalone MongoDB)
    try {
      session = await User.startSession();
      session.startTransaction();
      transactionStarted = true;
      console.log('Transaction started');
    } catch (txnErr) {
      console.warn('Transaction not available, proceeding without transaction:', txnErr.message);
      // Continue without transaction
    }

    console.log('Importing users from Excel...');

    // Parse Excel file from buffer
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Invalid Excel file: No worksheet found',
      });
    }

    // Find header row (supports multiple formats)
    const headerRowIndex = findHeaderRowIndex(worksheet);
    console.log('Header row index:', headerRowIndex);

    // Extract headers and data rows
    let headerMap = {}; // Map colNumber -> headerName
    const rows = [];

    worksheet.eachRow((row, rowNumber) => {
      console.log(`Row ${rowNumber}:`, row.values);

      if (rowNumber === headerRowIndex) {
        // Header row - map to standard names and track column positions
        const rawHeaders = [];
        const columnPositions = []; // Track which columns have headers

        row.eachCell((cell, colNumber) => {
          const rawHeader = normalizeCellValue(cell.value);
          rawHeaders.push(rawHeader);
          columnPositions.push(colNumber);
        });

        const mappedHeaders = mapHeaders(rawHeaders);
        console.log('Raw headers:', rawHeaders);
        console.log('Column positions:', columnPositions);
        console.log('Mapped headers:', mappedHeaders);

        // Build map of colNumber -> headerName
        for (let i = 0; i < mappedHeaders.length; i++) {
          headerMap[columnPositions[i]] = mappedHeaders[i];
        }
        console.log('Header map:', headerMap);
      } else if (rowNumber > headerRowIndex) {
        // Data rows (only after header row)
        const rowData = {};
        row.eachCell((cell, colNumber) => {
          const headerName = headerMap[colNumber];
          if (headerName) {
            rowData[headerName] = cell.value;
          }
        });

        console.log(`Data row ${rowNumber}:`, rowData);

        // Only add row if it has at least email
        if (rowData.email) {
          rows.push(rowData);
        }
      }
    });

    console.log(`Parsed ${rows.length} user rows from Excel`);

    // Debug: Log first few rows
    if (rows.length > 0) {
      console.log('First row:', rows[0]);
    }

    // Validate all rows
    const { validRows, invalidRows } = await validateImportRows(rows);

    console.log(`Validation result: ${validRows.length} valid, ${invalidRows.length} invalid`);

    // Import valid rows
    const importedUsers = [];
    const errors = [];

    for (const rowData of validRows) {
      try {
        // Create user
        const newUser = new User({
          email: rowData.email,
          fullName: rowData.fullName,
          role: rowData.role,
          status: rowData.status,
          authProvider: 'local',
          isActive: true,
          createdBy: req.auth.id,
          importSource: 'excel_import',
        });

        const savedUser = await newUser.save(transactionStarted ? { session } : {});

        // Create default wallet for user
        const wallet = new Wallet({
          userId: savedUser._id,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          currency: 'VND',
          status: 'active',
        });

        await wallet.save(transactionStarted ? { session } : {});

        importedUsers.push({
          rowIndex: rowData.rowIndex,
          email: rowData.email,
          fullName: rowData.fullName,
          userId: savedUser._id,
          status: 'success',
        });
      } catch (error) {
        console.error('Error importing row:', error);
        errors.push({
          rowIndex: rowData.rowIndex,
          email: rowData.email,
          error: error.message,
        });
      }
    }

    // Commit transaction if started
    if (transactionStarted) {
      await session.commitTransaction();
      console.log('Transaction committed');
    }
    console.log(`Successfully imported ${importedUsers.length} users`);

    res.json({
      success: true,
      message: 'Users imported successfully',
      data: {
        successCount: importedUsers.length,
        failureCount: invalidRows.length + errors.length,
        importedUsers,
        invalidRows,
        errors,
      },
    });
  } catch (error) {
    if (transactionStarted) {
      await session.abortTransaction();
      console.log('Transaction aborted');
    }
    console.error('Import error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
