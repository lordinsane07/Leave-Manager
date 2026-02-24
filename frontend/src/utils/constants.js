// ━━━ Role constants ━━━
export const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    EMPLOYEE: 'employee',
};

// ━━━ Leave type constants ━━━
export const LEAVE_TYPES = {
    ANNUAL: 'annual',
    SICK: 'sick',
    PERSONAL: 'personal',
    MATERNITY: 'maternity',
    PATERNITY: 'paternity',
};

// ━━━ Leave type display labels ━━━
export const LEAVE_TYPE_LABELS = {
    annual: 'Annual Leave',
    sick: 'Sick Leave',
    personal: 'Personal Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
};

// ━━━ Leave type colors for charts and badges ━━━
export const LEAVE_TYPE_COLORS = {
    annual: '#E85D04',
    sick: '#C1121F',
    personal: '#1B6CA8',
    maternity: '#2D6A4F',
    paternity: '#7B6D8D',
};

// ━━━ Leave status constants ━━━
export const STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

// ━━━ Socket event names ━━━
export const SOCKET_EVENTS = {
    LEAVE_SUBMITTED: 'leave:submitted',
    LEAVE_APPROVED: 'leave:approved',
    LEAVE_REJECTED: 'leave:rejected',
};

// ━━━ Burnout categories ━━━
export const BURNOUT_CATEGORIES = {
    LOW: { label: 'Low', color: '#2D6A4F', min: 0, max: 30 },
    MODERATE: { label: 'Moderate', color: '#F4A261', min: 31, max: 60 },
    HIGH: { label: 'High', color: '#E85D04', min: 61, max: 80 },
    CRITICAL: { label: 'Critical', color: '#C1121F', min: 81, max: 100 },
};

// ━━━ API base URL ━━━
export const API_BASE_URL = '/api';

// ━━━ Pagination defaults ━━━
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// ━━━ Navigation items per role ━━━
export const NAV_ITEMS = {
    employee: [
        { label: 'Dashboard', path: '/dashboard', icon: 'home' },
        { label: 'Apply Leave', path: '/apply-leave', icon: 'plus' },
        { label: 'Leave History', path: '/leave-history', icon: 'clock' },
        { label: 'Reimbursements', path: '/reimbursements', icon: 'receipt' },
        { label: 'AI Insights', path: '/ai-insights', icon: 'sparkle' },
        { label: 'Profile', path: '/profile', icon: 'user' },
    ],
    manager: [
        { label: 'Dashboard', path: '/dashboard', icon: 'home' },
        { label: 'Apply Leave', path: '/apply-leave', icon: 'plus' },
        { label: 'My Leaves', path: '/my-leaves', icon: 'briefcase' },
        { label: 'Leave Requests', path: '/leave-history', icon: 'inbox' },
        { label: 'Reimbursements', path: '/reimbursements', icon: 'receipt' },
        { label: 'AI Insights', path: '/ai-insights', icon: 'sparkle' },
        { label: 'Profile', path: '/profile', icon: 'user' },
    ],
    admin: [
        { label: 'Dashboard', path: '/dashboard', icon: 'home' },
        { label: 'Users', path: '/admin/users', icon: 'users' },
        { label: 'Departments', path: '/admin/departments', icon: 'building' },
        { label: 'Holidays', path: '/admin/holidays', icon: 'calendar' },
        { label: 'Leave Requests', path: '/leave-history', icon: 'inbox' },
        { label: 'Reimbursements', path: '/reimbursements', icon: 'receipt' },
        { label: 'AI Insights', path: '/ai-insights', icon: 'sparkle' },
        { label: 'Audit Log', path: '/audit-log', icon: 'shield' },
        { label: 'Profile', path: '/profile', icon: 'user' },
    ],
};
