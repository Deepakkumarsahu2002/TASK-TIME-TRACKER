import { Router } from "express";
import {
  createTask,
  deleteTask,
  getDailySummary,
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
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/:id/start", startTaskTimer);
router.post("/:id/stop", stopTaskTimer);

export default router;
