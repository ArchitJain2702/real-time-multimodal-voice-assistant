import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  displayName: string;
  apiKeyHash: string;
  plan: 'free' | 'pro' | 'enterprise';
  usageQuota: {
    minutesPerMonth: number;
    tokensPerMonth: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    apiKeyHash: { type: String, required: true, select: false },
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
    usageQuota: {
      minutesPerMonth: { type: Number, default: 60 },
      tokensPerMonth: { type: Number, default: 100000 },
    },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ createdAt: -1 });

export const User = mongoose.model<IUser>('User', UserSchema);
