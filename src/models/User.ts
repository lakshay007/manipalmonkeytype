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
  // Email verification fields
  eduEmail?: string;
  eduEmailVerified: boolean;
  verificationCode?: string;
  verificationCodeExpiresAt?: Date;
  lastVerificationEmailSent?: Date;
  verificationAttempts: number;
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
  // Email verification fields
  eduEmail: {
    type: String,
    validate: {
      validator: function(email: string) {
        if (!email) return true; // Optional field
        return email.endsWith('@learner.manipal.edu');
      },
      message: 'Email must be a valid Manipal edu email (@learner.manipal.edu)'
    }
  },
  eduEmailVerified: {
    type: Boolean,
    default: false,
  },
  verificationCode: {
    type: String,
  },
  verificationCodeExpiresAt: {
    type: Date,
  },
  lastVerificationEmailSent: {
    type: Date,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
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

// Indexes for better performance
// Primary lookup index for leaderboard aggregation
UserSchema.index({ _id: 1, isVerified: 1 });

// Additional indexes for user queries
// Note: discordId and monkeyTypeUsername already have unique indexes
UserSchema.index({ isVerified: 1 }); // For filtering verified users
UserSchema.index({ eduEmail: 1 }); // For email verification lookup
UserSchema.index({ eduEmailVerified: 1 }); // For verified email users

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema); 