import { z } from "zod";
import { db } from "../../db/client";
import {
  students,
  classes: classesTable,
  terms: termsTable,
  academicSessions,
} from "../../db/schema";
import { eq } from "drizzle-orm";

// Helper to parse a CSV line respecting quoted fields
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  let current = "";
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      current += ch;
      i++;
    } else {
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ",") {
        fields.push(current);
        current = "";
        i++;
        continue;
      }
      if (ch === "\n" || ch === "\r") {
        // end of line
        fields.push(current);
        current = "";
        // skip subsequent CR/LF
        while (i < line.length && (line[i] === "\r" || line[i] === "\n")) i++;
        break;
      }
      current += ch;
      i++;
    }
  }
  fields.push(current);
  return fields;
}

// -------- Zod Schemas --------

const createStudentSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number required"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  classId: z.string().uuid("Invalid class ID"),
  termId: z.string().uuid("Invalid term ID"),
  parentId: z.string().uuid("Invalid parent ID").optional(),
});

const importStudentsCSVSchema = z.object({
  csv: z.string().min(1, "CSV content required"),
  // We expect columns: admission_number,first_name,last_name,gender,date_of_birth,class_id,term_id,parent_id
  // we'll validate each row against the schema above.
});

// -------- Server Actions --------

export async function createStudent(values: z.infer<typeof createStudentSchema>) {
  const parsed = createStudentSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.format() };
  }

  const {
    admissionNumber,
    firstName,
    lastName,
    gender,
    dateOfBirth,
    classId,
    termId,
    parentId,
  } = parsed.data;

  // Verify class exists
  const cls = await db.select().from(classesTable).where(eq(classesTable.id, classId)).limit(1);
  if (cls.length === 0) {
    return { success: false, error: "Selected class not found" };
  }

  // Verify term exists
  const term = await db.select().from(termsTable).where(eq(termsTable.id, termId)).limit(1);
  if (term.length === 0) {
    return { success: false, error: "Selected term not found" };
  }

  const [newStudent] = await db
    .insert(students)
    .values({
      admissionNumber,
      firstName,
      lastName,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      classId,
      termId,
      parentId,
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  return { success: true, data: newStudent };
}

// CSV bulk import: returns { success, created, errors: string[] }
export async function importStudentsCSV(csvContent: string) {
  const lines = csvContent.split("\n").filter((l) => l.trim());
  if (lines.length < 2) {
    // header + at least one data row
    return { success: false, created: 0, errors: ["CSV must contain at least one data row"] };
  }

  // First line is header; we expect exact column names
  const header = parseCSVLine(lines[0]);
  const expected = ["admission_number", "first_name", "last_name", "gender", "date_of_birth", "class_id", "term_id", "parent_id"];
  const headerOk = expected.every((h) => header.some((h2) => h2.toLowerCase() === h));
  if (!headerOk) {
    return {
      success: false,
      created: 0,
      errors: ["CSV header does not match expected columns. Expected: " + expected.join(", ")],
    };
  }

  const errors: string[] = [];
  let created = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < expected.length) {
      errors.push(`Row ${i + 1}: not enough columns`);
      continue;
    }

    const rowObj: Record<string, string> = {};
    expected.forEach((col, idx) => {
      rowObj[col] = fields[idx] || "";
    });

    // Validate using Zod
    const createResult = createStudentSchema.safeParse({
      admissionNumber: rowObj.admission_number,
      firstName: rowObj.first_name,
      lastName: rowObj.last_name,
      gender: rowObj.gender,
      dateOfBirth: rowObj.date_of_birth,
      classId: rowObj.class_id,
      termId: rowObj.term_id,
      parentId: rowObj.parent_id,
    });

    if (!createResult.success) {
      errors.push(`Row ${i + 1}: ${createResult.error.format()}`);
      continue;
    }

    const result = await createStudent(createResult.data);
    if (!result.success) {
      errors.push(`Row ${i + 1}: ${result.error?.error || "Unknown error"}`);
      continue;
    }
    created++;
  }

  return { success: true, created, errors };
}

// Export types
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type ImportStudentsCSVInput = z.infer<typeof importStudentsCSVSchema>;