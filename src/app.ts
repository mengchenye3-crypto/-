import express, { Request, Response } from "express";

import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { companyRouter } from "./routes/company.routes";

const app = express();

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: "ok"
    }
  });
});

app.use("/api", companyRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
