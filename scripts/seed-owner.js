const User = require('../models/user');
const sequelize = require('../config/database');

const seedOwner = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // Email and password from request
        const email = 'bagusarga3@gmail.com';
        const password = 'bagus1234';
        const name = 'Owner Bagus';

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });

        if (existingUser) {
            console.log(`User ${email} already exists. Updating password and role...`);
            // Update existing user to ensure they are owner and have the right password
            existingUser.password = password; // Hook will hash this
            existingUser.role = 'owner';
            existingUser.status = 'active';
            existingUser.name = name;
            await existingUser.save();
            console.log('User updated successfully.');
        } else {
            console.log(`Creating new user ${email}...`);
            await User.create({
                name,
                email,
                password, // Hook will hash this
                role: 'owner',
                status: 'active'
            });
            console.log('User created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding owner:', error);
        process.exit(1);
    }
};

seedOwner();
