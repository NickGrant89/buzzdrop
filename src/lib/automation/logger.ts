import { v4 as uuidv4 } from "uuid";
import { db } from "../db";

export async function logAutomation(
  jobType: string,
  status: "success" | "error",
  message: string,
  details?: Record<string, unknown>
) {
  db.prepare(
    "INSERT INTO automation_logs (id, job_type, status, message, details, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    uuidv4(),
    jobType,
    status,
    message,
    details ? JSON.stringify(details) : null,
    new Date().toISOString()
  );
}

export function getRecentLogs(limit = 20) {
  return db
    .prepare("SELECT * FROM automation_logs ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}
