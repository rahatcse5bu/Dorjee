// Resets the demo shop: removes demo staff, orders; restores the seeded catalog and customer.
import { createRequire } from 'node:module';
const require = createRequire('/Volumes/TRANSCEND/PNC_Soft_Tech/Dorjee/apps/api/package.json');
const mongoose = require('mongoose');
await mongoose.connect('mongodb://127.0.0.1:61018/dorjee_demo?replicaSet=testset');
const db = mongoose.connection.db;
console.log((await db.listCollections().toArray()).map(c => c.name).join(','));
if (process.argv[2] !== 'orders') await db.collection('users').deleteMany({ email: { $ne: 'owner@rahman.demo' } });
for (const c of ['orders', 'notifications', 'ordercounters', 'payments', ...(process.argv[2] === 'orders' ? [] : ['customers'])]) await db.collection(c).deleteMany({}).catch(() => {});
await mongoose.disconnect();
