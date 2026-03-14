import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  base: undefined,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: any) => req.headers["x-request-id"]?.toString() || randomUUID(),
  customLogLevel: (res: any, err: any) => (err ? "error" : (res.statusCode || 200) >= 500 ? "error" : (res.statusCode || 200) >= 400 ? "warn" : "info"),
  serializers: {
    req(req: any) { return { id: req.id, method: req.method, url: req.url }; },
    res(res: any) { return { statusCode: res.statusCode || 200 }; },
  },
});