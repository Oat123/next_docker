# Todo CRUD: Next.js + Express + Prisma + MySQL (แยก Frontend / Backend ด้วย Docker)

โปรเจกตัวอย่างสำหรับสอน/เรียนรู้การทำเว็บ CRUD แบบแยก service กันคนละ container:

- **Frontend** — Next.js (App Router) แสดงหน้า UI สำหรับ เพิ่ม/แก้ไข/ลบ/ติ๊กเสร็จ รายการ Todo และเรียกใช้งาน backend ผ่าน REST API
- **Backend** — Express + TypeScript + Prisma ให้บริการ REST API (CRUD) เชื่อมต่อฐานข้อมูล MySQL
- **Database** — MySQL 8.4

ทั้ง 3 ส่วนมี `Dockerfile` ของตัวเอง และถูกประกอบเข้าด้วยกันด้วย `docker-compose.yml` ไฟล์เดียว

---

## 1. สถาปัตยกรรม (Architecture)

```
┌──────────────┐   1) เปิดเว็บ :3000          ┌──────────────┐
│   Browser    │ ────────────────────────────▶│   frontend   │
│ (ผู้ใช้งาน)  │◀──────────────────────────── │   (Next.js)  │
└──────┬───────┘   HTML/JS                     └──────────────┘
       │
       │ 2) fetch(`${NEXT_PUBLIC_API_URL}/api/todos`)
       │    เรียกตรงไป backend ที่ :4000 (ไม่ผ่าน frontend)
       ▼
┌──────────────┐   3) Prisma -> SQL            ┌──────────────┐
│   backend    │ ────────────────────────────▶│    mysql     │
│  (Express)   │◀──────────────────────────── │  (MySQL 8.4) │
└──────────────┘   mysql:3306 (docker network) └──────────────┘
   :4000 (host)                                    :3306 (host)
```

**จุดสำคัญที่สุด**: ฝั่ง browser เรียก backend ผ่าน `http://localhost:4000` โดยตรง ไม่ใช่ผ่านชื่อ service `backend` — เพราะชื่อ service ใน `docker-compose.yml` (เช่น `backend`, `mysql`) ใช้ resolve กันได้แค่ "ระหว่าง container" ผ่าน internal DNS ของ Docker เท่านั้น เบราว์เซอร์ของผู้ใช้อยู่นอก network นี้ จึงต้องเรียกผ่าน host port (`localhost:4000`) ที่ map ออกมา

---

## 2. เทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend | Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS 4 |
| Backend | Node.js 20, Express 5, TypeScript |
| ORM | Prisma 6 (`prisma-client-js`) |
| Database | MySQL 8.4 |
| Container | Docker, Docker Compose |

> **หมายเหตุเรื่องเวอร์ชัน Prisma**: ตอนเขียนโปรเจกนี้ Prisma มีเวอร์ชัน 7 ออกมาแล้ว แต่ v7 เปลี่ยนสถาปัตยกรรมแบบ breaking change เยอะมาก (ต้องใช้ driver adapter, มี `prisma.config.ts`, generate client ไปไว้ path เอง, ESM-only) ซึ่งเพิ่มความซับซ้อนเกินความจำเป็นสำหรับโปรเจกตัวอย่าง จึงเลือกใช้ Prisma 6.x ซึ่งยังเป็นรูปแบบมาตรฐาน (`datasource db { url = env("DATABASE_URL") }`, `import { PrismaClient } from "@prisma/client"`) ที่อธิบาย/สอนได้ง่ายกว่า ถ้าจะอัปเกรดในอนาคตดูได้ที่ [Prisma upgrade guide to v7](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)

---

## 3. โครงสร้างโปรเจกต์

```
next_docker/
├── app/                        # Next.js App Router (frontend)
│   ├── layout.tsx
│   ├── page.tsx                # หน้า Todo CRUD UI (client component)
│   └── globals.css
├── Dockerfile                  # Dockerfile ของ frontend (Next.js, standalone)
├── .dockerignore
├── next.config.ts              # output: "standalone" (จำเป็นสำหรับ docker)
├── package.json
│
├── backend/                     # Express + Prisma REST API
│   ├── src/
│   │   ├── index.ts             # entry point: สร้าง express app, mount routes
│   │   ├── lib/prisma.ts         # PrismaClient singleton
│   │   └── routes/todos.ts       # REST API: GET/POST/PUT/DELETE /api/todos
│   ├── prisma/
│   │   └── schema.prisma         # data model `Todo` + datasource mysql
│   ├── Dockerfile                # Dockerfile ของ backend
│   ├── .dockerignore
│   ├── package.json
│   └── .env.example               # ตัวอย่าง DATABASE_URL สำหรับรัน local
│
├── docker-compose.yml            # ประกอบ frontend + backend + mysql เข้าด้วยกัน
├── .env.example                   # ตัวแปร env สำหรับ docker-compose
└── README.md
```

---

## 4. สิ่งที่ต้องมีก่อนเริ่ม

- [Docker](https://www.docker.com/) + Docker Compose (ถ้าใช้ Docker Desktop จะมีมาให้แล้ว)
- (ถ้าจะพัฒนาแบบ local โดยไม่พึ่ง docker สำหรับ frontend/backend) Node.js >= 20.9

---

## 5. เริ่มต้นใช้งานด้วย Docker Compose (วิธีหลัก)

### ขั้นตอนที่ 1 — สร้างไฟล์ `.env`

```bash
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วปรับค่าตามต้องการ (รายละเอียดตัวแปรแต่ละตัวอยู่หัวข้อถัดไป) ค่า default ที่ให้มาใช้รันบนเครื่องตัวเองได้เลยโดยไม่ต้องแก้อะไร

### ขั้นตอนที่ 2 — Build และรันทุก service

```bash
docker compose up -d --build
```

คำสั่งนี้จะทำตามลำดับ:

1. ดึง image `mysql:8.4` มารัน และสร้างฐานข้อมูล/ผู้ใช้ตาม `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` ที่กำหนดใน `.env` (ทำครั้งแรกครั้งเดียว ตอนสร้าง volume ใหม่)
2. build image `backend` จาก `backend/Dockerfile` แล้วรอจน mysql "healthy" ก่อน → จากนั้น sync schema เข้า DB ด้วย `prisma db push` แล้ว start Express server ที่ port 4000
3. build image `frontend` จาก `Dockerfile` (root) — ตอน build จะฝังค่า `NEXT_PUBLIC_API_URL` ลงใน JS bundle แล้วรัน `next start` (standalone mode) ที่ port 3000

### ขั้นตอนที่ 3 — เปิดใช้งาน

| Service | URL |
|---|---|
| Frontend (UI) | http://localhost:3000 (หรือ port ที่ตั้งใน `FRONTEND_PORT`) |
| Backend (REST API) | http://localhost:4000/api/todos |
| MySQL | localhost:3306 (สำหรับเครื่องมือ เช่น MySQL Workbench / TablePlus / DBeaver) |
| phpMyAdmin (ดูข้อมูลใน MySQL ผ่านเบราว์เซอร์) | http://localhost:8080 (หรือ port ที่ตั้งใน `PHPMYADMIN_PORT`) |

ลองเปิด http://localhost:3000 แล้วเพิ่ม/แก้ไข/ติ๊กเสร็จ/ลบ รายการ Todo ดูได้เลย

### ดูข้อมูลใน MySQL ผ่าน phpMyAdmin (ไม่ต้องลงโปรแกรมเพิ่ม)

`docker compose up -d` จะรัน [phpMyAdmin](https://www.phpmyadmin.net/) ให้ด้วย — เป็นหน้าเว็บสำหรับดู/แก้ข้อมูลในฐานข้อมูล ไม่ต้องติดตั้ง MySQL client หรือ GUI tool ใด ๆ บนเครื่อง (ใช้ได้ทั้ง Windows/Mac/Linux)

1. เปิด http://localhost:8080 (หรือ port ที่ตั้งใน `PHPMYADMIN_PORT`)
2. กรอกฟอร์ม login (เซิร์ฟเวอร์ `mysql` ถูกตั้งค่าให้อัตโนมัติแล้วผ่าน `PMA_HOST`):
   - **Username** / **Password**: ค่าจาก `MYSQL_USER` / `MYSQL_PASSWORD` ใน `.env` (default: `app_user` / `app_password`)
3. กด Go แล้วเลือกฐานข้อมูล `crud_db` (ค่าจาก `MYSQL_DATABASE`) → ตาราง `todos` จะมีข้อมูลที่เพิ่มผ่านหน้าเว็บ Frontend

> **หมายเหตุ**: ปุ่ม/ลิงก์ port `3306:3306` ในเครื่องมือจัดการ container (เช่น Docker Desktop) เปิดในเบราว์เซอร์ไม่ได้ เพราะ MySQL คุยกันด้วย binary protocol ไม่ใช่ HTTP — ต้องใช้ผ่าน phpMyAdmin (port 8080) หรือโปรแกรม MySQL client แทน

### คำสั่งที่ใช้บ่อย

```bash
# ดู log ของทุก service (real-time)
docker compose logs -f

# ดู log เฉพาะ service ใด service หนึ่ง
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql

# ดูสถานะ container ทั้งหมด
docker compose ps

# build ใหม่เฉพาะ service เดียว (เช่น แก้โค้ด backend แล้ว)
docker compose up -d --build backend

# หยุดทุก container (ข้อมูลใน mysql ยังอยู่ เพราะเก็บใน volume)
docker compose down

# หยุด + ลบ volume (ล้างข้อมูล mysql ทั้งหมด เริ่มนับหนึ่งใหม่)
docker compose down -v
```

---

## 6. ตัวแปร Environment

### 6.1 `.env` (root) — ใช้โดย `docker-compose.yml`

| ตัวแปร | คำอธิบาย | ค่าตัวอย่าง |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | รหัสผ่าน root ของ MySQL | `root_password` |
| `MYSQL_DATABASE` | ชื่อฐานข้อมูลที่ MySQL จะสร้างให้อัตโนมัติตอนเริ่มครั้งแรก | `crud_db` |
| `MYSQL_USER` / `MYSQL_PASSWORD` | user/password ที่ backend ใช้เชื่อมต่อฐานข้อมูล | `app_user` / `app_password` |
| `NEXT_PUBLIC_API_URL` | URL ของ backend API ที่จะถูก **ฝังเข้าไปใน frontend ตอน build** | `http://localhost:4000` |
| `FRONTEND_PORT` | host port สำหรับเข้าถึง frontend (เปลี่ยนได้ถ้า 3000 ถูกใช้งานอยู่แล้ว) | `3000` |
| `PHPMYADMIN_PORT` | host port สำหรับเปิดหน้า phpMyAdmin (ดูข้อมูล MySQL ผ่านเบราว์เซอร์) | `8080` |

> **สำคัญ**: `NEXT_PUBLIC_API_URL` เป็นค่าที่ Next.js inline ลงใน JavaScript bundle ตอน `next build` (เพราะ client component ต้องรู้ค่านี้ตอนทำงานบน browser) ดังนั้นจะ "set ตอน container start" แบบ env variable ปกติไม่ได้ — ถ้าเปลี่ยนค่านี้ใน `.env` ต้อง `docker compose build frontend` (หรือ `up -d --build frontend`) ใหม่เสมอ ถึงจะมีผล

### 6.2 `backend/.env.example` — ใช้เฉพาะตอนรัน backend แบบ local (ไม่ผ่าน docker)

```env
DATABASE_URL="mysql://app_user:app_password@localhost:3306/crud_db"
PORT=4000
```

เมื่อรันผ่าน `docker compose` ค่า `DATABASE_URL` ของ backend จะถูกประกอบขึ้นอัตโนมัติจากตัวแปรใน `.env` (root) ผ่าน `docker-compose.yml`:

```
DATABASE_URL: mysql://${MYSQL_USER}:${MYSQL_PASSWORD}@mysql:3306/${MYSQL_DATABASE}
```

สังเกตว่า host คือ `mysql` (ชื่อ service) ไม่ใช่ `localhost` — เพราะ backend วิ่งอยู่ใน docker network เดียวกับ mysql

---

## 7. อธิบายไฟล์สำคัญทีละไฟล์

### 7.1 `Dockerfile` (frontend, อยู่ที่ root)

Multi-stage build 3 stage:

1. **`deps`** — copy `package.json` + `package-lock.json` แล้ว `npm ci` (ติดตั้ง dependencies)
2. **`builder`** — copy source ทั้งหมด, รับค่า `NEXT_PUBLIC_API_URL` ผ่าน build arg แล้วรัน `npm run build` (`next build`) ซึ่งจะสร้าง `.next/standalone` เพราะตั้งค่า `output: "standalone"` ไว้ใน `next.config.ts`
3. **`runner`** — copy เฉพาะไฟล์ที่จำเป็นสำหรับรัน production (`.next/standalone`, `.next/static`, `public`) แล้วรันด้วย `node server.js`

ผลคือ image สุดท้าย**เล็กกว่ามาก** เพราะไม่มี `node_modules` เต็ม ๆ หรือ source code ติดไปด้วย (เฉพาะไฟล์ที่ Next.js วิเคราะห์แล้วว่าจำเป็นต่อการรันจริงเท่านั้น)

### 7.2 `backend/Dockerfile`

Multi-stage build 3 stage เช่นกัน:

1. **`deps`** — `npm ci`
2. **`builder`** — copy source แล้วรัน `npm run build` ซึ่งคือ `prisma generate && tsc` (สร้าง Prisma Client ตาม schema + คอมไพล์ TypeScript เป็น `dist/`)
3. **`runner`** — copy `node_modules`, `dist/`, `prisma/` (ต้องมี schema ไว้ใช้ตอน `db push`) และ `package.json`

คำสั่งตอน container เริ่มทำงาน (`CMD`):

```bash
npx prisma db push --skip-generate && node dist/index.js
```

- `prisma db push` จะอ่าน `prisma/schema.prisma` แล้ว sync โครงสร้างตารางเข้า MySQL ให้ตรงกัน (สร้างตาราง `todos` ถ้ายังไม่มี) — **เหมาะกับโปรเจกง่าย ๆ/เดโมที่ยังไม่ต้องการ migration history**
- ถ้าจะทำแบบ production-grade ควรเปลี่ยนไปใช้ `prisma migrate dev` (ตอนพัฒนา, สร้างไฟล์ migration เก็บใน git) และ `prisma migrate deploy` (ตอน deploy)

### 7.3 `docker-compose.yml`

```yaml
services:
  mysql:       # MySQL 8.4 + เก็บข้อมูลถาวรด้วย volume `mysql_data`
  phpmyadmin:  # หน้าเว็บดู/แก้ข้อมูลใน mysql ผ่านเบราว์เซอร์ (รอ mysql healthy ก่อนเริ่ม)
  backend:     # build จาก ./backend, รอ mysql healthy ก่อนเริ่ม
  frontend:    # build จาก . (root), รับ NEXT_PUBLIC_API_URL เป็น build arg
```

ประเด็นที่ควรสังเกต:

- **`healthcheck` + `depends_on: condition: service_healthy`** — backend จะรอจนกว่า MySQL จะพร้อมรับ connection จริง ๆ (เช็คด้วย `mysqladmin ping`) ก่อนถึงจะ start ป้องกันปัญหา "เชื่อม DB ไม่ได้เพราะ mysql ยังตั้งค่าไม่เสร็จ"
- **internal DNS** — backend เชื่อม mysql ผ่าน host name `mysql` (ชื่อ service) ส่วนผู้ใช้/เครื่องมือภายนอกเชื่อมผ่าน `localhost:3306`
- **`volumes: mysql_data`** — ข้อมูลใน MySQL จะไม่หายแม้ `docker compose down` (จะหายเฉพาะตอนสั่ง `down -v`)
- **`build.args: NEXT_PUBLIC_API_URL`** — ส่งค่าจาก `.env` (root) เข้าไปเป็น build-time variable ของ frontend (ดูหัวข้อ 6.1)

---

## 8. REST API Reference (backend)

Base URL: `http://localhost:4000`

| Method | Path | คำอธิบาย | Request body |
|---|---|---|---|
| GET | `/health` | health check | - |
| GET | `/api/todos` | ดึงรายการทั้งหมด เรียงจากใหม่ไปเก่า | - |
| GET | `/api/todos/:id` | ดึงรายการเดียวตาม id | - |
| POST | `/api/todos` | สร้างรายการใหม่ | `{ "title": string, "description"?: string }` |
| PUT | `/api/todos/:id` | แก้ไขรายการ (ส่ง field ไหนมา จะอัปเดตเฉพาะ field นั้น) | `{ "title"?: string, "description"?: string, "completed"?: boolean }` |
| DELETE | `/api/todos/:id` | ลบรายการ | - |

ทดสอบด้วย `curl`:

```bash
# สร้างรายการใหม่
curl -X POST http://localhost:4000/api/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"ซื้อนม","description":"2 ลิตร"}'

# ดึงรายการทั้งหมด
curl http://localhost:4000/api/todos

# ติ๊กว่าทำเสร็จแล้ว (id = 1)
curl -X PUT http://localhost:4000/api/todos/1 \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# ลบรายการ (id = 1)
curl -X DELETE http://localhost:4000/api/todos/1
```

---

## 9. พัฒนาแบบ Local (ไม่ผ่าน Docker สำหรับ frontend/backend)

เหมาะตอนเขียนโค้ด/debug เพราะได้ hot-reload เร็วกว่า — ใช้ MySQL จาก docker-compose ไว้ก่อน แล้วรัน frontend/backend แบบ dev server ตรง ๆ บนเครื่อง

**1) รันแค่ MySQL ผ่าน docker:**

```bash
docker compose up -d mysql
```

**2) Backend** (เปิด terminal ที่ 1):

```bash
cd backend
cp .env.example .env
# แก้ DATABASE_URL ใน .env ให้ user/password/database ตรงกับ .env (root)
npm install
npm run db:push     # sync schema (สร้างตาราง todos) เข้า DB
npm run dev          # รันที่ http://localhost:4000 (auto-reload ด้วย tsx watch)
```

**3) Frontend** (เปิด terminal ที่ 2, ที่ root ของโปรเจก):

```bash
npm install
NEXT_PUBLIC_API_URL=http://localhost:4000 npm run dev   # รันที่ http://localhost:3000
```

> **เครื่องมือดู/แก้ข้อมูลแบบ GUI**: รัน `npx prisma studio` ใน `backend/` (ต้องมี `.env` ที่มี `DATABASE_URL` ถูกต้อง) จะเปิดเว็บที่ `http://localhost:5555` ให้ดู/แก้ข้อมูลในตาราง `todos` ได้โดยตรง

---

## 10. การต่อยอด

- **เพิ่ม field/ตารางใหม่**: แก้ `backend/prisma/schema.prisma` แล้วรัน `npm run db:push` (local) หรือ `docker compose up -d --build backend` (docker) แล้วเพิ่ม route ใหม่ใน `backend/src/routes/`
- **เพิ่มหน้า/route ใหม่ฝั่ง frontend**: เพิ่มไฟล์ใน `app/` ตามรูปแบบ Next.js App Router
- หัวข้อที่แนะนำให้ลองเพิ่มต่อ: authentication (เช่น JWT), validation ด้วย [zod](https://zod.dev/), pagination/search, unit test

---

## 11. Troubleshooting

| ปัญหา | สาเหตุ/วิธีแก้ |
|---|---|
| `Error: ... port is already allocated` | มี process/container อื่นใช้ port นั้นอยู่ (3000 / 4000 / 3306) แก้ `FRONTEND_PORT` ใน `.env` (frontend) หรือแก้ `ports:` ใน `docker-compose.yml` (backend/mysql) |
| Frontend เรียก backend ไม่ติด (`Failed to fetch`) | ส่วนใหญ่เกิดจาก `NEXT_PUBLIC_API_URL` ตอน build ไม่ตรงกับที่ browser เรียกได้จริง — ถ้าเพิ่งแก้ `.env` ต้อง `docker compose up -d --build frontend` ใหม่ และเช็คว่า backend container รันอยู่ด้วย `docker compose ps` |
| Backend ต่อ MySQL ไม่ได้ / `Can't reach database server` | เช็ค `docker compose logs mysql` ว่าขึ้น `healthy` หรือยัง และเช็คว่า `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` ใน `.env` ตรงกับที่ใช้ตอนสร้าง volume ครั้งแรก (ถ้าแก้ทีหลังต้อง `docker compose down -v` แล้วเริ่มใหม่ เพราะ MySQL สร้าง user/db แค่ตอน volume ว่างครั้งแรก) |
| แก้โค้ด backend/frontend แล้วไม่เห็นผล | ต้อง rebuild image ก่อน: `docker compose up -d --build <service>` (Docker ไม่ได้ watch ไฟล์ source ให้อัตโนมัติเหมือน dev server) |
