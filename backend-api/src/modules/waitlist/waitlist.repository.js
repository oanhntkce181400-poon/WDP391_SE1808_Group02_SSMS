// waitlist.repository.js
// Repository cho module waitlist
const Waitlist = require('../../models/waitlist.model');

const waitlistRepo = {
  /**
   * Tìm danh sách waitlist theo query
   */
  async findWaitlist(query = {}, options = {}) {
    const { populate, sort, limit, skip } = options;
    let queryBuilder = Waitlist.find(query);
    
    if (populate) {
      queryBuilder = queryBuilder.populate(populate);
    }
    
    if (sort) {
      queryBuilder = queryBuilder.sort(sort);
    }
    
    if (limit) {
      queryBuilder = queryBuilder.limit(limit);
    }
    
    if (skip) {
      queryBuilder = queryBuilder.skip(skip);
    }
    
    return queryBuilder;
  },

  /**
   * Tìm một bản ghi waitlist
   */
  async findOne(query) {
    return Waitlist.findOne(query);
  },

  /**
   * Tìm waitlist by ID
   */
  async findById(id) {
    return Waitlist.findById(id);
  },

  /**
   * Tạo mới waitlist
   */
  async create(data) {
    return Waitlist.create(data);
  },

  /**
   * Cập nhật status waitlist
   */
  async updateStatus(id, status, extra = {}) {
    return Waitlist.findByIdAndUpdate(
      id,
      { status, ...extra },
      { new: true }
    );
  },

  /**
   * Xóa waitlist
   */
  async delete(id) {
    return Waitlist.findByIdAndDelete(id);
  },

  /**
   * Đếm số lượng waitlist theo query
   */
  async count(query) {
    return Waitlist.countDocuments(query);
  },

  /**
   * Cập nhật nhiều bản ghi
   */
  async updateMany(filter, update) {
    return Waitlist.updateMany(filter, update);
  }
};

module.exports = waitlistRepo;
