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

      maxPoolSize: 200,        
      minPoolSize: 10,         
      maxIdleTimeMS: 30000,    
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000,  
      family: 4,               

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