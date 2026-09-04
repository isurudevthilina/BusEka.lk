// src/worker/lib/validate.ts
// Zod schemas + shared error factory

import { z } from 'zod';

// --- Schemas ---

export const CodeSchema = z.string()
  .min(6, 'That code is too short — join codes are 6 characters.')
  .max(6, 'Join codes are exactly 6 characters.')
  .regex(/^[A-Z0-9]+$/, 'Codes use uppercase letters and digits only.');

export const PinSchema = z.string()
  .min(4, 'PIN must be 4 digits.')
  .max(4, 'PIN must be 4 digits.')
  .regex(/^\d{4}$/, 'PIN must be 4 digits.');

export const PlateSchema = z.string()
  .min(4, 'Plate looks like ND-7217 or WP-CAB-1234.')
  .regex(/^[A-Z0-9\-]+$/, 'Plate looks like ND-7217 or WP-CAB-1234.');

export const CreateGroupSchema = z.object({
  name: z.string().min(3, 'Group name needs at least 3 characters.'),
  kind: z.enum(['school', 'staff', 'public', 'tour']),
  pin: PinSchema,
  pinConfirm: PinSchema,
}).refine((d) => d.pin === d.pinConfirm, {
  message: "Your PINs don't match.",
  path: ['pinConfirm'],
});

export const AddVehicleSchema = z.object({
  plate: PlateSchema,
  label: z.string().min(1, 'Label required.'),
  routeNo: z.string().optional(),
});

export const PingSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speedKmh: z.number().min(0).optional(),
  accuracyM: z.number().min(0).optional(),
});

// --- Error factory ---

export function apiErr(code: string, message: string, field?: string, status = 400) {
  return { error: { code, message, ...(field ? { field } : {}) }, status };
}
