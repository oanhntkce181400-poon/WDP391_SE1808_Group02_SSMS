const roomService = require('../services/room.service');

// Create new room
exports.createRoom = async (req, res) => {
  try {
    // Validate required fields
    const { code, name, type, capacity } = req.body;
    
    if (!code || !name || !type || !capacity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: code, name, type, capacity',
      });
    }

    const room = await roomService.createRoom(req.body);
    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      data: room,
    });
  } catch (error) {
    // Handle specific validation errors
    if (error.message.includes('capacity') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Get all rooms with pagination, filter and sort
exports.getRooms = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      keyword,
      roomType,
      minCapacity,
      maxCapacity,
      sortBy,
      sortOrder
    } = req.query;
    
    const result = await roomService.getRooms({
      page: parseInt(page),
      limit: parseInt(limit),
      keyword,
      roomType,
      minCapacity: minCapacity ? parseInt(minCapacity) : 0,
      maxCapacity: maxCapacity ? parseInt(maxCapacity) : 0,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single room by ID
exports.getRoomById = async (req, res) => {
  try {
    const room = await roomService.getRoomById(req.params.id);
    res.json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// Update room
exports.updateRoom = async (req, res) => {
  try {
    console.log('Update room - ID:', req.params.id);
    console.log('Update room - Data:', req.body);
    const room = await roomService.updateRoom(req.params.id, req.body);
    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room,
    });
  } catch (error) {
    console.error('Update room error:', error);
    // Handle specific errors
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    
    if (error.message.includes('capacity') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Delete room
exports.deleteRoom = async (req, res) => {
  try {
    await roomService.deleteRoom(req.params.id);
    res.json({
      success: true,
      message: 'Room deleted successfully',
    });
  } catch (error) {
    if (error.message === 'Room not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    
    if (error.message.includes('in use')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

// Search rooms
exports.searchRooms = async (req, res) => {
  try {
    const { keyword } = req.query;
    const rooms = await roomService.searchRooms(keyword);
    res.json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
