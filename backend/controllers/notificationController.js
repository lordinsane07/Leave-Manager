const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { asyncHandler } = require('../middleware/authMiddleware');

// ━━━ GET /api/notifications — Get user's notifications with pagination ━━━
const getNotifications = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const filter = { recipient: req.user._id };

    // Optionally filter to unread only
    if (unreadOnly === 'true') {
        filter.isRead = false;
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit, 10)),
        Notification.countDocuments(filter),
        Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    return ApiResponse.ok(res, 'Notifications retrieved', { notifications, unreadCount }, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10)),
    });
});

// ━━━ PATCH /api/notifications/:id/read — Mark single notification as read ━━━
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
        throw ApiError.notFound('Notification not found');
    }

    // Ensure users can only mark their own notifications
    if (notification.recipient.toString() !== req.user._id.toString()) {
        throw ApiError.forbidden('Cannot modify another user\'s notifications');
    }

    notification.isRead = true;
    await notification.save();

    return ApiResponse.ok(res, 'Notification marked as read', { notification });
});

// ━━━ PATCH /api/notifications/read-all — Mark all user's notifications as read ━━━
const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { recipient: req.user._id, isRead: false },
        { isRead: true }
    );

    return ApiResponse.ok(res, 'All notifications marked as read');
});

// ━━━ GET /api/notifications/unread-count — Get count of unread notifications ━━━
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        recipient: req.user._id,
        isRead: false,
    });

    return ApiResponse.ok(res, 'Unread count', { unreadCount: count });
});

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead,
    getUnreadCount,
};
