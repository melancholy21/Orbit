import dotenv from 'dotenv';
dotenv.config();
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  await connectDB();
  
  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users in database.`);
    
    let updatedCount = 0;
    for (const user of users) {
      let changed = false;
      
      const capitalize = (val) => {
        if (!val) return '';
        return val.trim().replace(/\b\w/g, char => char.toUpperCase());
      };

      if (user.firstName) {
        const formatted = capitalize(user.firstName);
        if (formatted !== user.firstName) {
          user.firstName = formatted;
          changed = true;
        }
      }

      if (user.lastName) {
        const formatted = capitalize(user.lastName);
        if (formatted !== user.lastName) {
          user.lastName = formatted;
          changed = true;
        }
      }

      if (changed) {
        await user.save();
        console.log(`Updated user @${user.username}: "${user.firstName} ${user.lastName}"`);
        updatedCount++;
      }
    }
    
    console.log(`Migration completed successfully! ${updatedCount} users updated.`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run();
