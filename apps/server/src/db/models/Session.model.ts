import mongoose, { Schema, Document } from 'mongoose';

interface ISessionMetadata {
  clientVersion: string;
  platform: 'ios' | 'android' | 'desktop' | 'web';
  asrModel: string;
  llmModel: string;
  ttsVoice: string;
}

export interface ISession extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  startedAt: Date;
  endedAt?: Date;
  status: 'active' | 'completed' | 'error';
  totalTurns: number;
  totalAudioMs: number;
  totalTokens: number;
  metadata: ISessionMetadata;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['active', 'completed', 'error'], default: 'active' },
    totalTurns: { type: Number, default: 0 },
    totalAudioMs: { type: Number, default: 0 },
    totalTokens: { type: Number, default: 0 },
    metadata: {
      clientVersion: { type: String, default: '1.0.0' },
      platform: { type: String, enum: ['ios', 'android', 'desktop', 'web'], default: 'desktop' },
      asrModel: { type: String, default: 'nova-2' },
      llmModel: { type: String, default: 'llama-3.1-8b-instant' },
      ttsVoice: { type: String, default: 'e00d0e4c-a5c8-443f-a8a3-473eb9a62355' },
    },
  },
  { timestamps: true }
);

SessionSchema.index({ sessionId: 1 }, { unique: true });
SessionSchema.index({ userId: 1, startedAt: -1 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
