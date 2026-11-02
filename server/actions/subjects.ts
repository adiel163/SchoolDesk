import { z } from "zod";
import { db } from "../../db/client";
import {
  subjects,
  classSubjects,
  classes: classesTable,
} from "../../db/schema";
import { eq } from "drizzle-orm";

// -------- Zod Schemas --------

const createSubjectSchema = z.object({
  name: z.string().min(1, "Subject name required"),
  code: z.string().optional(),
});

const updateSubjectSchema = createSubjectSchema.partial();

// -------- Server Actions --------

export async function createSubject(values: z.infer<typeof createSubjectSchema>) {
  const parsed = createSubjectSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { name, code } = parsed.data;

  // Check for duplicate name (case‑insensitive)
  const existing = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
  if (existing.length > 0) {
    return { success: false, error: "A subject with this name already exists" };
  }

  const [newSubject] = await db
    .insert(subjects)
    .values({ name, code, createdAt: new Date(), updatedAt: new Date() })
    .returning();

  return { success: true, data: newSubject };
}

export async function updateSubject(values: z.infer<typeof updateSubjectSchema>) {
  const parsed = updateSubjectSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { id, name, code } = parsed.data;

  // Verify subject exists
  const existing = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  if (existing.length === 0) {
    return { success: false, error: "Subject not found" };
  }

  // Prevent duplicate name when only changing other fields
  if (name && name !== existing[0].name) {
    const dup = await db.select().from(subjects).where(eq(subjects.name, name)).limit(1);
    if (dup.length > 0) {
      return { success: false, error: "A subject with this name already exists" };
    }
  }

  const [updated] = await db
    .update(subjects)
    .values({ name, code, updatedAt: new Date() })
    .where(eq(subjects.id, id))
    .returning();

  return { success: true, data: updated };
}

// -------- Assign subject to class --------

const assignSubjectToClassSchema = z.object({
  subjectId: z.string().uuid("Invalid subject ID"),
  classId: z.string().uuid("Invalid class ID"),
});

export async function assignSubjectToClass(values: z.infer<typeof assignSubjectToClassSchema>) {
  const parsed = assignSubjectToClassSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { subjectId, classId } = parsed.data;

  // Verify both exist
  const [sub] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (!sub) return { success: false, error: "Subject not found" };
  if (!cls) return { success: false, error: "Class not found" };

  // Insert into junction table (ignore if already present)
  try {
    await db.insert(classSubjects).values({ subjectId, classId }).execute();
  } catch (e) {
    // Already assigned – treat as success
  }

  return { success: true, data: { subjectId, classId } };
}

// -------- Export Types --------

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type AssignSubjectToClassInput = z.infer<typeof assignSubjectToClassSchema>;