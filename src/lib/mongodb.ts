/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: any;
  promise: any;
}

// In development, we want to use a global variable so connections persist across module reloads
const cached: MongooseCache = (global as any).mongoose || { conn: null, promise: null };

if (process.env.NODE_ENV === 'development') {
  (global as any).mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Connection pool settings for better performance
      maxPoolSize: 200,        // Maximum number of connections in the pool
      minPoolSize: 10,         // Minimum number of connections to maintain
      maxIdleTimeMS: 30000,    // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // How long to wait for server selection
      socketTimeoutMS: 45000,  // How long to wait for socket operations
      family: 4,               // Use IPv4, skip trying IPv6
      // Retry settings
      retryWrites: true,
      retryReads: true,
    };

    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      console.log('MongoDB connected with optimized settings');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB; 