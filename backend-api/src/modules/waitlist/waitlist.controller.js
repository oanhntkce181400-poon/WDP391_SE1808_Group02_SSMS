// waitlist.controller.js
// Controller cho module waitlist
const waitlistService = require('./waitlist.service');

const waitlistController = {
  /**
   * POST /waitlist - Join waitlist
   */
  async joinWaitlist(req, res) {
    try {
      const { subjectId, targetSemester, targetAcademicYear } = req.body;
      
      // Validate input
      if (!subjectId) {
        return res.status(400).json({ message: 'Subject ID is required' });
      }
      if (!targetSemester) {
        return res.status(400).json({ message: 'Target semester is required' });
      }
      if (!targetAcademicYear) {
        return res.status(400).json({ message: 'Target academic year is required' });
      }
      
      // Lấy studentId từ req.auth (đã được auth middleware xác thực)
      const studentId = req.auth.sub || req.auth.id || req.auth._id;

      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized - No user ID found' });
      }

      const result = await waitlistService.joinWaitlist(
        studentId,
        subjectId,
        parseInt(targetSemester),
        targetAcademicYear
      );

      res.status(201).json({
        message: 'Joined waitlist successfully',
        data: result
      });
    } catch (error) {
      console.error('[WaitlistController] joinWaitlist error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  /**
   * GET /waitlist/my - Lấy danh sách waitlist của sinh viên hiện tại
   */
  async getMyWaitlist(req, res) {
    try {
      const userId = req.auth.sub || req.auth.id || req.auth._id;
      const result = await waitlistService.getMyWaitlistByUserId(userId);

      res.status(200).json({
        data: result
      });
    } catch (error) {
      console.error('[WaitlistController] getMyWaitlist error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * GET /waitlist - Lấy danh sách waitlist (Admin)
   */
  async getWaitlist(req, res) {
    try {
      const result = await waitlistService.getWaitlist(req.query);

      res.status(200).json(result);
    } catch (error) {
      console.error('[WaitlistController] getWaitlist error:', error);
      res.status(500).json({ message: error.message });
    }
  },

  /**
   * DELETE /waitlist/:id - Hủy waitlist (SV tự hủy)
   */
  async cancelWaitlist(req, res) {
    try {
      const { id } = req.params;
      const userId = req.auth.sub || req.auth.id || req.auth._id;

      // Kiểm tra quyền: chỉ SV đã tạo hoặc Admin mới được hủy
      const waitlist = await require('./waitlist.repository').findById(id);
      if (!waitlist) {
        return res.status(404).json({ message: 'Waitlist not found' });
      }

      // Lấy role từ token
      const userRole = req.auth.role?.toLowerCase() || '';
      const isAdmin = userRole === 'admin' || userRole === 'academic-admin' || userRole === 'staff';

      // Nếu không phải admin, kiểm tra SV có phải người tạo không
      if (!isAdmin) {
        // Tìm Student từ userId
        let student = await require('../../models/student.model').findOne({ userId });
        if (!student) {
          student = await require('../../models/student.model').findOne({ 
            email: (await require('../../models/user.model').findById(userId))?.email 
          });
        }
        
        if (!student || waitlist.student.toString() !== student._id.toString()) {
          return res.status(403).json({ message: 'You can only cancel your own waitlist' });
        }
      }

      const reason = req.body.reason || 'Cancelled by user';
      const result = await waitlistService.cancelWaitlist(id, reason);

      res.status(200).json({
        message: 'Waitlist cancelled successfully',
        data: result
      });
    } catch (error) {
      console.error('[WaitlistController] cancelWaitlist error:', error);
      res.status(400).json({ message: error.message });
    }
  },

  /**
   * DELETE /waitlist/:id/admin - Xóa waitlist (Admin)
   */
  async deleteWaitlist(req, res) {
    try {
      const { id } = req.params;
      const result = await waitlistService.deleteWaitlist(id);

      res.status(200).json({
        message: 'Waitlist deleted successfully',
        data: result
      });
    } catch (error) {
      console.error('[WaitlistController] deleteWaitlist error:', error);
      res.status(400).json({ message: error.message });
    }
  }
};

module.exports = waitlistController;
