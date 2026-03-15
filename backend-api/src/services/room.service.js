const Room = require('../models/room.model');
const Schedule = require('../models/schedule.model');
const Semester = require('../models/semester.model');

const ACTIVE_CLASS_SECTION_STATUSES = ['scheduled', 'published', 'locked', 'active'];

async function buildRoomUsageMap(roomIds = []) {
  if (!Array.isArray(roomIds) || roomIds.length === 0) {
    return new Map();
  }

  const currentSemester = await Semester.findOne({ isCurrent: true })
    .select('semesterNum academicYear')
    .lean();

  const classSectionMatch = {
    'classSection.status': { $in: ACTIVE_CLASS_SECTION_STATUSES },
  };

  if (currentSemester) {
    classSectionMatch['classSection.semester'] = currentSemester.semesterNum;
    classSectionMatch['classSection.academicYear'] = currentSemester.academicYear;
  }

  const usageRows = await Schedule.aggregate([
    {
      $match: {
        room: { $in: roomIds },
        status: 'active',
      },
    },
    {
      $lookup: {
        from: 'classsections',
        localField: 'classSection',
        foreignField: '_id',
        as: 'classSection',
      },
    },
    { $unwind: '$classSection' },
    { $match: classSectionMatch },
    {
      $group: {
        _id: {
          room: '$room',
          classSection: '$classSection._id',
        },
        classCode: { $first: '$classSection.classCode' },
        currentEnrollment: { $first: '$classSection.currentEnrollment' },
        maxCapacity: { $first: '$classSection.maxCapacity' },
      },
    },
    {
      $group: {
        _id: '$_id.room',
        activeClassCount: { $sum: 1 },
        totalCurrentEnrollment: { $sum: '$currentEnrollment' },
        totalSeatCapacity: { $sum: '$maxCapacity' },
        classCodes: { $push: '$classCode' },
      },
    },
  ]);

  return new Map(usageRows.map((row) => [String(row._id), row]));
}

function attachUsageToRoom(room, usageMap) {
  const roomData = room?.toObject ? room.toObject() : { ...room };
  const usage = usageMap.get(String(roomData._id)) || null;
  const currentSemesterClassCount = Number(usage?.activeClassCount || 0);
  const currentSemesterEnrollmentCount = Number(usage?.totalCurrentEnrollment || 0);
  const currentSemesterSeatCapacity = Number(usage?.totalSeatCapacity || 0);
  const currentSemesterOccupancyRate =
    currentSemesterSeatCapacity > 0
      ? Math.round((currentSemesterEnrollmentCount / currentSemesterSeatCapacity) * 100)
      : 0;

  return {
    ...roomData,
    operationalStatus:
      roomData.status === 'occupied' || currentSemesterEnrollmentCount > 0 ? 'occupied' : 'available',
    currentSemesterClassCount,
    currentSemesterEnrollmentCount,
    currentSemesterSeatCapacity,
    currentSemesterOccupancyRate,
    currentSemesterClassCodes: usage?.classCodes || [],
  };
}

class RoomService {
  // Create new room with validation
  async createRoom(data) {
    try {
      // Business Rule: Capacity must be greater than 0
      if (!data.capacity || data.capacity <= 0) {
        throw new Error('Room capacity must be a positive integer');
      }

      // Business Rule: Room code must be unique
      const existingRoom = await Room.findOne({ roomCode: data.code });
      if (existingRoom) {
        throw new Error('Room code already exists');
      }

      const room = new Room({
        roomCode: data.code,
        roomName: data.name,
        roomType: data.type,
        capacity: data.capacity,
        status: data.status || 'available',
      });
      
      await room.save();
      return room;
    } catch (error) {
      throw error;
    }
  }

  // Get all rooms with pagination, filter and sort
  async getRooms({ 
    page = 1, 
    limit = 10, 
    keyword = '', 
    roomType = '', 
    minCapacity = 0,
    maxCapacity = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    try {
      // Build query with multiple filter criteria
      const query = {};

      // Keyword search (room code, name, type)
      if (keyword) {
        query.$or = [
          { roomCode: { $regex: keyword, $options: 'i' } },
          { roomName: { $regex: keyword, $options: 'i' } },
          { roomType: { $regex: keyword, $options: 'i' } },
        ];
      }

      // Filter by room type
      if (roomType) {
        query.roomType = roomType;
      }

      // Filter by capacity range
      if (minCapacity > 0 || maxCapacity > 0) {
        query.capacity = {};
        if (minCapacity > 0) {
          query.capacity.$gte = minCapacity;
        }
        if (maxCapacity > 0) {
          query.capacity.$lte = maxCapacity;
        }
      }

      // Build sort options
      const sortOptions = {};
      const validSortFields = ['roomCode', 'roomName', 'capacity', 'createdAt'];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      sortOptions[sortField] = sortOrder === 'asc' ? 1 : -1;

      const rooms = await Room.find(query)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Room.countDocuments(query);
      const usageMap = await buildRoomUsageMap(rooms.map((room) => room._id));

      return {
        data: rooms.map((room) => attachUsageToRoom(room, usageMap)),
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      throw error;
    }
  }

  // Get single room by ID
  async getRoomById(id) {
    try {
      const room = await Room.findById(id);
      if (!room) {
        throw new Error('Room not found');
      }
      const usageMap = await buildRoomUsageMap([room._id]);
      return attachUsageToRoom(room, usageMap);
    } catch (error) {
      throw error;
    }
  }

  // Update room with validation
  async updateRoom(id, data) {
    try {
      console.log('RoomService.updateRoom - ID:', id);
      console.log('RoomService.updateRoom - Data:', data);
      
      // Check if room exists
      const existingRoom = await Room.findById(id);
      if (!existingRoom) {
        throw new Error('Room not found');
      }
      
      console.log('Existing room:', existingRoom);

      // Business Rule: Capacity must be greater than 0
      if (data.capacity !== undefined && data.capacity <= 0) {
        throw new Error('Room capacity must be a positive integer');
      }

      // Business Rule: Room code must be unique (if changed)
      if (data.code && data.code !== existingRoom.roomCode) {
        const duplicateRoom = await Room.findOne({ roomCode: data.code });
        if (duplicateRoom) {
          throw new Error('Room code already exists');
        }
      }

      const updateData = {};
      if (data.code !== undefined) updateData.roomCode = data.code;
      if (data.name !== undefined) updateData.roomName = data.name;
      if (data.type !== undefined) updateData.roomType = data.type;
      if (data.capacity !== undefined) updateData.capacity = data.capacity;
      if (data.status !== undefined) updateData.status = data.status;
      
      console.log('Update data:', updateData);

      const room = await Room.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      });
      
      console.log('Updated room:', room);

      return room;
    } catch (error) {
      throw error;
    }
  }

  // Delete room with business rule check
  async deleteRoom(id) {
    try {
      const room = await Room.findById(id);
      if (!room) {
        throw new Error('Room not found');
      }

      // Business Rule: Check if room is currently in use
      // TODO: Add logic to check if room has active classes/schedules
      // For now, we'll allow deletion
      // const isInUse = await this.checkRoomInUse(id);
      // if (isInUse) {
      //   throw new Error('Cannot delete room that is currently in use');
      // }

      await Room.findByIdAndDelete(id);
      return room;
    } catch (error) {
      throw error;
    }
  }

  // Search rooms
  async searchRooms(keyword) {
    try {
      const rooms = await Room.find({
        $or: [
          { roomCode: { $regex: keyword, $options: 'i' } },
          { roomName: { $regex: keyword, $options: 'i' } },
          { roomType: { $regex: keyword, $options: 'i' } },
        ],
      }).sort({ roomCode: 1 });

      return rooms;
    } catch (error) {
      throw error;
    }
  }

  // Get room usage history
  async getRoomUsageHistory(roomId) {
    try {
      const ClassSection = require('../models/classSection.model');
      
      const classSections = await ClassSection.find({ room: roomId })
        .populate('subject', 'subjectCode subjectName')
        .populate('lecturer', 'fullName')
        .populate('semester', 'name academicYear')
        .sort({ 'schedule.startTime': -1 })
        .lean();

      return classSections.map(cs => ({
        classSectionId: cs._id,
        classCode: cs.classCode,
        subject: cs.subject ? {
          subjectCode: cs.subject.subjectCode,
          subjectName: cs.subject.subjectName
        } : null,
        lecturer: cs.lecturer ? {
          fullName: cs.lecturer.fullName
        } : null,
        semester: cs.semester ? {
          name: cs.semester.name,
          academicYear: cs.semester.academicYear
        } : null,
        schedule: cs.schedule,
        studentCount: cs.enrolledStudents?.length || 0,
        maxCapacity: cs.maxCapacity,
        status: cs.status
      }));
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoomService();
