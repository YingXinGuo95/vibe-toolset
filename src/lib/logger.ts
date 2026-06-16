/**
 * Server-side logger using pino.
 *
 * Outputs structured JSON to stdout — works on Vercel (captured by Vercel Logs)
 * and self-hosted environments alike.
 *
 * ## Self-hosted: extend to file output
 * When deploying to your own server, add a file transport:
 *
 * ```ts
 * const fileTransport = pino.transport({
 *   target: "pino/file",
 *   options: { destination: "/var/log/app.log", mkdir: true },
 * });
 * const logger = pino(fileTransport);
 * ```
 *
 * Log levels: fatal, error, warn, info, debug, trace
 * Use `logger.child({ requestId, ... })` for request-scoped logging.
 */

import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export default logger;
