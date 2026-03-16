const wishlistService = require('./wishlist.service');

function parseUserId(req) {
  return wishlistService.resolveAuthUserId(req.auth || {});
}

async function createWishlist(req, res) {
  try {
    const { subjectId, semesterId, reason } = req.body;
    if (!subjectId || !semesterId) {
      return res.status(400).json({
        message: 'subjectId and semesterId are required',
      });
    }

    const userId = parseUserId(req);
    const data = await wishlistService.createWishlist(userId, {
      subjectId,
      semesterId,
      reason,
    });

    return res.status(201).json({
      message: 'Wishlist created successfully',
      data,
    });
  } catch (error) {
    console.error('[WishlistController] createWishlist error:', error);
    return res.status(error.statusCode || 400).json({
      message: error.message || 'Failed to create wishlist',
    });
  }
}

async function getMyWishlist(req, res) {
  try {
    const userId = parseUserId(req);
    const data = await wishlistService.getMyWishlist(userId);

    return res.status(200).json({ data });
  } catch (error) {
    console.error('[WishlistController] getMyWishlist error:', error);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to load wishlist',
    });
  }
}

async function getMySemesterBreakdown(req, res) {
  try {
    const userId = parseUserId(req);
    const { semesterId } = req.params;
    const { subjectId } = req.query;

    const data = await wishlistService.getSemesterBreakdownForStudent(
      userId,
      semesterId,
      subjectId || null,
    );

    return res.status(200).json({ data });
  } catch (error) {
    console.error('[WishlistController] getMySemesterBreakdown error:', error);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to load semester wishlist breakdown',
    });
  }
}

async function getWishlistBySemester(req, res) {
  try {
    const { semesterId } = req.params;
    const data = await wishlistService.getWishlistBySemester(semesterId, req.query);

    return res.status(200).json(data);
  } catch (error) {
    console.error('[WishlistController] getWishlistBySemester error:', error);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Failed to load wishlist by semester',
    });
  }
}

async function approveWishlist(req, res) {
  try {
    const { id } = req.params;
    const reviewerUserId = parseUserId(req);
    const data = await wishlistService.approveWishlist(id, reviewerUserId, req.body || {});

    return res.status(200).json({
      message: 'Wishlist approved successfully',
      data,
    });
  } catch (error) {
    console.error('[WishlistController] approveWishlist error:', error);
    return res.status(error.statusCode || 400).json({
      message: error.message || 'Failed to approve wishlist',
    });
  }
}

async function rejectWishlist(req, res) {
  try {
    const { id } = req.params;
    const reviewerUserId = parseUserId(req);
    const data = await wishlistService.rejectWishlist(id, reviewerUserId, req.body || {});

    return res.status(200).json({
      message: 'Wishlist rejected successfully',
      data,
    });
  } catch (error) {
    console.error('[WishlistController] rejectWishlist error:', error);
    return res.status(error.statusCode || 400).json({
      message: error.message || 'Failed to reject wishlist',
    });
  }
}

module.exports = {
  createWishlist,
  getMyWishlist,
  getMySemesterBreakdown,
  getWishlistBySemester,
  approveWishlist,
  rejectWishlist,
};
