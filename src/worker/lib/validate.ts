import { z } from "zod";

// Every failing endpoint returns this shape. The frontend renders `message`
// verbatim, so all user-facing copy lives here in one place (DESIGN.md §8.2).
export type ApiError = {
  error: { code: string; message: string; field?: string };
};

export function apiError(code: string, message: string, field?: string): ApiError {
  return { error: { code, message, field } };
}

const PLATE_RE = /^[A-Z]{2,3}-?\d{4}$/;
const plateMessage = "Plate looks like ND-7217 or WP-CAB-1234.";

export const createGroupSchema = z
  .object({
    name: z.string().trim().min(3, "Group name needs at least 3 characters."),
    kind: z.enum(["school", "shuttle", "public", "tour"]),
    pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits."),
    pinConfirm: z.string(),
  })
  .refine((v) => v.pin === v.pinConfirm, {
    message: "Your PINs don't match.",
    path: ["pinConfirm"],
  })
  .refine((v) => v.pin !== "1234", {
    message: "Use a PIN that isn't 1234 or your vehicle number.",
    path: ["pin"],
  });

export const addVehicleSchema = z.object({
  plate: z
    .string()
    .trim()
    .toUpperCase()
    .regex(PLATE_RE, plateMessage),
  label: z.string().trim().min(1, "Give this vehicle a label."),
  routeNo: z.string().trim().optional(),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits."),
});

export const rotateCodeSchema = z.object({
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits."),
});

export const joinGroupSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .length(6, "That code is {n} characters — join codes are 6."),
  name: z.string().trim().min(1, "Tell us who's watching."),
});

export const drivePingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).default(0),
  accuracy: z.number().min(0).optional(),
});

export const aiPlanSchema = z.object({
  question: z.string().trim().min(1, "Tell me where you're starting from — try 'Galle to Matara'."),
});

export const reportTrainSchema = z.object({
  trainId: z.number().int(),
  stopId: z.number().int(),
  direction: z.enum(["up", "down"]).default("up"),
});
