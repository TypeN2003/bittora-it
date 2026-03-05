# Bittora IT

## 1) ชื่อโปรเจค

**Bittora IT**

## 2) รายละเอียดโปรเจค

Bittora IT เป็นระบบจัดการสินค้าและคำสั่งซื้อ (Inventory และ Order Management System)
ที่ใช้สำหรับจัดการสินค้า ผู้ใช้งาน และคำสั่งซื้อผ่านหน้า **Admin Dashboard**

โปรเจคนี้แบ่งออกเป็น 2 ส่วนหลัก

- **Frontend**: ทำงานที่ `http://localhost:3000`
- **Backend**: ทำงานที่ `http://localhost:5000` ใช้ `Node.js` และ `Express` สำหรับให้บริการ `REST API`

ฐานข้อมูลที่ใช้คือ **SQLirs**

## 3) ฟีเจอร์ของระบบ

- จัดการสินค้า
- จัดการคำสั่งซื้อ
- จัดการผู้ใช้งาน
- Dashboard สำหรับผู้ดูแลระบบ

## 4) โครงสร้างโปรเจค

ตัวอย่างโครงสร้างโฟลเดอร์

bittora-it/
├── frontend/
├── backend/
├── controllers/
├── models/
└── routes/

## 5) วิธีติดตั้งและใช้งานโปรเจค

### ขั้นตอนที่ 1: โหลดโปรเจ็คมาจาก github

```bash
git clone <https://github.com/TypeN2003/bittora-it.git>
```

### ขั้นตอนที่ 2: ติดตั้ง Backend และ Frontend

```bash
npm run install-all
```

### ขั้นตอนที่ 3: สร้างไฟล์ `.env`

สร้างไฟล์ `.env` ในโฟลเดอร์ `backend`และ `frontend`แล้วกำหนดค่า:

```.envbackend
PORT=5000
```

```.envfrontend
PORT=3000
```

### ขั้นตอนที่ 4: รัน Backend

```bash
npm run start-backend
```

### ขั้นตอนที่ 6: รัน Frontend

```bash
npm run start-frontend
```

## 6) ตัวอย่าง API

```http
GET /api/products
POST /api/products
GET /api/orders
```

## 7) เทคโนโลยีที่ใช้

- Node.js
- Express
- SQLirs
- JavaScript
- HTML
- CSS

## 8) พอร์ตที่ใช้

### Frontend

- `http://localhost:3000`

### Backend API

- `http://localhost:5000`
