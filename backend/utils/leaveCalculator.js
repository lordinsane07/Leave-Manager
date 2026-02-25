const {
    differenceInBusinessDays,
    differenceInCalendarDays,
    eachDayOfInterval,
    isWeekend,
    parseISO,
    isValid,
    isBefore,
    isAfter,
    startOfDay,
} = require('date-fns');

// Calculates total working days between two dates, excluding weekends and holidays
const calculateLeaveDays = (startDate, endDate, holidays = []) => {
    const start = startOfDay(typeof startDate === 'string' ? parseISO(startDate) : startDate);
    const end = startOfDay(typeof endDate === 'string' ? parseISO(endDate) : endDate);

    if (!isValid(start) || !isValid(end)) {
        return 0;
    }

    if (isAfter(start, end)) {
        return 0;
    }

    // Get every day in the range
    const allDays = eachDayOfInterval({ start, end });

    // Convert holiday dates to comparable string format
    const holidaySet = new Set(
        holidays.map((h) => {
            const raw = h.date || h;
            const d = typeof raw === 'string' ? parseISO(raw) : new Date(raw);
            return startOfDay(d).toISOString();
        })
    );

    // Count only working days (not weekends, not holidays)
    const workingDays = allDays.filter((day) => {
        const isHoliday = holidaySet.has(startOfDay(day).toISOString());
        return !isWeekend(day) && !isHoliday;
    });

    return workingDays.length;
};

// Checks if requested leave dates overlap with existing approved leaves
const hasOverlap = (newStart, newEnd, existingLeaves) => {
    const start = startOfDay(typeof newStart === 'string' ? parseISO(newStart) : newStart);
    const end = startOfDay(typeof newEnd === 'string' ? parseISO(newEnd) : newEnd);

    return existingLeaves.some((leave) => {
        const lStart = startOfDay(new Date(leave.startDate));
        const lEnd = startOfDay(new Date(leave.endDate));
        // Overlap exists when both ranges share at least one common day
        return (isBefore(start, lEnd) || start.getTime() === lEnd.getTime()) &&
            (isAfter(end, lStart) || end.getTime() === lStart.getTime());
    });
};

// Validates that a leave request doesn't exceed the employee's remaining balance
const validateBalance = (balance, leaveType, requestedDays) => {
    const available = balance?.[leaveType] ?? 0;
    return available >= requestedDays;
};

// Returns a human-readable label for leave duration
const getDurationLabel = (totalDays) => {
    if (totalDays === 1) return '1 day';
    if (totalDays < 7) return `${totalDays} days`;
    const weeks = Math.floor(totalDays / 5);
    const remainingDays = totalDays % 5;
    if (remainingDays === 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
    return `${weeks} week${weeks > 1 ? 's' : ''} ${remainingDays} day${remainingDays > 1 ? 's' : ''}`;
};

module.exports = {
    calculateLeaveDays,
    hasOverlap,
    validateBalance,
    getDurationLabel,
};
