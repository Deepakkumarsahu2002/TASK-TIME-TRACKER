import mongoose, { Document, Schema, Types } from "mongoose";

export interface ITimeLog extends Document {
  userId: Types.ObjectId;
  taskId: Types.ObjectId;
  startedAt: Date;
  endedAt?: Date | null;
  durationMs: number;
  createdAt: Date;
  updatedAt: Date;
}

const timeLogSchema = new Schema<ITimeLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const TimeLog = mongoose.model<ITimeLog>("TimeLog", timeLogSchema);

export default TimeLog;
