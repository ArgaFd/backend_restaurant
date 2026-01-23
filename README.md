# POS SO Backend 🚀

The engine for the POS SO management system. Built with Node.js and Express, designed for high-performance transaction handling and real-time status tracking.

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: 
  - **Primary**: PostgreSQL (via Sequelize ORM)
  - **Secondary/Diagnostic**: MongoDB
- **Authentication**: JSON Web Token (JWT)
- **Emailing**: Nodemailer (SMTP)
- **Payments**: Midtrans API Integration

---

## 🏗 System Architecture & Design

### 1. Use Case Diagram
Diagram ini menggambarkan siapa saja pengguna sistem (Aktor) dan apa saja fungsi utama yang bisa mereka lakukan.

```mermaid
useCaseDiagram
    actor "Customer" as C
    actor "Staff (Waiter/Chef/Cashier)" as S
    actor "Owner" as O

    package "Restaurant POS System" {
        usecase "Scan QR Table" as UC1
        usecase "View Digital Menu" as UC2
        usecase "Place Order" as UC3
        usecase "Track Order Status" as UC4
        
        usecase "Manage Orders" as UC5
        usecase "Process Payment" as UC6
        usecase "Update Menu Availability" as UC7
        
        usecase "Manage Staff Account" as UC8
        usecase "View Sales Reports" as UC9
        usecase "Manage Menu Content" as UC10
    }

    C --> UC1
    C --> UC2
    C --> UC3
    C --> UC4

    S --> UC5
    S --> UC6
    S --> UC7

    O --> UC8
    O --> UC9
    O --> UC10
    O --> UC5
```

**Penjelasan:**
- **Customer**: Berinteraksi secara mandiri melalui mobile device (Scan QR). Fokus pada reservasi meja dan pemesanan.
- **Staff**: Mengelola siklus hidup pesanan (Kitchen/Service) dan pembayaran.
- **Owner**: Memegang kontrol penuh atas inventaris (Menu), SDM (Staff), dan analitik (Reports).

---

### 2. System Flowmap (Data Flow)
Diagram ini menjelaskan bagaimana data berpindah antar komponen teknis.

```mermaid
graph TD
    subgraph "Frontend (Vercel)"
        UI[React Mobile/Web UI]
        State[Auth & Cart State]
    end

    subgraph "Backend (Railway)"
        API[Node.js Express API]
        Auth[JWT Middleware]
        Logic[Business Logic]
    end

    subgraph "Database (Railway)"
        DB[(PostgreSQL)]
    end

    UI <-->|HTTPS / JSON| API
    API <--> Logic
    Logic <--> Auth
    Logic <--> DB
```

**Penjelasan:**
1. **Frontend** mengirimkan request JSON melalui koneksi HTTPS yang aman.
2. **Backend** memverifikasi identitas pengguna menggunakan **JWT Middleware**.
3. **Business Logic** memproses data (misal: menghitung total harga, mengecek stok).
4. **PostgreSQL** menyimpan semua data transaksi secara permanen dan konsisten.

---

### 3. Entity Relationship Diagram (ERD)
Struktur database dan hubungan antar tabel data.

```mermaid
erDiagram
    users ||--o{ Orders : "creates"
    Menus ||--o{ OrderItems : "contains"
    Orders ||--|{ OrderItems : "has"
    Orders ||--o| Payments : "has"
    Orders ||--o{ SalesStats : "aggregates"

    users {
        bigint id PK
        string name
        string email UK
        string password_hash
        string role "owner, staff"
    }

    Menus {
        bigint id PK
        string name
        decimal price
        string category
        string status "available, unavailable"
    }

    Orders {
        bigint id PK
        string tableNumber
        jsonb items "Array of menu items"
        decimal totalAmount
        string status "pending, completed, etc"
    }

    Payments {
        bigint id PK
        bigint orderId FK
        decimal amount
        string status "success, failed"
    }

    SalesStats {
        bigint id PK
        date date UK
        int totalOrders
        decimal totalRevenue
    }
```

**Penjelasan Relasi:**
- **Orders.items (JSONB)**: Ini adalah fitur unggulan dimana detail item pesanan disimpan dalam satu kolom JSON, sehingga query lebih cepat tanpa banyak join tabel.
- **Payments**: Terhubung langsung ke Order ID (`One-to-One`).
- **SalesStats**: Tabel khusus untuk mempercepat loading grafik dashboard owner dengan menyimpan Ringkasan harian.

---

### 4. Role Flowcharts

#### **Customer Flow (Pemesanan Mandiri)**
```mermaid
flowchart TD
    Start([Mulai]) --> Scan[Scan QR di Meja]
    Scan --> Browse[Lihat Menu Digital]
    Browse --> Cart[Pilih Menu & Keranjang]
    Cart --> Order[Checkout / Buat Pesanan]
    Order --> Wait[Tunggu Konfirmasi Staff]
    Wait --> Serve[Pesanan Diantar]
    Serve --> Finish([Selesai])
```

#### **Staff Flow (Manajemen Pesanan)**
```mermaid
flowchart TD
    Login([Login Staff]) --> Dashboard[Dashboard Live Orders]
    Dashboard --> New{Ada Pesanan Baru?}
    New -->|Ya| Accept[Terima & Update ke 'Preparing']
    Accept --> Cook[Chef Memasak]
    Cook --> Ready[Update ke 'Ready']
    Ready --> Deliver[Antar ke Meja]
    Deliver --> Pay[Proses Pembayaran]
    Pay --> Complete[Status 'Completed']
```

#### **Owner Flow (Kontrol & Analitik)**
```mermaid
flowchart TD
    Login([Login Owner]) --> Dash[Admin Dashboard]
    Dash --> Action{Pilih Aksi}
    Action -->|Menu| ManageMenu[Manage Katalog Menu]
    Action -->|User| ManageStaff[Kelola Staff & Role]
    Action -->|Report| ViewSales[Dashboard Grafik Penjualan]
```

---

### 5. Sequence Diagram: Scan QR & Lihat Menu
Diagram ini mendetailkan interaksi langkah-demi-langkah antara Customer, Browser/Frontend, Backend, dan Database saat proses inisiasi awal.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as React APP (Vercel)
    participant Backend as Express API (Railway)
    participant DB as PostgreSQL

    Customer->>Frontend: Scan QR Code di Meja
    Note right of Customer: URL: /menu?table=5
    Frontend->>Frontend: Parsing Parameter Table Number
    Frontend->>Backend: GET /api/menu (Request Data Menu)
    Backend->>DB: SELECT * FROM "Menus" WHERE status = 'available'
    DB-->>Backend: Data Menu Items
    Backend-->>Frontend: JSON Response (Menu Data)
    Frontend->>Frontend: Render Menu UI
    Frontend-->>Customer: Tampilan Menu Digital & Nomor Meja
```

**Penjelasan:**
1. **Inisiasi**: Pengguna melakukan aksi fisik (scanning) yang mengarahkan browser ke URL spesifik meja.
2. **Parsing**: Frontend mendeteksi nomor meja dari URL agar pesanan nanti otomatis tercatat di meja yang benar.
3. **Data Fetching**: Frontend meminta daftar menu terbaru yang tersedia dari server.
4. **Respon**: Data dikirim dalam format JSON dan ditampilkan ke pengguna dalam UI yang interaktif.

---

### 6. Sequence Diagram: Input & Bayar Pesanan
Alur proses dari pelanggan memilih menu hingga melakukan pembayaran.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as Mobile App
    participant Backend as Express API
    participant PG as PostgreSQL
    participant Midtrans as Midtrans Gateway

    Customer->>Frontend: Klik Pesan (Checkout)
    Frontend->>Backend: POST /api/orders (items, table_id)
    Backend->>PG: INSERT INTO "Orders" (status: 'pending')
    PG-->>Backend: Order Created (ID: 101)
    Backend-->>Frontend: Success (Order ID)
    
    Customer->>Frontend: Pilih Metode Bayar (QRIS/Card)
    Frontend->>Backend: POST /api/payments/:order_id
    Backend->>Midtrans: Create Transaction Request
    Midtrans-->>Backend: Token/Snap URL
    Backend-->>Frontend: Snap URL/QR Data
    
    Midtrans->>Backend: Webhook Notification (Success)
    Backend->>PG: UPDATE "Orders" (payment_status: 'paid')
    Backend->>PG: SELECT items (Calculate stats)
    Backend->>PG: UPDATE "SalesStats"
```

---

### 7. Sequence Diagram: Update Status Pesanan & Dashboard
Bagaimana Staff memproses pesanan dan Owner melihat hasil akhirnya.

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    actor Owner
    participant Frontend as Dashboard UI
    participant Backend as Express API
    participant PG as PostgreSQL

    Staff->>Frontend: Klik 'Terima' Pesanan
    Frontend->>Backend: PUT /api/orders/:id/status (Preparing)
    Backend->>PG: UPDATE "Orders" SET status = 'preparing'
    PG-->>Backend: Success
    Backend-->>Frontend: Updated UI
    
    Note over Owner, PG: --- Skenario Analitik ---
    
    Owner->>Frontend: Buka Laporan Penjualan
    Frontend->>Backend: GET /api/owner/reports (Range: Today)
    Backend->>PG: SELECT * FROM "SalesStats" WHERE date = today
    PG-->>Backend: Sales Data (Revenue, Count)
    Backend-->>Frontend: JSON Data for Charts
    Frontend->>Frontend: Render Grafik Pendapatan
```

---

### 8. Sequence Diagram: Manajemen Data (Menu & Staff)
Proses pengelolaan infrastruktur aplikasi oleh Owner.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant Frontend as Admin Dashboard
    participant Backend as Express API
    participant PG as PostgreSQL

    Note right of Owner: Kelola Menu
    Owner->>Frontend: Klik 'Tambah Menu'
    Frontend->>Backend: POST /api/menus (name, price, image)
    Backend->>PG: INSERT INTO "Menus"
    PG-->>Backend: Menu Created
    Backend-->>Frontend: Updated Menu List

    Note right of Owner: Kelola Staff
    Owner->>Frontend: Registrasi Akun Staff Baru
    Frontend->>Backend: POST /api/auth/register (role: 'staff')
    Backend->>PG: INSERT INTO "users" (password_hash)
    PG-->>Backend: Staff Created
    Backend-->>Frontend: Success (Staff Added)
```

---

## 📂 Project Directory
- `/controllers`: Logika endpoint (Auth, Orders, Menu).
- `/models`: Definisi skema database PostgreSQL.
- `/routes`: Pintu masuk API.
- `/services`: Integrasi pihak ketiga (Midtrans, Email).
- `/middleware`: Keamanan & Verifikasi Auth.

## ⚙️ Setup Lokal
1. `npm install`
2. Konfigurasi `.env` sesuai `.env.example`.
3. `npm run dev`

---
Built with ❤️ for POS SO.
