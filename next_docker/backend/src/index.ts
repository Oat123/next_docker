import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import todosRouter from "./routes/todos";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/todos", todosRouter);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
