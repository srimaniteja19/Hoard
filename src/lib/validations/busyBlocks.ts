import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createBusyBlockSchema = z
  .object({
    title: z.string().min(1).max(200),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timePattern, "Invalid time format HH:mm"),
    endTime: z.string().regex(timePattern, "Invalid time format HH:mm"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "endTime must be after startTime",
    path: ["endTime"],
  });
export type CreateBusyBlockInput = z.infer<typeof createBusyBlockSchema>;

export const updateBusyBlockSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  startTime: z.string().regex(timePattern, "Invalid time format HH:mm").optional(),
  endTime: z.string().regex(timePattern, "Invalid time format HH:mm").optional(),
});
export type UpdateBusyBlockInput = z.infer<typeof updateBusyBlockSchema>;
