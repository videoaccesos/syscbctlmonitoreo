import fs from "fs";
import path from "path";

// Logger con persistencia a archivo para diagnostico del servidor
// Los logs se escriben en /tmp/video-accesos.log y tambien a console

const LOG_FILE = process.env.LOG_FILE || "/tmp/video-accesos.log";
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB - rota automaticamente

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

function rotateIfNeeded() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const stats = fs.statSync(LOG_FILE);
      if (stats.size > MAX_LOG_SIZE) {
        const backup = LOG_FILE + ".old";
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
        fs.renameSync(LOG_FILE, backup);
      }
    }
  } catch {
    // Ignorar errores de rotacion
  }
}

function formatMessage(level: LogLevel, tag: string, message: string, data?: unknown): string {
  const ts = new Date().toISOString();
  let line = `[${ts}] [${level}] [${tag}] ${message}`;
  if (data !== undefined) {
    try {
      const serialized = data instanceof Error
        ? `${data.message}\n${data.stack || ""}`
        : JSON.stringify(data, null, 0);
      line += ` | ${serialized}`;
    } catch {
      line += ` | [no serializable]`;
    }
  }
  return line;
}

function writeLog(level: LogLevel, tag: string, message: string, data?: unknown) {
  const line = formatMessage(level, tag, message, data);

  // Console output
  if (level === "ERROR") {
    console.error(line);
  } else if (level === "WARN") {
    console.warn(line);
  } else {
    console.log(line);
  }

  // File output
  try {
    rotateIfNeeded();
    fs.appendFileSync(LOG_FILE, line + "\n");
  } catch {
    // Si no puede escribir al archivo, al menos ya salio por console
  }
}

export const logger = {
  info: (tag: string, message: string, data?: unknown) => writeLog("INFO", tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => writeLog("WARN", tag, message, data),
  error: (tag: string, message: string, data?: unknown) => writeLog("ERROR", tag, message, data),
  debug: (tag: string, message: string, data?: unknown) => writeLog("DEBUG", tag, message, data),
};
