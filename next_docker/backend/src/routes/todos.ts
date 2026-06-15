import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/todos - list all todos
router.get("/", async (_req, res) => {
  const todos = await prisma.todo.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json(todos);
});

// GET /api/todos/:id - get a single todo
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const todo = await prisma.todo.findUnique({ where: { id } });
  if (!todo) {
    return res.status(404).json({ error: "Todo not found" });
  }

  res.json(todo);
});

// POST /api/todos - create a todo
router.post("/", async (req, res) => {
  const { title, description } = req.body ?? {};

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required" });
  }

  const todo = await prisma.todo.create({
    data: {
      title: title.trim(),
      description: typeof description === "string" ? description : null,
    },
  });

  res.status(201).json(todo);
});

// PUT /api/todos/:id - update a todo
router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const { title, description, completed } = req.body ?? {};

  try {
    const todo = await prisma.todo.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(completed !== undefined && { completed }),
      },
    });

    res.json(todo);
  } catch {
    res.status(404).json({ error: "Todo not found" });
  }
});

// DELETE /api/todos/:id - delete a todo
router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    await prisma.todo.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Todo not found" });
  }
});

export default router;
