import mongoose from 'mongoose';
import * as dotenv from 'dotenv';

dotenv.config(); // Load .env

const MONGO_URI = process.env.MONGO_URI;
export async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection failed', err);
  }
}

export async function disconnectMongo() {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
