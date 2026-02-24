require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Department = require('./models/Department');
const Leave = require('./models/Leave');
const Holiday = require('./models/Holiday');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const AIInsight = require('./models/AIInsight');
const getSeedData = require('./utils/seedData');
const { addDays } = require('date-fns');
const logger = require('./utils/logger');

// Connects to MongoDB and seeds the database with test data
const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        logger.info('MongoDB connected for seeding');

        // Check for --destroy flag to wipe existing data
        const isDestroy = process.argv.includes('--destroy');

        if (isDestroy) {
            logger.info('Destroying existing data...');
            await Promise.all([
                User.deleteMany({}),
                Department.deleteMany({}),
                Leave.deleteMany({}),
                Holiday.deleteMany({}),
                Notification.deleteMany({}),
                AuditLog.deleteMany({}),
                AIInsight.deleteMany({}),
            ]);
            logger.info('All data destroyed. Exiting.');
            process.exit(0);
        }

        // Clear existing data before seeding fresh
        await Promise.all([
            User.deleteMany({}),
            Department.deleteMany({}),
            Leave.deleteMany({}),
            Holiday.deleteMany({}),
            Notification.deleteMany({}),
            AuditLog.deleteMany({}),
            AIInsight.deleteMany({}),
        ]);

        const { departments, users, holidays, leaves } = getSeedData();

        // ━━━ Step 1: Create departments ━━━
        const createdDepts = await Department.insertMany(departments);
        logger.info(`Created ${createdDepts.length} departments`);

        // ━━━ Step 2: Create users with department references ━━━
        const createdUsers = [];
        for (const userData of users) {
            const userDoc = {
                name: userData.name,
                email: userData.email,
                password: userData.password, // Will be hashed by pre-save hook
                role: userData.role,
                joinDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
                isEmailVerified: true,
                authProvider: 'local',
            };

            // Assign department if specified
            if (userData.deptIndex !== undefined) {
                userDoc.department = createdDepts[userData.deptIndex]._id;
            }

            const user = await User.create(userDoc);
            createdUsers.push(user);
        }
        logger.info(`Created ${createdUsers.length} users`);

        // ━━━ Step 3: Assign managers to employees ━━━
        // Manager at index 1 (Arjun) manages Engineering (index 0) and Marketing employees
        // Manager at index 2 (Priya) manages Design employees
        for (let i = 3; i < createdUsers.length; i++) {
            const user = createdUsers[i];
            const userSeed = users[i];
            let managerId;

            if (userSeed.deptIndex === 0 || userSeed.deptIndex === 2) {
                managerId = createdUsers[1]._id; // Arjun
            } else {
                managerId = createdUsers[2]._id; // Priya
            }

            await User.findByIdAndUpdate(user._id, { managerId });
        }

        // Assign managers to departments
        await Department.findByIdAndUpdate(createdDepts[0]._id, {
            manager: createdUsers[1]._id,
            employees: createdUsers.filter((u, i) => users[i].deptIndex === 0).map((u) => u._id),
        });
        await Department.findByIdAndUpdate(createdDepts[1]._id, {
            manager: createdUsers[2]._id,
            employees: createdUsers.filter((u, i) => users[i].deptIndex === 1).map((u) => u._id),
        });
        await Department.findByIdAndUpdate(createdDepts[2]._id, {
            manager: createdUsers[1]._id,
            employees: createdUsers.filter((u, i) => users[i].deptIndex === 2).map((u) => u._id),
        });

        logger.info('Manager and department assignments complete');

        // ━━━ Step 4: Create holidays ━━━
        await Holiday.insertMany(holidays);
        logger.info(`Created ${holidays.length} holidays`);

        // ━━━ Step 5: Create leave requests ━━━
        const now = new Date();
        for (const leaveData of leaves) {
            const employee = createdUsers[leaveData.userIndex];
            const startDate = addDays(now, leaveData.startOffset);
            const endDate = addDays(now, leaveData.endOffset);
            const totalDays = leaveData.endOffset - leaveData.startOffset + 1;

            const leaveDoc = {
                employee: employee._id,
                leaveType: leaveData.leaveType,
                startDate,
                endDate,
                totalDays: totalDays > 0 ? totalDays : 1,
                reason: leaveData.reason,
                status: leaveData.status,
                appliedAt: addDays(startDate, -3), // Applied 3 days before start
            };

            // Set approver for processed leaves
            if (leaveData.approverIndex) {
                leaveDoc.approvedBy = createdUsers[leaveData.approverIndex]._id;
                leaveDoc.processedAt = addDays(startDate, -1);
                leaveDoc.notificationSent = true;
            }

            if (leaveData.managerComment) {
                leaveDoc.managerComment = leaveData.managerComment;
            }

            await Leave.create(leaveDoc);

            // Deduct balance for approved leaves
            if (leaveData.status === 'approved') {
                await User.findByIdAndUpdate(employee._id, {
                    $inc: {
                        [`leaveBalance.${leaveData.leaveType}`]: -totalDays,
                        totalLeaveTaken: totalDays,
                    },
                });
            }
        }
        logger.info(`Created ${leaves.length} leave requests`);

        // ━━━ Summary ━━━
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('   Database seeded successfully!');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        logger.info('Login credentials:');
        logger.info('  Admin:    admin@company.com / Admin@123');
        logger.info('  Manager1: manager1@company.com / Manager@123');
        logger.info('  Manager2: manager2@company.com / Manager@123');
        logger.info('  Employee: rahul@company.com / Employee@123');
        logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        logger.error(`Seeding failed: ${error.message}`);
        process.exit(1);
    }
};

seedDatabase();
