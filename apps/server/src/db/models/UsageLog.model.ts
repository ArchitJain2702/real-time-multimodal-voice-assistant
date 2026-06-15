import mongoose, { Schema, Document } from 'mongoose';

export interface IUsageLog extends Document {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  period: string; // 'YYYY-MM'
  service: 'deepgram' | 'groq' | 'cartesia';
  units: number;
  costUSD: number;
  timestamp: Date;
}

const UsageLogSchema = new Schema<IUsageLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: String, required: true },
    period: { type: String, required: true },
    service: { type: String, enum: ['deepgram', 'groq', 'cartesia'], required: true },
    units: { type: Number, required: true },
    costUSD: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
  }
);

UsageLogSchema.index({ userId: 1, period: 1, service: 1 });
UsageLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90-day TTL

export const UsageLog = mongoose.model<IUsageLog>('UsageLog', UsageLogSchema);
