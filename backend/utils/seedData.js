const { addDays, addMonths, subDays, subMonths, format } = require('date-fns');

// Generates seed data relative to the current date for realistic testing
const getSeedData = () => {
    const now = new Date();

    // ━━━ Departments ━━━
    const departments = [
        { name: 'Engineering', code: 'ENG', leavePolicy: { annual: 20, sick: 10, personal: 5, maternity: 90, paternity: 15, maxConsecutiveDays: 15 } },
        { name: 'Design', code: 'DES', leavePolicy: { annual: 20, sick: 10, personal: 5, maternity: 90, paternity: 15, maxConsecutiveDays: 15 } },
        { name: 'Marketing', code: 'MKT', leavePolicy: { annual: 20, sick: 10, personal: 5, maternity: 90, paternity: 15, maxConsecutiveDays: 15 } },
    ];

    // ━━━ Users (password will be hashed via pre-save hook) ━━━
    const users = [
        // Admin
        { name: 'System Admin', email: 'admin@company.com', password: 'Admin@123', role: 'admin' },
        // Managers
        { name: 'Arjun Mehta', email: 'manager1@company.com', password: 'Manager@123', role: 'manager', deptIndex: 0 },
        { name: 'Priya Sharma', email: 'manager2@company.com', password: 'Manager@123', role: 'manager', deptIndex: 1 },
        // Employees — Engineering
        { name: 'Rahul Verma', email: 'rahul@company.com', password: 'Employee@123', role: 'employee', deptIndex: 0 },
        { name: 'Sneha Patel', email: 'sneha@company.com', password: 'Employee@123', role: 'employee', deptIndex: 0 },
        { name: 'Vikram Singh', email: 'vikram@company.com', password: 'Employee@123', role: 'employee', deptIndex: 0 },
        { name: 'Ananya Iyer', email: 'ananya@company.com', password: 'Employee@123', role: 'employee', deptIndex: 0 },
        // Employees — Design
        { name: 'Kavya Nair', email: 'kavya@company.com', password: 'Employee@123', role: 'employee', deptIndex: 1 },
        { name: 'Rohan Das', email: 'rohan@company.com', password: 'Employee@123', role: 'employee', deptIndex: 1 },
        // Employees — Marketing
        { name: 'Meera Joshi', email: 'meera@company.com', password: 'Employee@123', role: 'employee', deptIndex: 2 },
        { name: 'Aditya Kumar', email: 'aditya@company.com', password: 'Employee@123', role: 'employee', deptIndex: 2 },
    ];

    // ━━━ Holidays (next 6 months) ━━━
    const currentYear = now.getFullYear();
    const holidays = [
        { name: 'Republic Day', date: new Date(currentYear, 0, 26), type: 'national', isRecurring: true },
        { name: 'Holi', date: new Date(currentYear, 2, 14), type: 'national', isRecurring: false },
        { name: 'Good Friday', date: new Date(currentYear, 3, 18), type: 'national', isRecurring: false },
        { name: 'Labour Day', date: new Date(currentYear, 4, 1), type: 'national', isRecurring: true },
        { name: 'Independence Day', date: new Date(currentYear, 7, 15), type: 'national', isRecurring: true },
        { name: 'Gandhi Jayanti', date: new Date(currentYear, 9, 2), type: 'national', isRecurring: true },
        { name: 'Diwali', date: new Date(currentYear, 9, 20), type: 'national', isRecurring: false },
        { name: 'Christmas', date: new Date(currentYear, 11, 25), type: 'national', isRecurring: true },
        { name: 'Company Foundation Day', date: new Date(currentYear, 5, 15), type: 'company', isRecurring: true },
        { name: 'Annual Team Offsite', date: new Date(currentYear, 8, 5), type: 'company', isRecurring: false },
    ].map((h) => ({ ...h, year: h.date.getFullYear() }));

    // ━━━ Leave requests (20 in various statuses) ━━━
    // userIndex references the users array above (employees start at index 3)
    const leaves = [
        // Approved leaves
        { userIndex: 3, leaveType: 'annual', startOffset: -30, endOffset: -27, status: 'approved', approverIndex: 1, reason: 'Family vacation to Goa planned well in advance' },
        { userIndex: 4, leaveType: 'sick', startOffset: -15, endOffset: -14, status: 'approved', approverIndex: 1, reason: 'Feeling unwell with fever and body ache, need rest' },
        { userIndex: 5, leaveType: 'personal', startOffset: -10, endOffset: -10, status: 'approved', approverIndex: 1, reason: 'Personal appointment that requires a full day off' },
        { userIndex: 6, leaveType: 'annual', startOffset: -45, endOffset: -41, status: 'approved', approverIndex: 1, reason: 'Annual family get-together at hometown during festival' },
        { userIndex: 7, leaveType: 'sick', startOffset: -20, endOffset: -18, status: 'approved', approverIndex: 2, reason: 'Dental surgery recovery period as advised by dentist' },
        { userIndex: 8, leaveType: 'annual', startOffset: -25, endOffset: -22, status: 'approved', approverIndex: 2, reason: 'Short trip planned with college friends during long weekend' },
        { userIndex: 9, leaveType: 'personal', startOffset: -5, endOffset: -5, status: 'approved', approverIndex: 1, reason: 'Need to attend a family event that cannot be rescheduled' },
        { userIndex: 10, leaveType: 'sick', startOffset: -8, endOffset: -7, status: 'approved', approverIndex: 1, reason: 'Severe cold and cough making it hard to concentrate on work' },
        // Pending leaves
        { userIndex: 3, leaveType: 'annual', startOffset: 5, endOffset: 9, status: 'pending', reason: 'Planning a week-long family vacation during school holidays' },
        { userIndex: 5, leaveType: 'sick', startOffset: 2, endOffset: 3, status: 'pending', reason: 'Follow-up medical checkup requiring two days off from work' },
        { userIndex: 7, leaveType: 'annual', startOffset: 10, endOffset: 14, status: 'pending', reason: 'Annual leave for travel and personal rejuvenation time' },
        { userIndex: 9, leaveType: 'personal', startOffset: 7, endOffset: 7, status: 'pending', reason: 'Personal errand that needs attention during business hours' },
        { userIndex: 10, leaveType: 'annual', startOffset: 15, endOffset: 19, status: 'pending', reason: 'Planned family wedding celebrations in another city state' },
        // Rejected leaves
        { userIndex: 4, leaveType: 'annual', startOffset: -3, endOffset: 2, status: 'rejected', approverIndex: 1, reason: 'Wanted to take a short break but dates conflict with sprint', managerComment: 'Critical sprint deadline — please reschedule to next week' },
        { userIndex: 6, leaveType: 'personal', startOffset: -2, endOffset: -1, status: 'rejected', approverIndex: 1, reason: 'Need personal time to handle some important family matters', managerComment: 'Team is understaffed this week due to other leaves' },
        { userIndex: 8, leaveType: 'annual', startOffset: -7, endOffset: -4, status: 'rejected', approverIndex: 2, reason: 'Would like to take some days off for personal travel plans', managerComment: 'Project launch window — please try after the release date' },
        // Cancelled leaves
        { userIndex: 3, leaveType: 'personal', startOffset: -12, endOffset: -11, status: 'cancelled', reason: 'Was planning a personal day but plans changed unexpectedly' },
        { userIndex: 5, leaveType: 'annual', startOffset: -35, endOffset: -32, status: 'cancelled', reason: 'Had planned vacation but decided to postpone to next month' },
        // More approved for data variety
        { userIndex: 4, leaveType: 'annual', startOffset: -60, endOffset: -56, status: 'approved', approverIndex: 1, reason: 'Annual leave for a short trip during the long holiday weekend' },
        { userIndex: 6, leaveType: 'sick', startOffset: -50, endOffset: -49, status: 'approved', approverIndex: 1, reason: 'Caught a stomach bug and needed rest for quick recovery time' },
    ];

    return { departments, users, holidays, leaves };
};

module.exports = getSeedData;
