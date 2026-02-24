import api from './api';

export const authService = {
    login: (credentials) => api.post('/auth/login', credentials),
    register: (userData) => api.post('/auth/register', userData),
    verifyOTP: (data) => api.post('/auth/verify-otp', data),
    resendOTP: (data) => api.post('/auth/resend-otp', data),
    googleAuth: (data) => api.post('/auth/google', data),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    refresh: () => api.post('/auth/refresh'),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    changePassword: (data) => api.post('/auth/change-password', data),
};

export const leaveService = {
    apply: (leaveData) => api.post('/leaves', leaveData),
    getAll: (params) => api.get('/leaves', { params }),
    getById: (id) => api.get(`/leaves/${id}`),
    updateStatus: (id, data) => api.patch(`/leaves/${id}/status`, data),
    cancel: (id) => api.patch(`/leaves/${id}/cancel`),
};

export const userService = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    updateProfile: (data) => api.put('/users/profile', data),
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post('/users/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    assignRole: (id, data) => api.patch(`/users/${id}/role`, data),
    deactivate: (id) => api.patch(`/users/${id}/deactivate`),
    assignManager: (id, data) => api.put(`/users/${id}/manager`, data),
    assignDepartment: (id, data) => api.patch(`/users/${id}/department`, data),
};

export const departmentService = {
    getAll: (params) => api.get('/departments', { params }),
    getById: (id) => api.get(`/departments/${id}`),
    create: (data) => api.post('/departments', data),
    update: (id, data) => api.put(`/departments/${id}`, data),
    delete: (id) => api.delete(`/departments/${id}`),
};

export const analyticsService = {
    getOverview: () => api.get('/analytics/overview'),
    getLeaveDistribution: (params) => api.get('/analytics/leave-distribution', { params }),
    getMonthlyTrend: () => api.get('/analytics/monthly-trend'),
    getDepartmentComparison: () => api.get('/analytics/department-comparison'),
    getTeamAnalytics: () => api.get('/analytics/team'),
};

export const notificationService = {
    getAll: (params) => api.get('/notifications', { params }),
    markAsRead: (id) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.patch('/notifications/read-all'),
    getUnreadCount: () => api.get('/notifications/unread-count'),
};

export const holidayService = {
    getAll: (params) => api.get('/holidays', { params }),
    create: (data) => api.post('/holidays', data),
    update: (id, data) => api.put(`/holidays/${id}`, data),
    delete: (id) => api.delete(`/holidays/${id}`),
};

export const aiService = {
    getLeaveAdvice: (data) => api.post('/ai/leave-advice', data),
    getBurnoutScore: (employeeId) => api.get(`/ai/burnout/${employeeId}`),
    getTeamBurnout: (managerId) => api.get(`/ai/burnout/team/${managerId}`),
    parseLeave: (data) => api.post('/ai/parse-leave', data),
    getRejectionReason: (data) => api.post('/ai/rejection-reason', data),
    getSuggestions: (employeeId) => api.get(`/ai/suggestions/${employeeId}`),
    getPredictions: (params) => api.get('/ai/predictions', { params }),
};

export const auditService = {
    getAll: (params) => api.get('/audit', { params }),
    getById: (id) => api.get(`/audit/${id}`),
    export: (params) => api.get('/audit/export', { params }),
};

export const reimbursementService = {
    submit: (data) => api.post('/reimbursements', data),
    getAll: (params) => api.get('/reimbursements', { params }),
    getById: (id) => api.get(`/reimbursements/${id}`),
    updateStatus: (id, data) => api.patch(`/reimbursements/${id}/status`, data),
    cancel: (id) => api.patch(`/reimbursements/${id}/cancel`),
    getStats: () => api.get('/reimbursements/stats'),
};

