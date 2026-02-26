const Announcement = require('../models/announcement.model.js');
const { uploadFile } = require('../external/cloudinary.provider');

/**
 * Service xử lý business logic cho Announcement
 */
class AnnouncementService {
  /**
   * Tạo announcement mới
   * @param {Object} announcementData - { title, category, content, file (từ multer) }
   * @param {String} userId - ID của user tạo announcement
   * @returns {Promise<Object>} announcement object
   */
  async createAnnouncement(announcementData, userId) {
    try {
      const { title, category, content, file } = announcementData;

      // Validate required fields
      if (!title || !content) {
        throw new Error('Title and content are required');
      }

      // Tạo object announcement
      const newAnnouncement = {
        title: title.trim(),
        category: category || 'khac',
        content: content.trim(),
        createdBy: userId,
        attachments: [],
      };

      // Nếu có file đính kèm, upload lên Cloudinary
      if (file) {
        const uploadResult = await this.uploadAnnouncementFile(file);
        newAnnouncement.attachments.push(uploadResult);
      }

      // Lưu vào database
      const announcement = await Announcement.create(newAnnouncement);

      // Populate thông tin người tạo
      await announcement.populate('createdBy', 'username email fullName');

      return announcement;
    } catch (error) {
      console.error('Error in createAnnouncement service:', error);
      throw error;
    }
  }

  /**
   * Upload file lên Cloudinary
   * @param {Object} file - File object từ multer
   * @returns {Promise<Object>} - { url, cloudinaryId, fileName, fileSize, mimeType }
   */
  async uploadAnnouncementFile(file) {
    try {
      // Upload file buffer lên Cloudinary
      const uploadResult = await uploadFile(file.buffer, {
        folder: 'ssms/announcements',
        resource_type: 'auto', // Tự động detect loại file (image, raw, video)
        access_mode: 'public', // Public access
        type: 'upload', // Upload type
      });

      return {
        url: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Lấy danh sách announcements (có phân trang, filter)
   * @param {Object} options - { page, limit, category, search }
   * @returns {Promise<Object>} - { announcements, total, page, totalPages }
   */
  async getAnnouncements(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        category,
        search,
      } = options;

      // Build query
      const query = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      // Text search
      if (search && search.trim()) {
        query.$text = { $search: search.trim() };
      }

      // Pagination
      const skip = (page - 1) * limit;

      // Execute query
      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'username email fullName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Announcement.countDocuments(query),
      ]);

      return {
        announcements,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in getAnnouncements service:', error);
      throw error;
    }
  }

  /**
   * Lấy announcement theo ID
   * @param {String} announcementId
   * @returns {Promise<Object>} announcement object
   */
  async getAnnouncementById(announcementId) {
    try {
      const announcement = await Announcement.findOne({
        _id: announcementId,
      }).populate('createdBy', 'username email fullName');

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      return announcement;
    } catch (error) {
      console.error('Error in getAnnouncementById service:', error);
      throw error;
    }
  }

  /**
   * Cập nhật announcement
   * @param {String} announcementId
   * @param {Object} updateData - { title, category, content, file }
   * @returns {Promise<Object>} updated announcement
   */
  async updateAnnouncement(announcementId, updateData) {
    try {
      // Tìm announcement
      const announcement = await Announcement.findOne({
        _id: announcementId,
      });

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      // Update fields
      if (updateData.title) {
        announcement.title = updateData.title.trim();
      }

      if (updateData.category) {
        announcement.category = updateData.category;
      }

      if (updateData.content) {
        announcement.content = updateData.content.trim();
      }

      // Xử lý attachments
      if (updateData.existingAttachments) {
        // Parse existingAttachments nếu là string
        try {
          const existing = typeof updateData.existingAttachments === 'string' 
            ? JSON.parse(updateData.existingAttachments) 
            : updateData.existingAttachments;
          
          announcement.attachments = Array.isArray(existing) ? existing : [];
          console.log('✅ Preserved existing attachments:', announcement.attachments.length, 'file(s)');
        } catch (err) {
          console.error('❌ Error parsing existingAttachments:', err);
          announcement.attachments = [];
        }
      } else {
        // Nếu không có existingAttachments, reset về mảng rỗng
        console.log('⚠️ No existingAttachments, resetting to empty array');
        announcement.attachments = [];
      }

      // Nếu có file mới, upload và thêm vào attachments
      if (updateData.file) {
        console.log('📤 Uploading new file:', updateData.file.originalname);
        const uploadResult = await this.uploadAnnouncementFile(updateData.file);
        announcement.attachments.push(uploadResult);
        console.log('✅ New file uploaded, total attachments:', announcement.attachments.length);
      } else {
        console.log('ℹ️ No new file to upload');
      }

      // Lưu thay đổi
      await announcement.save();

      // Populate và return
      await announcement.populate('createdBy', 'username email fullName');

      return announcement;
    } catch (error) {
      console.error('Error in updateAnnouncement service:', error);
      throw error;
    }
  }

  /**
   * Xóa announcement (hard delete - xóa vĩnh viễn khỏi database)
   * @param {String} announcementId
   * @returns {Promise<Object>} deleted announcement
   */
  async deleteAnnouncement(announcementId) {
    try {
      const announcement = await Announcement.findOne({
        _id: announcementId,
      });

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      // Hard delete - Xóa vĩnh viễn khỏi database
      await Announcement.deleteOne({ _id: announcementId });

      return announcement;
    } catch (error) {
      console.error('Error in deleteAnnouncement service:', error);
      throw error;
    }
  }

  /**
   * Lấy announcements cho student
   * @param {Object} options - { page, limit, category }
   * @returns {Promise<Object>}
   */
  async getActiveAnnouncementsForStudent(options = {}) {
    try {
      const { page = 1, limit = 10, category } = options;

      const query = {};

      if (category && category !== 'all') {
        query.category = category;
      }

      const skip = (page - 1) * limit;

      const [announcements, total] = await Promise.all([
        Announcement.find(query)
          .populate('createdBy', 'username fullName')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Announcement.countDocuments(query),
      ]);

      return {
        announcements,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error in getActiveAnnouncementsForStudent service:', error);
      throw error;
    }
  }
}

module.exports = new AnnouncementService();
