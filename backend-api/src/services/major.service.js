const Major = require('../models/major.model');

class MajorService {
  async getMajors({ keyword = '', isActive } = {}) {
    const query = {};

    if (typeof isActive === 'boolean') {
      query.isActive = isActive;
    }

    if (keyword) {
      query.$or = [
        { majorCode: { $regex: keyword, $options: 'i' } },
        { majorName: { $regex: keyword, $options: 'i' } },
      ];
    }

    return Major.find(query).sort({ majorName: 1 });
  }
}

module.exports = new MajorService();
