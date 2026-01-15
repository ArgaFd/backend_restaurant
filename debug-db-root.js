require('dotenv').config();
const mongoose = require('mongoose');
const Menu = require('./models/menu');
const Order = require('./models/order');

const debugDB = async () => {
    try {
        console.log('Connecting to MongoDB...');
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not set in .env');
            return;
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected!');

        // Check Menus
        console.log('\n--- CHECKING MENUS ---');
        const menus = await Menu.find({}).limit(5).lean();
        if (menus.length === 0) {
            console.log('NO MENUS FOUND!');
        } else {
            menus.forEach(m => {
                console.log(`ID: ${m.id} (Type: ${typeof m.id}), Name: ${m.name}, Price: ${m.price} (Type: ${typeof m.price})`);
            });
        }

        // Check Orders
        console.log('\n--- CHECKING LATEST ORDERS ---');
        const orders = await Order.find({}).sort({ createdAt: -1 }).limit(3).lean();
        if (orders.length === 0) {
            console.log('NO ORDERS FOUND!');
        } else {
            orders.forEach(o => {
                console.log(`Order ID: ${o.id}, Total: ${o.totalAmount}`);
                console.log('Items:', JSON.stringify(o.items, null, 2));
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected.');
    }
};

debugDB();
