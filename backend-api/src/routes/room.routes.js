const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const roomService = require('../services/room.service');

// Routes for Room CRUD
router.post('/', roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/search', roomController.searchRooms);
router.get('/:id', roomController.getRoomById);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

// Get room usage history
router.get('/:id/usage-history', async (req, res) => {
  try {
    const { id } = req.params;
    const usage = await roomService.getRoomUsageHistory(id);
    return res.status(200).json({ success: true, data: usage });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
