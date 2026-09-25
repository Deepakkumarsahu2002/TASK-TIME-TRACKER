import { Router } from "express";
import {
  createTask,
  deleteTask,
  getDailySummary,
  getTaskTimeLogs,
  getUserTimeLogs,
  getTasks,
  startTaskTimer,
  stopTaskTimer,
  updateTask,
} from "../controllers/task.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

router.use(protect);

router.get("/", getTasks);
router.get("/summary/daily", getDailySummary);
router.get("/logs", getUserTimeLogs);
router.post("/", createTask);
router.get("/:id/logs", getTaskTimeLogs);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/:id/start", startTaskTimer);
router.post("/:id/stop", stopTaskTimer);

export default router;
