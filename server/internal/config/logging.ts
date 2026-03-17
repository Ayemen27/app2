import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

const centralLogStream = {
  write(chunk: string): void {
    try {
      const parsed = JSON.parse(chunk);
      const level = parsed.level;
      const pinoLevel = level >= 50 ? 'error' : level >= 40 ? 'warn' : null;
      if (!pinoLevel) return;

      const { CentralLogService } = require('../../services/CentralLogService');
      CentralLogService.getInstance().log({
        level: pinoLevel,
        source: 'system',
        module: 'نظام',
        action: parsed.req?.method ? `${parsed.req.method} ${parsed.req.url}` : undefined,
        message: parsed.msg || parsed.message || 'System log',
        details: { pid: parsed.pid, hostname: parsed.hostname, context: parsed },
      });
    } catch {
    }
  },
};

const streams: pino.StreamEntry[] = [
  { stream: process.stdout },
  { level: 'warn' as const, stream: centralLogStream as any },
];

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || "info",
    base: undefined,
  },
  pino.multistream(streams),
);

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: any) => req.headers["x-request-id"]?.toString() || randomUUID(),
  customLogLevel: (res: any, err: any) => (err ? "error" : (res.statusCode || 200) >= 500 ? "error" : (res.statusCode || 200) >= 400 ? "warn" : "info"),
  serializers: {
    req(req: any) { return { id: req.id, method: req.method, url: req.url }; },
    res(res: any) { return { statusCode: res.statusCode || 200 }; },
  },
});