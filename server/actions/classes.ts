import { z } from "zod";
import { db } from "../../db/client";
import {
  academicSessions,
  classes: classesTable,
  students: studentsTable,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

// -------- Zod Schemas ---------

const createClassSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  sessionId: z.string().uuid("Invalid session ID"),
  gradeLevel: z.string().optional(),
});

const updateClassSchema = createClassSchema.partial();

const deleteClassSchema = z.object({
  id: z.string().uuid("Invalid class ID"),
});

// --------- Server Actions ---------

export async function createClass(values: z.infer<typeof createClassSchema>) {
  const parsed = createClassSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { name, sessionId, gradeLevel } = parsed.data;

  // Ensure the session exists and is active (optional business rule)
  const session = await db.select().from(academicSessions).where(eq(academicSessions.id, sessionId)).limit(1);
  if (session.length === 0) {
    return { success: false, error: "Selected academic session not found" };
  }

  const [newClass] = await db
    .insert(classesTable)
    .values({ name, sessionId, gradeLevel, createdAt: new Date(), updatedAt: new Date() })
    .returning();

  return { success: true, data: newClass };
}

export async function updateClass(values: z.infer<typeof updateClassSchema>) {
  const parsed = updateClassSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { id, name, sessionId, gradeLevel } = parsed.data;

  // Verify class exists
  const existing = await db.select().from(classesTable).where(eq(classesTable.id, id)).limit(1);
  if (existing.length === 0) {
    return { success: false, error: "Class not found" };
  }

  const [updated] = await db
    .update(classesTable)
    .values({ name, gradeLevel, updatedAt: new Date() })
    .where(eq(classesTable.id, id))
    .returning();

  return { success: true, data: updated };
}

export async function deleteClass(values: z.infer<typeof deleteClassSchema>) {
  const parsed = deleteClassSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { id } = parsed.data;

  // Optionally check for dependent records (students, subjects)
  const deps = await db.select().from(studentsTable).where(eq(studentsTable.classId, id)).limit(1);
  if (deps.length > 0) {
    return { success: false, error: "Cannot delete class: students are still assigned." };
  }

  await db.delete(classesTable).where(eq(classesTable.id, id));

  return { success: true, data: { id } };
}

// Helper: list classes for a session (optional)
export async function listClasses(sessionId: string) {
  return await db.select().from(classesTable).where(eq(classesTable.sessionId, sessionId));
}

// Export the schema types for usage in forms etc.
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type DeleteClassInput = z.infer<typeof deleteClassSchema>;