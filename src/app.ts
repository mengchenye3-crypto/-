import express, { Request, Response } from "express";
import path from "node:path";

import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { companyRouter } from "./routes/company.routes";

const app = express();
const publicDir = path.resolve(process.cwd(), "public");

app.use(express.json());
app.use(express.static(publicDir));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "ok"
    }
  });
});

app.use("/api", companyRouter);

app.get("/", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
