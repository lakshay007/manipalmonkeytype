import mongoose, { Schema, Document } from 'mongoose';

export interface IScore extends Document {
  userId: mongoose.Types.ObjectId;
  discordId: string;
  monkeyTypeUsername: string;
  category: '15s' | '30s' | '60s' | '120s' | 'words';
  wpm: number;
  accuracy: number;
  consistency?: number;
  rawWpm?: number;
  testDate?: Date;
  personalBest: boolean;
  lastUpdated: Date;
  createdAt: Date;
}

const ScoreSchema: Schema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  discordId: {
    type: String,
    required: true,
  },
  monkeyTypeUsername: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['15s', '30s', '60s', '120s', 'words'],
    required: true,
  },
  wpm: {
    type: Number,
    required: true,
    min: 0,
  },
  accuracy: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  consistency: {
    type: Number,
    min: 0,
    max: 100,
  },
  rawWpm: {
    type: Number,
    min: 0,
  },
  testDate: {
    type: Date,
  },
  personalBest: {
    type: Boolean,
    default: false,
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

// Compound index for efficient leaderboard queries
ScoreSchema.index({ category: 1, wpm: -1 });
ScoreSchema.index({ userId: 1, category: 1, personalBest: 1 });
ScoreSchema.index({ discordId: 1, category: 1 });

export default mongoose.models.Score || mongoose.model<IScore>('Score', ScoreSchema); 