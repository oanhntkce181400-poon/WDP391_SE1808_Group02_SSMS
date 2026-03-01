const announcementService = require('../services/announcement.service');

/**
 * Controller xử lý requests cho Announcement
 */
class AnnouncementController {
  /**
   * POST /api/announcements
   * Tạo announcement mới (Admin/Staff)
   */
  async createAnnouncement(req, res) {
    try {
      // Lấy userId từ token
      const userId = req.auth?.sub;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Lấy data từ request
      const { title, category, content } = req.body;
      const file = req.file; // File từ multer middleware

      // Validate
      if (!title || !title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title is required',
        });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Content is required',
        });
      }

      // Gọi service
      const announcement = await announcementService.createAnnouncement(
        { title, category, content, file },
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        data: announcement,
      });
    } catch (error) {
      console.error('Error in createAnnouncement controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create announcement',
      });
    }
  }

  /**
   * GET /api/announcements
   * Lấy danh sách announcements (Admin/Staff)
   * Query params: page, limit, category, status, search
   */
  async getAnnouncements(req, res) {
    try {
      const { page, limit, category, status, search } = req.query;

      const result = await announcementService.getAnnouncements({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
        status,
        search,
      });

      res.status(200).json({
        success: true,
        message: 'Announcements retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in getAnnouncements controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get announcements',
      });
    }
  }

  /**
   * GET /api/announcements/:id
   * Lấy chi tiết một announcement
   */
  async getAnnouncementById(req, res) {
    try {
      const { id } = req.params;

      const announcement = await announcementService.getAnnouncementById(id);

      res.status(200).json({
        success: true,
        message: 'Announcement retrieved successfully',
        data: announcement,
      });
    } catch (error) {
      console.error('Error in getAnnouncementById controller:', error);
      
      if (error.message === 'Announcement not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get announcement',
      });
    }
  }

  /**
   * PUT /api/announcements/:id
   * Cập nhật announcement (Admin/Staff)
   */
  async updateAnnouncement(req, res) {
    try {
      const { id } = req.params;
      const { title, category, content, existingAttachments } = req.body;
      const file = req.file;

      console.log('🔄 UPDATE ANNOUNCEMENT DEBUG:');
      console.log('ID:', id);
      console.log('Title:', title);
      console.log('Category:', category);
      console.log('Existing Attachments:', existingAttachments);
      console.log('New File:', file ? { name: file.originalname, size: file.size } : 'No file');

      const announcement = await announcementService.updateAnnouncement(id, {
        title,
        category,
        content,
        existingAttachments,
        file,
      });

      res.status(200).json({
        success: true,
        message: 'Announcement updated successfully',
        data: announcement,
      });
    } catch (error) {
      console.error('Error in updateAnnouncement controller:', error);

      if (error.message === 'Announcement not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update announcement',
      });
    }
  }

  /**
   * DELETE /api/announcements/:id
   * Xóa announcement vĩnh viễn (hard delete - Admin/Staff)
   */
  async deleteAnnouncement(req, res) {
    try {
      const { id } = req.params;

      const announcement = await announcementService.deleteAnnouncement(id);

      res.status(200).json({
        success: true,
        message: 'Announcement deleted successfully',
        data: announcement,
      });
    } catch (error) {
      console.error('Error in deleteAnnouncement controller:', error);

      if (error.message === 'Announcement not found') {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete announcement',
      });
    }
  }

  /**
   * GET /api/announcements/active
   * Lấy announcements cho student (chỉ active)
   * Query params: page, limit, category
   */
  async getActiveAnnouncements(req, res) {
    try {
      const { page, limit, category } = req.query;

      const result = await announcementService.getActiveAnnouncementsForStudent({
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
        category,
      });

      res.status(200).json({
        success: true,
        message: 'Active announcements retrieved successfully',
        data: result,
      });
    } catch (error) {
      console.error('Error in getActiveAnnouncements controller:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get active announcements',
      });
    }
  }
}

module.exports = new AnnouncementController();
