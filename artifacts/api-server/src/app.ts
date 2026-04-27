import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

app.use("/api", router);

const publicDir = path.resolve(process.cwd(), "public");
const indexPath = path.join(publicDir, "index.html");

if (existsSync(publicDir)) {
  app.use(express.static(publicDir));

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res, next) => {
    if (!existsSync(indexPath)) {
      next();
      return;
    }

    res.sendFile(indexPath);
  });
}

export default app;
