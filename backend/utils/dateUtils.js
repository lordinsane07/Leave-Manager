const {
    format,
    parseISO,
    isValid,
    startOfMonth,
    endOfMonth,
    startOfYear,
    endOfYear,
    startOfWeek,
    endOfWeek,
    addDays,
    addMonths,
    subMonths,
    differenceInDays,
    differenceInMonths,
    isSameDay,
    isSameMonth,
    isWithinInterval,
    eachMonthOfInterval,
} = require('date-fns');

// Formats a date to the standard display format (dd MMM yyyy)
const formatDisplayDate = (date) => {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? format(parsed, 'dd MMM yyyy') : 'Invalid date';
};

// Formats a date to ISO date string (yyyy-MM-dd)
const formatISODate = (date) => {
    const parsed = typeof date === 'string' ? parseISO(date) : date;
    return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : null;
};

// Parses a date string safely, returns null on invalid input
const safeParse = (dateStr) => {
    if (!dateStr) return null;
    const parsed = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return isValid(parsed) ? parsed : null;
};

// Returns the start and end of a given month
const getMonthRange = (date) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return { start: startOfMonth(d), end: endOfMonth(d) };
};

// Returns the start and end of a given year
const getYearRange = (date) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return { start: startOfYear(d), end: endOfYear(d) };
};

// Returns an array of month start dates for a given interval
const getMonthsInRange = (start, end) => {
    return eachMonthOfInterval({ start, end });
};

// Calculates the number of days between two dates
const daysBetween = (start, end) => {
    return differenceInDays(
        typeof end === 'string' ? parseISO(end) : end,
        typeof start === 'string' ? parseISO(start) : start
    );
};

// Checks if a date falls within a given range (inclusive)
const isInRange = (date, start, end) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return isWithinInterval(d, { start, end });
};

module.exports = {
    formatDisplayDate,
    formatISODate,
    safeParse,
    getMonthRange,
    getYearRange,
    getMonthsInRange,
    daysBetween,
    isInRange,
    // Re-export commonly used date-fns functions for convenience
    addDays,
    addMonths,
    subMonths,
    isSameDay,
    isSameMonth,
    startOfMonth,
    endOfMonth,
    parseISO,
    format,
};
