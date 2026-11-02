import { z } from "zod";
import { db } from "../../db/client";
import {
  results,
  students,
  subjects,
  terms,
} from "../../db/schema";
import { eq, sql } from "drizzle-orm";

// -------- Zod Schemas --------

const publishResultSchema = z.object({
  resultId: z.string().uuid("Invalid result ID"),
  published: z.boolean(),
});

const createResultSchema = z.object({
  studentId: z.string().uuid("Invalid student ID"),
  subjectId: z.string().uuid("Invalid subject ID"),
  termId: z.string().uuid("Invalid term ID"),
  score: z.number().int().min(0).max(100),
  grade: z.string().optional(),
});

// -------- Server Actions --------

export async function publishResult(values: z.infer<typeof publishResultSchema>) {
  const parsed = publishResultSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { resultId, published } = parsed.data;

  // Find the result
  const [res] = await db.select().from(results).where(eq(results.id, resultId)).limit(1);
  if (!res) {
    return { success: false, error: "Result not found" };
  }

  // Prevent publishing unpublished results visible to parents (business rule)
  // Actually we just toggle the published flag.

  const [updated] = await db
    .update(results)
    .values({ published, publishedAt: published ? new Date() : null, updatedAt: new Date() })
    .where(eq(results.id, resultId))
    .returning();

  // TODO: Insert audit log entry (action: "RESULT_PUBLISHED" or "RESULT_UNPUBLISHED")
  // auditLogs.insert({ action: published ? "RESULT_PUBLISHED" : "RESULT_UNPUBLISHED", entityType: "RESULT", entityId: resultId, performedBy: <admin-id>, details: "" });

  return { success: true, data: updated };
}

export async function createResult(values: z.infer<typeof createResultSchema>) {
  const parsed = createResultSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const { studentId, subjectId, termId, score, grade } = parsed.data;

  // Verify student, subject, term exist
  const [student] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  const [subj] = await db.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1);
  const [t] = await db.select().from(terms).where(eq(terms.id, termId)).limit(1);
  if (!student) return { success: false, error: "Student not found" };
  if (!subj) return { success: false, error: "Subject not found" };
  if (!t) return { success: false, error: "Term not found" };

  // Check if a result already exists for this student+subject+term combination
  const existing = await db.select().from(results).where(
    eq(results.studentId, studentId),
    eq(results.subjectId, subjectId),
    eq(results.termId, termId),
  ).limit(1);

  if (existing.length > 0) {
    return { success: false, error: "A result already exists for this student, subject, and term. Use publish/unpublish to toggle visibility." };
  }

  const [newResult] = await db
    .insert(results)
    .values({
      studentId,
      subjectId,
      termId,
      score,
      grade,
      published: false, // new results are unpublished by default
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { success: true, data: newResult };
}

// -------- Helper: getPublishedResults --------

/**
 * Returns all published results for a given student and term.
 * Other modules can import this helper to know which results are visible to parents.
 */
export async function getPublishedResults(studentId: string, termId: string) {
  return await db
    .select({
      resultId: results.id,
      subjectName: subjects.name,
      score: results.score,
      grade: results.grade,
      published: results.published,
    })
    .from(results)
    .where(eq(results.studentId, studentId), eq(results.termId, termId))
    .innerJoin(subjects, eq(results.subjectId, subjects.id))
    .where(eq(results.published, true));
}

// -------- Export Types --------

export type PublishResultInput = z.infer<typeof publishResultSchema>;
export type CreateResultInput = z.infer<typeof createResultSchema>;
export type GetPublishedResults = Awaited<ReturnType<typeof getPublishedResults>>;