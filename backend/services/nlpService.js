const {
    addDays,
    nextMonday,
    nextTuesday,
    nextWednesday,
    nextThursday,
    nextFriday,
    startOfWeek,
    endOfWeek,
    format,
    parseISO,
    isValid,
} = require('date-fns');
const logger = require('../utils/logger');

// Keyword-to-leave-type mapping for NLP extraction
const LEAVE_TYPE_KEYWORDS = {
    sick: ['sick', 'unwell', 'ill', 'medical', 'doctor', 'hospital', 'health', 'fever'],
    annual: ['annual', 'vacation', 'holiday', 'planned', 'rest'],
    personal: ['personal', 'family', 'emergency', 'urgent', 'private'],
    maternity: ['maternity', 'pregnancy', 'prenatal'],
    paternity: ['paternity', 'newborn', 'baby'],
};

// Day name to date-fns function mapping
const DAY_RESOLVERS = {
    monday: nextMonday,
    tuesday: nextTuesday,
    wednesday: nextWednesday,
    thursday: nextThursday,
    friday: nextFriday,
};

// Parses natural language text into structured leave data using regex and keyword matching
const parseNaturalLanguageLeave = (text) => {
    try {
        const input = text.toLowerCase().trim();
        const result = {
            leaveType: null,
            startDate: null,
            endDate: null,
            totalDays: null,
            confidence: 'low',
            parsed: false,
            original: text,
        };

        // ━━━ Step 1: Extract leave type from keywords ━━━
        for (const [type, keywords] of Object.entries(LEAVE_TYPE_KEYWORDS)) {
            if (keywords.some((kw) => input.includes(kw))) {
                result.leaveType = type;
                break;
            }
        }
        // Default to annual leave if no type detected
        if (!result.leaveType) {
            result.leaveType = 'annual';
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // ━━━ Step 2: Extract dates ━━━

        // Pattern: "from tomorrow" or "starting tomorrow"
        if (input.includes('tomorrow')) {
            result.startDate = addDays(today, 1);
        }

        // Pattern: "today"
        if (input.includes('today')) {
            result.startDate = today;
        }

        // Pattern: "next monday", "this friday", etc.
        for (const [dayName, resolver] of Object.entries(DAY_RESOLVERS)) {
            if (input.includes(dayName)) {
                result.startDate = resolver(today);
                break;
            }
        }

        // Pattern: "this week"
        if (input.includes('this week')) {
            result.startDate = today;
            result.endDate = endOfWeek(today, { weekStartsOn: 1 });
        }

        // Pattern: "next week"
        if (input.includes('next week')) {
            const nextWeekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
            result.startDate = nextWeekStart;
            result.endDate = addDays(nextWeekStart, 4); // Mon-Fri
        }

        // Pattern: explicit dates "dec 25", "december 25", "25 dec"
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const datePattern = /(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i;
        const datePatternReverse = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{1,2})/i;

        let dateMatch = input.match(datePattern) || input.match(datePatternReverse);
        if (dateMatch) {
            let day, monthStr;
            if (/^\d/.test(dateMatch[1])) {
                day = parseInt(dateMatch[1], 10);
                monthStr = dateMatch[2].substring(0, 3).toLowerCase();
            } else {
                monthStr = dateMatch[1].substring(0, 3).toLowerCase();
                day = parseInt(dateMatch[2], 10);
            }
            const monthIndex = monthNames.indexOf(monthStr);
            if (monthIndex !== -1 && day >= 1 && day <= 31) {
                let year = now.getFullYear();
                // If the date has passed this year, assume next year
                const candidate = new Date(year, monthIndex, day);
                if (candidate < today) year++;
                result.startDate = new Date(year, monthIndex, day);
            }
        }

        // Pattern: ISO date "2024-12-25"
        const isoMatch = input.match(/(\d{4}-\d{2}-\d{2})/);
        if (isoMatch) {
            const parsed = parseISO(isoMatch[1]);
            if (isValid(parsed)) {
                result.startDate = parsed;
            }
        }

        // ━━━ Step 3: Extract duration (number of days) ━━━
        const daysMatch = input.match(/(\d+)\s*day/i);
        if (daysMatch) {
            result.totalDays = parseInt(daysMatch[1], 10);
            if (result.startDate && !result.endDate) {
                result.endDate = addDays(result.startDate, result.totalDays - 1);
            }
        }

        // Pattern: "monday and tuesday" — 2 days
        const andDayMatch = input.match(/(monday|tuesday|wednesday|thursday|friday)\s+and\s+(monday|tuesday|wednesday|thursday|friday)/i);
        if (andDayMatch && result.startDate) {
            const secondDay = DAY_RESOLVERS[andDayMatch[2].toLowerCase()];
            if (secondDay) {
                result.endDate = secondDay(today);
                result.totalDays = 2;
            }
        }

        // ━━━ Step 4: Finalize and calculate confidence ━━━

        // If we have startDate but no endDate, default to 1 day
        if (result.startDate && !result.endDate) {
            result.endDate = result.startDate;
            result.totalDays = result.totalDays || 1;
        }

        // Format dates for output
        if (result.startDate) {
            result.startDate = format(result.startDate, 'yyyy-MM-dd');
            result.parsed = true;
        }
        if (result.endDate) {
            result.endDate = format(result.endDate, 'yyyy-MM-dd');
        }

        // Calculate confidence based on how much was parsed
        if (result.startDate && result.endDate && result.leaveType) {
            result.confidence = 'high';
        } else if (result.startDate && result.leaveType) {
            result.confidence = 'medium';
        } else if (result.startDate || result.leaveType !== 'annual') {
            result.confidence = 'low';
        }

        return result;
    } catch (error) {
        logger.error(`NLP parse error: ${error.message}`);
        return {
            leaveType: null,
            startDate: null,
            endDate: null,
            totalDays: null,
            confidence: 'error',
            parsed: false,
            original: text,
            error: 'Unable to parse input',
        };
    }
};

module.exports = { parseNaturalLanguageLeave };
