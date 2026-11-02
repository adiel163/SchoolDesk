import { z } from "zod";
import { db } from "../../db/client";
import {
  teachers,
  classes: classesTable,
  subjects,
  teacherClasses,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

// -------- Zod Schemas --------

const createTeacherSchema = z.object({
  fullName: z.string().min(1, "Full name required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  status: z.boolean().default(true), // true = active, false = deactivated
});

const updateTeacherSchema = createTeacherSchema.partial();

const deactivateTeacherSchema = z.object({
  id: z.string().uuid("Invalid teacher ID"),
});

// -------- Server Actions --------

export async function createTeacher(values: z.infer<typeof createTeacherSchema>) {
  const parsed = createTeacherSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { fullName, email, phone, status: statusBool } = parsed.data;

  // Check for existing teacher with same email
  const existing = await db.select().from(teachers).where(eq(teachers.email, email)).limit(1);
  if (existing.length > 0) {
    return { success: false, error: "A teacher with this email already exists" };
  }

  const [newTeacher] = await db
    .insert(teachers)
    .values({ fullName, email, phone, status: statusBool, createdAt: new Date(), updatedAt: new Date() })
    .returning();

  // Optionally assign to default class/subject (can be done later)
  return { success: true, data: newTeacher };
}

export async function updateTeacher(values: z.infer<typeof updateTeacherSchema>) {
  const parsed = updateTeacherSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { id, fullName, email, phone, status: statusBool } = parsed.data;

  // Verify teacher exists
  const existing = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  if (existing.length === 0) {
    return { success: false, error: "Teacher not found" };
  }

  // Check email uniqueness if being changed
  if (email && email !== existing[0].email) {
    const dup = await db.select().from(teachers).where(eq(teachers.email, email)).limit(1);
    if (dup.length > 0) {
      return { success: false, error: "Another teacher already uses this email" };
    }
  }

  const [updated] = await db
    .update(teachers)
    .values({ fullName, email, phone, status: statusBool, updatedAt: new Date() })
    .where(eq(teachers.id, id))
    .returning();

  return { success: true, data: updated };
}

export async function deactivateTeacher(values: z.infer<typeof deactivateTeacherSchema>) {
  const parsed = deactivateTeacherSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { id } = parsed.data;

  // Verify teacher exists
  const existing = await db.select().from(teachers).where(eq(teachers.id, id)).limit(1);
  if (existing.length === 0) {
    return { success: false, error: "Teacher not found" };
  }

  // Check if teacher is assigned to any class; if so, we just set status to false (deactivated)
  const assignments = await db.select().from(teacherClasses).where(eq(teacherClasses.teacherId, id)).limit(1);
  // We allow deactivation even if assigned; parents won't see the teacher as active.

  const [deactivated] = await db
    .update(teachers)
    .values({ status: false, updatedAt: new Date() })
    .where(eq(teachers.id, id))
    .returning();

  return { success: true, data: deactivated };
}

// -------- Export Types --------

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type DeactivateTeacherInput = z.infer<typeof deactivateTeacherSchema>;