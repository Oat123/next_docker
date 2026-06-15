"use client";

import { useEffect, useState, type SubmitEvent } from "react";

type Todo = {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadTodos() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/todos`);
      if (!res.ok) throw new Error("โหลดรายการไม่สำเร็จ");
      setTodos(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  function startEdit(todo: Todo) {
    setEditingId(todo.id);
    setTitle(todo.title);
    setDescription(todo.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setDescription("");
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      if (editingId === null) {
        const res = await fetch(`${API_URL}/api/todos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        if (!res.ok) throw new Error("เพิ่มรายการไม่สำเร็จ");
      } else {
        const res = await fetch(`${API_URL}/api/todos/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });
        if (!res.ok) throw new Error("แก้ไขรายการไม่สำเร็จ");
      }

      cancelEdit();
      await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleCompleted(todo: Todo) {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/todos/${todo.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !todo.completed }),
      });
      if (!res.ok) throw new Error("อัปเดตสถานะไม่สำเร็จ");
      await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/todos/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("ลบรายการไม่สำเร็จ");
      if (editingId === id) cancelEdit();
      await loadTodos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="flex flex-1 justify-center bg-zinc-50 px-4 py-12 font-sans dark:bg-black sm:px-8">
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Todo CRUD
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Next.js (frontend) + Express &amp; Prisma (backend) + MySQL
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
        >
          <input
            type="text"
            placeholder="ชื่อรายการ"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/30"
          />
          <textarea
            placeholder="รายละเอียด (ไม่บังคับ)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none focus:border-black/30 dark:border-white/[.145] dark:focus:border-white/30"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              {editingId === null ? "เพิ่มรายการ" : "บันทึกการแก้ไข"}
            </button>
            {editingId !== null && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
              >
                ยกเลิก
              </button>
            )}
          </div>
        </form>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">กำลังโหลด...</p>
        ) : todos.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            ยังไม่มีรายการ ลองเพิ่มรายการแรกของคุณ
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-start gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-900"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleCompleted(todo)}
                  className="mt-1 size-4"
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      todo.completed
                        ? "text-zinc-400 line-through dark:text-zinc-500"
                        : "text-black dark:text-zinc-50"
                    }`}
                  >
                    {todo.title}
                  </p>
                  {todo.description && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {todo.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(todo)}
                    className="text-sm font-medium text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-zinc-50"
                  >
                    แก้ไข
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
