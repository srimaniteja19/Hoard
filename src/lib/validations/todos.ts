import { z } from "zod";
import { todoEnergyValues, todoStateValues } from "@/db/schema";

// POST /api/todos — the composer always submits raw text; the server is the
// single source of truth for parsing it (via lib/todos/parse.ts), never the
// client's own parse result, so a stale client can't smuggle in a due date
// or estimate the server didn't independently derive.
export const createTodoSchema = z.object({
  text: z.string().min(1).max(500),
});
export type CreateTodoInput = z.infer<typeof createTodoSchema>;

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  note: z.string().max(4000).optional().nullable(),
  energy: z.enum(todoEnergyValues).optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  actualMinutes: z.number().int().positive().optional().nullable(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD")
    .optional()
    .nullable(),
  remindAt: z.string().datetime().optional().nullable(),
  recurrenceRule: z.string().max(64).optional().nullable(),
  state: z.enum(todoStateValues).optional(),
  sortOrder: z.number().int().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
  // "This and future" edit scope (TODOS.md §5): when true, any of
  // title/note/energy/estimatedMinutes/recurrenceRule present in this same
  // request are also applied to the series' root/template row, so future
  // generated instances pick them up. Past completed instances are never
  // rewritten either way.
  applyToFutureInstances: z.boolean().optional(),
});
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;

export const createSubtaskSchema = z.object({
  title: z.string().min(1).max(300),
});
export type CreateSubtaskInput = z.infer<typeof createSubtaskSchema>;

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  done: z.boolean().optional(),
});
export type UpdateSubtaskInput = z.infer<typeof updateSubtaskSchema>;
