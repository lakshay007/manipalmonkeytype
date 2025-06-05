import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string;
  monkeyTypeUsername?: string;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  branch?: string;
  year?: number;
  lastUpdated: Date;
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  discordId: {
    type: String,
    required: true,
    unique: true,
  },
  discordUsername: {
    type: String,
    required: true,
  },
  discordAvatar: {
    type: String,
  },
  monkeyTypeUsername: {
    type: String,
    unique: true,
    sparse: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
  },
  branch: {
    type: String,
    enum: ['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE', 'CHE', 'BT', 'TE', 'AE', 'IE', 'IPE'],
  },
  year: {
    type: Number,
    min: 1,
    max: 4,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 