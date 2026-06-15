import mongoose, { Schema, Document } from 'mongoose';

interface ILatency {
  asrFinalMs: number;
  llmTtftMs: number;
  ttfbMs: number;
  e2eMs: number;
}

interface ITurn {
  turnId: string;
  role: 'user' | 'assistant';
  text: string;
  audioLengthMs?: number;
  interrupted: boolean;
  latency: ILatency;
  timestamp: Date;
}

export interface IConversation extends Document {
  sessionId: string;
  userId: mongoose.Types.ObjectId;
  turns: ITurn[];
  createdAt: Date;
  updatedAt: Date;
}

const TurnSchema = new Schema<ITurn>(
  {
    turnId: { type: String, required: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    audioLengthMs: { type: Number },
    interrupted: { type: Boolean, default: false },
    latency: {
      asrFinalMs: { type: Number, default: 0 },
      llmTtftMs: { type: Number, default: 0 },
      ttfbMs: { type: Number, default: 0 },
      e2eMs: { type: Number, default: 0 },
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new Schema<IConversation>(
  {
    sessionId: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    turns: { type: [TurnSchema], default: [] },
  },
  { timestamps: true }
);

ConversationSchema.index({ sessionId: 1 });
ConversationSchema.index({ userId: 1, createdAt: -1 });
ConversationSchema.index({ 'turns.turnId': 1 }, { sparse: true });

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
