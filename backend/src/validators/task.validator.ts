import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters long").max(120, "Title is too long"),
  description: z.string().trim().max(500, "Description is too long").optional().default(""),
  status: z.enum(["Pending", "In Progress", "Completed"]).default("Pending"),
});

export const updateTaskSchema = createTaskSchema.partial();
