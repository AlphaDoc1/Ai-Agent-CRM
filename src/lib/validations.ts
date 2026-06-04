// ============================================
// Zod Validation Schemas
// ============================================
import { z } from "zod";

// ---------- Inquiry Schemas ----------

export const createInquirySchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-]{7,15}$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  state: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(50).optional().or(z.literal("")),
  message: z.string().max(2000, "Message too long").optional().or(z.literal("")),
  product_interest: z.string().max(200).optional().or(z.literal("")),
  source: z.enum(["web", "voice", "api", "manual"]),
});

export type CreateInquiryInput = z.infer<typeof createInquirySchema>;

// ---------- Distributor Schemas ----------

export const createDistributorSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .trim(),
  state: z.string().min(2, "State is required").max(50).trim(),
  region: z.string().max(50).optional().or(z.literal("")),
  city: z.string().max(50).optional().or(z.literal("")),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-]{7,15}$/, "Invalid phone number")
    .trim(),
  email: z.string().email("Invalid email address").trim(),
  address: z.string().max(500).optional().or(z.literal("")),
});

export type CreateDistributorInput = z.infer<typeof createDistributorSchema>;

export const updateDistributorSchema = createDistributorSchema.partial();

export type UpdateDistributorInput = z.infer<typeof updateDistributorSchema>;

// ---------- Assignment Schema ----------

export const updateAssignmentSchema = z.object({
  status: z.enum(["pending", "accepted", "in_progress", "converted", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

// ---------- Login Schema ----------

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["admin", "distributor", "agent"]).default("admin"),
});

export type SignupInput = z.infer<typeof signupSchema>;
