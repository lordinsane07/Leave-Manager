require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const makeManager = async () => {
    const email = process.argv[2];
    const role = process.argv[3] || 'manager';

    if (!email) {
        console.error('Please provide an email address.');
        console.log('Usage: node make-manager.js <email> [role]');
        console.log('Example: node make-manager.js john@example.com admin');
        process.exit(1);
    }

    if (!['employee', 'manager', 'admin'].includes(role)) {
        console.error('Invalid role. Must be employee, manager, or admin.');
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        const user = await User.findOne({ email });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        user.role = role;
        await user.save({ validateBeforeSave: false });

        console.log(`Successfully updated ${email} to role: ${role}`);
        process.exit(0);
    } catch (error) {
        console.error('Error updating user role:', error);
        process.exit(1);
    }
};

makeManager();
