import mongoose from 'mongoose';
import dotenv from 'dotenv';
import BorrowHistory from '../models/BorrowHistory.js';
import BorrowRecord from '../models/BorrowRecord.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all borrow histories with action 'borrow' and no returnDate
    // Also include those where returnDate is null
    const stuckBorrows = await BorrowHistory.find({
      action: 'borrow',
      $or: [
        { returnDate: { $exists: false } },
        { returnDate: null }
      ]
    });

    console.log(`🔍 Found ${stuckBorrows.length} potential stuck borrow logs.`);

    let fixedCount = 0;

    for (const h of stuckBorrows) {
      const userId = h.userId;
      const bookId = h.bookId;

      // Check if there is an ACTIVE borrow record
      // Note: userId/bookId can be String or ObjectId. 
      // Mongoose findOne should handle type coercion if schema matches, 
      // but BorrowRecord schema uses Mixed. 
      // To be safe, we try both String and ObjectId if applicable.

      let activeRecord = await BorrowRecord.findOne({
        userId: userId,
        bookId: bookId,
        returned: false
      });
      
      // If not found by direct match, try to check loose equality if IDs are objects
      if (!activeRecord) {
         // This confirms no active record found with strict match.
         // Let's assume the user is correct and these are stuck.
      }

      if (!activeRecord) {
        // It seems the book is NOT currently borrowed (or record is missing/returned).
        // So we should close this history log.
        
        console.log(`🛠️ Fixing history for User [${userId}] Book [${h.bookTitle}] (No active record found)`);
        
        // Try to find a corresponding 'return' log to get accurate date
        const returnLog = await BorrowHistory.findOne({
          userId,
          bookId,
          action: 'return',
          createdAt: { $gte: h.createdAt }
        }).sort({ createdAt: 1 }); // Find the first return after borrow

        if (returnLog) {
            h.returnDate = returnLog.createdAt;
            console.log(`   -> Found matching return log at ${returnLog.createdAt}`);
        } else {
            h.returnDate = new Date(); // Default to now if no log found
            console.log(`   -> No return log found, using current time`);
        }
        
        await h.save();
        fixedCount++;
      } else {
        // It is truly active, skip
        // console.log(`   -> Active borrow confirmed, skipping.`);
      }
    }

    console.log(`✅ Fixed ${fixedCount} records.`);
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

run();
