import { format, parseISO, isValid, differenceInDays, formatDistanceToNow } from 'date-fns';

// Formats a date to display format (dd MMM yyyy)
export const formatDate = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, 'dd MMM yyyy') : 'Invalid date';
};

// Formats a date to short format (dd/MM/yyyy)
export const formatShortDate = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, 'dd/MM/yyyy') : '';
};

// Returns relative time string (e.g., "2 days ago")
export const timeAgo = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? formatDistanceToNow(d, { addSuffix: true }) : '';
};

// Formats date for input[type="date"] fields (yyyy-MM-dd)
export const formatForInput = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, 'yyyy-MM-dd') : '';
};

// Calculates days between two dates
export const daysBetween = (start, end) => {
    if (!start || !end) return 0;
    const s = typeof start === 'string' ? parseISO(start) : start;
    const e = typeof end === 'string' ? parseISO(end) : end;
    return differenceInDays(e, s) + 1;
};

// Formats month label for charts (MMM yyyy)
export const formatMonthLabel = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isValid(d) ? format(d, 'MMM yyyy') : '';
};
