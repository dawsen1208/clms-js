import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import User from "../models/User.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually load env to avoid path issues
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
}

const connectDB = async () => {
  try {
    console.log("Connecting with URI:", process.env.MONGODB_URI ? "Found" : "Not Found");
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const fixUrls = async () => {
  await connectDB();

  try {
    // Find users with 'localhost' in avatar
    const users = await User.find({ avatar: { $regex: "localhost" } });
    console.log(`Found ${users.length} users with localhost in avatar.`);

    for (const user of users) {
      console.log(`Processing user: ${user.name} (${user.userId})`);
      console.log(`  Old Avatar: ${user.avatar}`);
      
      let newAvatar = user.avatar;

      // Strategy 1: Replace http://localhost:PORT/uploads/ with /uploads/
      if (newAvatar.match(/http:\/\/localhost:\d+\/uploads\//)) {
        newAvatar = newAvatar.replace(/http:\/\/localhost:\d+\/uploads\//, "/uploads/");
      } 
      // Strategy 2: If it still has localhost but structure is different, try to find /uploads/
      else if (newAvatar.includes("localhost") && newAvatar.includes("/uploads/")) {
        const index = newAvatar.indexOf("/uploads/");
        newAvatar = newAvatar.substring(index);
      }

      if (newAvatar !== user.avatar) {
        console.log(`  New Avatar: ${newAvatar}`);
        user.avatar = newAvatar;
        // Password won't be re-hashed due to isModified check in model
        await user.save(); 
      } else {
        console.log(`  Skipping (no change made)`);
      }
    }

    console.log("All done!");
    process.exit();
  } catch (error) {
    console.error("Error fixing URLs:", error);
    process.exit(1);
  }
};

fixUrls();
