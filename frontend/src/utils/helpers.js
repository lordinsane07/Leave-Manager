import { LEAVE_TYPE_LABELS, BURNOUT_CATEGORIES } from './constants';

// Capitalizes the first letter of a string
export const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

// Truncates a string to a max length with ellipsis
export const truncate = (str, maxLength = 50) => {
    if (!str || str.length <= maxLength) return str || '';
    return str.substring(0, maxLength) + '...';
};

// Returns the display label for a leave type
export const getLeaveTypeLabel = (type) => LEAVE_TYPE_LABELS[type] || capitalize(type);

// Returns the burnout category based on score
export const getBurnoutCategory = (score) => {
    if (score <= 30) return BURNOUT_CATEGORIES.LOW;
    if (score <= 60) return BURNOUT_CATEGORIES.MODERATE;
    if (score <= 80) return BURNOUT_CATEGORIES.HIGH;
    return BURNOUT_CATEGORIES.CRITICAL;
};

// Returns initials from a name (first + last letter)
export const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// Formats a number with commas for display
export const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    return num.toLocaleString('en-IN');
};

// Builds a query string from an object (skips null/undefined values)
export const buildQueryString = (params) => {
    const query = Object.entries(params)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
    return query ? `?${query}` : '';
};

// Deep clones a plain object (safe for JSON-serializable data)
export const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
