import { Request, Response } from "express";
import Task from "../models/Task.js";
import TimeLog from "../models/TimeLog.js";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { createTaskSchema, updateTaskSchema } from "../validators/task.validator.js";

const getUserId = (req: Request): string => {
  const user = (req as AuthenticatedRequest).user;

  if (!user) {
    throw new Error("Authentication required");
  }

  return user.id;
};

export const getTasks = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const tasks = await Task.find({ userId }).sort({ updatedAt: -1 }).lean();

    const taskIds = tasks.map((task) => task._id.toString());
    const logs = await TimeLog.find({ userId, taskId: { $in: taskIds } }).sort({ startedAt: 1 }).lean();

    const totalByTask = new Map<string, number>();
    for (const log of logs) {
      totalByTask.set(String(log.taskId), (totalByTask.get(String(log.taskId)) ?? 0) + (log.durationMs ?? 0));
    }

    const transformedTasks = tasks.map((task) => ({
      ...task,
      _id: task._id.toString(),
      totalTrackedMs: totalByTask.get(task._id.toString()) ?? 0,
    }));

    res.status(200).json({
      success: true,
      tasks: transformedTasks,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const parsed = createTaskSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task data",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const task = await Task.create({
      userId,
      ...parsed.data,
    });

    res.status(201).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while creating the task",
    });
  }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const parsed = updateTaskSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Invalid task data",
        errors: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const task = await Task.findOne({ _id: req.params.id, userId });

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    Object.assign(task, parsed.data);
    await task.save();

    res.status(200).json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while updating the task",
    });
  }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const task = await Task.findOne({ _id: req.params.id, userId });

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    await TimeLog.deleteMany({ taskId: task._id, userId });
    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while deleting the task",
    });
  }
};

export const getTaskTimeLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const task = await Task.findOne({ _id: req.params.id, userId }).select("_id").lean();

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const logs = await TimeLog.find({ userId, taskId: task._id }).sort({ startedAt: -1 }).lean();

    res.status(200).json({
      success: true,
      logs,
    });
  } catch (error) {
    console.error("Get task time logs error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while loading time logs",
    });
  }
};

export const startTaskTimer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const task = await Task.findOne({ _id: req.params.id, userId });

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const activeLog = await TimeLog.findOne({
      userId,
      taskId: task._id,
      endedAt: null,
    });

    if (activeLog) {
      res.status(409).json({
        success: false,
        message: "This task is already being tracked",
      });
      return;
    }

    const now = new Date();
    const otherActiveLogs = await TimeLog.find({
      userId,
      taskId: { $ne: task._id },
      endedAt: null,
    });

    for (const log of otherActiveLogs) {
      log.endedAt = now;
      log.durationMs = Math.max(0, now.getTime() - log.startedAt.getTime());
      await log.save();
    }

    if (otherActiveLogs.length > 0) {
      await Task.updateMany(
        { userId, _id: { $in: otherActiveLogs.map((log) => log.taskId) }, status: "In Progress" },
        { $set: { status: "Pending" } }
      );
    }

    task.status = "In Progress";
    await task.save();

    const log = await TimeLog.create({
      userId,
      taskId: task._id,
      startedAt: new Date(),
      endedAt: null,
      durationMs: 0,
    });

    res.status(200).json({
      success: true,
      message: "Timer started",
      log,
    });
  } catch (error) {
    console.error("Start task timer error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while starting the timer",
    });
  }
};

export const stopTaskTimer = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const task = await Task.findOne({ _id: req.params.id, userId });

    if (!task) {
      res.status(404).json({
        success: false,
        message: "Task not found",
      });
      return;
    }

    const activeLog = await TimeLog.findOne({
      userId,
      taskId: task._id,
      endedAt: null,
    });

    if (!activeLog) {
      res.status(400).json({
        success: false,
        message: "No active timer found for this task",
      });
      return;
    }

    const endedAt = new Date();
    const durationMs = endedAt.getTime() - activeLog.startedAt.getTime();

    activeLog.endedAt = endedAt;
    activeLog.durationMs = durationMs;
    await activeLog.save();

    task.status = "Pending";
    await task.save();

    res.status(200).json({
      success: true,
      message: "Timer stopped",
      log: activeLog,
    });
  } catch (error) {
    console.error("Stop task timer error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while stopping the timer",
    });
  }
};

export const getDailySummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await TimeLog.find({
      userId,
      startedAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ startedAt: 1 }).lean();

    const totalTrackedMs = logs.reduce((sum, log) => sum + (log.durationMs ?? 0), 0);
    const taskIds = [...new Set(logs.map((log) => log.taskId.toString()))];
    const tasks = await Task.find({ userId, _id: { $in: taskIds } }).lean();

    res.status(200).json({
      success: true,
      summary: {
        tasksWorkedOn: tasks.length,
        totalTrackedMs,
        completedTasks: await Task.countDocuments({ userId, status: "Completed" }),
        pendingTasks: await Task.countDocuments({ userId, status: "Pending" }),
        inProgressTasks: await Task.countDocuments({ userId, status: "In Progress" }),
      },
    });
  } catch (error) {
    console.error("Daily summary error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while generating the summary",
    });
  }
};
