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
graph LR
    subgraph "Restaurant POS System"
        UC_Login([Login & Auth])
        
        UC1([Scan QR Table])
        UC2([View Digital Menu])
        UC3([Place Order])
        UC4([Track Order Status])
        
        UC5([Manage Orders])
        UC6([Process Payment])
        UC_Print([Print Receipt])
        
        UC8([Manage Staff Account])
        UC9([View Sales Reports])
        UC10([Manage Menu Content])
    end

    C["👤 Customer"]
    S["👨‍🍳 Staff"]
    O["👑 Owner"]

    %% Direct Associations
    C --> UC1
    C --> UC2
    C --> UC3
    C --> UC4

    S --> UC5
    S --> UC6
    
    O --> UC8
    O --> UC9
    O --> UC10
    O --> UC5

    %% Include & Extend Relationships
    UC5 -. "&laquo;include&raquo;" .-> UC_Login
    UC8 -. "&laquo;include&raquo;" .-> UC_Login
    UC9 -. "&laquo;include&raquo;" .-> UC_Login
    UC10 -. "&laquo;include&raquo;" .-> UC_Login
    
    UC6 -. "&laquo;extend&raquo;" .-> UC_Print
    UC3 -. "&laquo;include&raquo;" .-> UC2
```

**Penjelasan Relasi:**
- **Association**: Garis lurus menunjukkan interaksi langsung aktor dengan fungsi.
- **`<<include>>`**: Menunjukkan fungsionalitas yang **wajib** ada. Misal: Staff/Owner **wajib** Login untuk mengelola data. `Place Order` juga menyertakan proses `View Menu`.
- **`<<extend>>`**: Menunjukkan fungsionalitas **opsional**. Misal: `Print Receipt` hanya dilakukan jika pembayaran sukses atau pelanggan meminta.

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
Dokumentasi ini menyajikan arsitektur database relasional yang dirancang untuk mendukung sistem POS SO agar memiliki integritas data yang tinggi, audit trail yang aman, dan performa dashboard yang optimal.

```mermaid
erDiagram
    users ||--o{ Orders : "manages"
    users ||--o{ AuditLog : "accountable for"
    Categories ||--o{ Menus : "classifies"
    Menus ||--o{ Orders : "referenced in items"
    Orders ||--o| Payments : "processed by"
    Orders ||--o{ SalesStats : "contributes to"

    users {
        bigint id PK
        string name "Identitas asli user/karyawan"
        string email UK "Primary identifier untuk login"
        string password_hash "Keamanan (Bcrypt encryption)"
        string role "Akses: owner atau staff"
        string status "Ketersediaan akun: active/inactive"
    }

    Categories {
        integer id PK
        string name UK "Label kategori unik (Makanan, Minuman, ds)"
        string[] subcategories "Sub-item untuk filter lebih detail"
        string icon "Representasi visual (Emoji/Icon)"
    }

    Menus {
        bigint id PK
        string name "Judul menu yang tampil di katalog"
        decimal price "Harga jual terkini"
        string category "Relasi logis ke tabel Categories"
        string image_url "Path penyimpanan gambar di server/cloud"
        string status "Ketersediaan: available atau unavailable"
    }

    Orders {
        bigint id PK
        bigint userId FK "Kaitan ke Staff yang menangani transaksi"
        string tableNumber "Lokasi meja fisik di restoran"
        jsonb items "SNAPSHOT data menu saat dipesan"
        decimal totalAmount "Kalkulasi akhir nilai transaksi"
        string status "Siklus: pending, preparing, ready, completed"
        string payment_status "Status bayar: unpaid atau paid"
    }

    Payments {
        bigint id PK
        bigint orderId FK "Kaitan wajib ke Pesanan terkait"
        string transactionId "ID unik dari Payment Gateway"
        string paymentType "Metode: QRIS, Credit Card, dll"
        decimal amount "Uang yang berhasil ditarik"
        string status "Hasil: pending, settlement, failure"
    }

    SalesStats {
        bigint id PK
        date date UK "Tanggal unik rangkuman harian"
        int totalOrders "Volume transaksi harian"
        decimal totalRevenue "Omzet kotor harian"
        jsonb hourlyBreakdown "Data grafik performa per jam"
    }

    AuditLog {
        integer id PK
        integer userId FK "Siapa yang melakukan perubahan"
        string action "Aksi audit: LOGIN, UPDATE, DELETE, dll"
        string entity "Nama tabel yang dimodifikasi"
        string entityId "ID spesifik data yang diubah"
        jsonb oldValue "Keadaan data SEBELUM perubahan"
        jsonb newValue "Keadaan data SESUDAH perubahan"
        string ipAddress "Alamat jaringan pelaku"
        timestamp timestamp "Waktu presisi kejadian (ISO 8601)"
    }
```

---

#### 📋 Penjelasan Mendalam Mengenai Tabel (Deep Dive)

Arsitektur database ini dirancang agar data tidak hanya tersimpan, tetapi juga memiliki fungsi kontrol, akurasi finansial, dan audit yang sangat ketat:

1.  **Tabel `users` (Manajemen Pengguna & Akses)**
    *   **Fungsi Utama**: Menjadi pusat kendali identitas sistem. Setiap akses ke dashboard admin (Owner atau Staff) harus melalui validasi tabel ini.
    *   **Keamanan Tingkat Tinggi**: Sistem **tidak pernah** menyimpan password dalam bentuk teks biasa. Kolom `password_hash` menyimpan kunci terenkripsi (Bcrypt) yang hampir mustahil untuk ditembus, menjamin privasi pengguna meskipun database terekspos.
    *   **Role-Based Access Control (RBAC)**: Melalui kolom `role`, sistem memisahkan hak akses secara otomatis. Owner memiliki akses ke laporan keuangan (SalesStats) dan SDM (AuditLog), sementara Staff hanya memiliki akses ke operasional pesanan (Orders).

2.  **Tabel `Categories` (Struktur Organisasi Menu)**
    *   **Fungsi Utama**: Memberikan struktur hirarkis pada katalog produk agar pelanggan tidak bingung saat memesan.
    *   **Fleksibilitas Data**: Field `subcategories` menggunakan tipe data *Array*, memungkinkan satu kategori (misal: "Minuman") memiliki banyak turunan ("Kopi", "Teh", "Susu") dalam satu baris data saja, sehingga query lebih efisien.
    *   **Daya Tarik Visual**: Kolom `icon` menyimpan informasi visual yang mempercantik tampilan menu digital di sisi pelanggan.

3.  **Tabel `Menus` (Pusat Informasi Produk)**
    *   **Fungsi Utama**: Katalog master produk restoran.
    *   **Manajemen Inventaris Digital**: Kolom `status` bertindak sebagai sakelar (*switch*). Jika menu habis, owner cukup mengubahnya ke `unavailable` agar otomatis hilang dari menu QR pelanggan tanpa menghapus riwayat datanya.

4.  **Tabel `Orders` (Inti Transaksi & Integritas Sejarah)**
    *   **Inovasi Teknologi: JSONB Snapshot**: Ini adalah bagian paling cerdas dari arsitektur ini. Sistem menyimpan data menu (Nama & Harga saat itu) langsung ke dalam satu kolom `items` berformat JSONB.
    *   **Kenapa Ini Krusial?**: Dalam dunia nyata, harga makanan sering naik-turun. Jika harga "Nasi Goreng" naik besok di tabel `Menus`, pesanan yang dibuat pelanggan hari ini tidak akan ikut naik. Data "difoto" (snapshot) pada saat transaksi dibuat agar laporan keuangan masa lalu tetap akurat selamanya.

5.  **Tabel `Payments` (Jembatan Rekonsiliasi Gateway)**
    *   **Fungsi Utama**: Mencatat bukti sah pembayaran digital.
    *   **Sinkronisasi Payment Gateway**: Kolom `transactionId` menyimpan ID unik dari Midtrans. Ini memungkinkan sistem melakukan sinkronisasi otomatis via Webhook; jika pelanggan membayar di HP-nya, database akan otomatis terupdate tanpa perlu konfirmasi manual dari kasir.

6.  **Tabel `SalesStats` (Optimasi Performa Dashboard)**
    *   **Fungsi Utama**: Tabel agregasi untuk mendukung visualisasi grafik owner.
    *   **Strategi Anti-Lag**: Jika sistem harus menghitung ribuan transaksi setiap kali Owner membuka laporan, dashboard akan menjadi sangat lambat. Tabel ini secara otomatis merangkum pendapatan kotor dan jumlah order secara harian agar tampilan grafik (Charts) muncul secara instan di layar Owner.

7.  **Tabel `AuditLog` (Sistem Pertanggungjawaban/Forensik)**
    *   **Fungsi Utama**: Mesin waktu dan sistem pengawasan keamanan.
    *   **Transparansi Mutlak**: Setiap aksi "berbahaya" (seperti mengubah harga menu, menghapus staff, atau membatalkan pesanan yang sudah dibayar) akan dicatat di sini. Tabel ini menyimpan data SEBELUM (`oldValue`) dan SESUDAH (`newValue`) perubahan, sehingga jika terjadi kecurangan internal, Owner dapat melacak siapa pelakunya berdasarkan `ipAddress` dan `userId`.

---

#### 🔗 Narasi Relasi Logika (Arsitektur Komunikasi Data)

Database ini menggunakan relasi yang saling mengunci untuk menjaga konsistensi:

*   **Relationship `users` → `Orders`**: Menciptakan akuntabilitas. Kita selalu tahu staff mana yang melayani meja tertentu melalui tautan Foreign Key ini.
*   **Relationship `Categories` → `Menus`**: Menjamin keteraturan. Setiap menu wajib memiliki kategori agar sistem navigasi pelanggan tidak berantakan.
*   **Relationship `Orders` → `Payments`**: Hubungan ketergantungan 1-ke-1. Sebuah pembayaran dianggap tidak sah (orphan) jika tidak tertaut pada baris pesanan yang ada di tabel Orders.
*   **Relationship `users` → `AuditLog`**: Hubungan pengawasan. Memberikan transparansi penuh kepada pihak manajemen atas setiap pergerakan data di dalam sistem.

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

### 6. Sequence Diagram: Input Pesanan
Proses saat pelanggan melakukan checkout pesanan dari keranjang belanja.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as Mobile App
    participant Backend as Express API (Railway)
    participant PG as PostgreSQL

    Customer->>Frontend: Klik "Buat Pesanan"
    Frontend->>Backend: POST /api/orders (items, table_id, notes)
    Backend->>PG: Validasi Stok & Menu
    Backend->>PG: INSERT INTO "Orders" (status: 'pending')
    PG-->>Backend: Order Created (ID: 101)
    Backend-->>Frontend: JSON Response (Success, Order ID)
    Frontend-->>Customer: Tampilkan Ringkasan Pesanan
```

---

### 7. Sequence Diagram: Bayar Pesanan
Alur integrasi dengan Payment Gateway untuk penyelesaian transaksi.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant Frontend as Mobile App
    participant Backend as Express API
    participant Midtrans as Midtrans Gateway
    participant PG as PostgreSQL

    Customer->>Frontend: Pilih "Bayar Sekarang" (QRIS/Card)
    Frontend->>Backend: POST /api/payments/:order_id
    Backend->>Midtrans: Request Payment Token (Snap API)
    Midtrans-->>Backend: Snap URL & Payment Token
    Backend-->>Frontend: Kirim Data Pembayaran
    Frontend->>Midtrans: Tampilkan UI Pembayaran
    Customer->>Midtrans: Melakukan Pembayaran
    Midtrans->>Backend: Post Webhook (Status: settlement)
    Backend->>PG: UPDATE "Orders" SET payment_status = 'paid'
    Backend-->>Customer: Notifikasi Pembayaran Berhasil
```

---

### 8. Sequence Diagram: Update Status Pesanan
Proses manajemen pesanan oleh Staff (Dapur/Pelayan).

```mermaid
sequenceDiagram
    autonumber
    actor Staff
    participant Frontend as Staff Dashboard
    participant Backend as Express API
    participant PG as PostgreSQL

    Staff->>Frontend: Cek 'Active Orders'
    Staff->>Frontend: Klik "Terima Pesanan"
    Frontend->>Backend: PUT /api/orders/:id/status (Preparing)
    Backend->>PG: UPDATE "Orders" SET status = 'preparing'
    PG-->>Backend: Status Updated
    Backend-->>Frontend: Update Dashboard Secara Real-time
```

---

### 9. Sequence Diagram: Kelola Staff
Manajemen akun karyawan oleh Owner.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant Frontend as Admin Dashboard
    participant Backend as Express API (Auth)
    participant PG as PostgreSQL

    Owner->>Frontend: Input Data Staff Baru
    Frontend->>Backend: POST /api/auth/register (role: 'staff')
    Backend->>Backend: Hash Password (Bcrypt)
    Backend->>PG: INSERT INTO "users" (email, role, hash)
    PG-->>Backend: User Created
    Backend-->>Frontend: Success Message
```

---

### 10. Sequence Diagram: Dashboard Analitik
Proses penarikan data performa untuk laporan owner.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant Frontend as Admin Dashboard
    participant Backend as Express API
    participant PG as PostgreSQL

    Owner->>Frontend: Buka Menu "Laporan"
    Frontend->>Backend: GET /api/owner/reports (date_range)
    Backend->>PG: SELECT SUM(totalAmount) FROM "Orders" (Completed)
    Backend->>PG: SELECT * FROM "SalesStats" (Daily Agregat)
    PG-->>Backend: Sales Data Result
    Backend-->>Frontend: Detailed JSON Stats
    Frontend->>Frontend: Render Chart (Chart.js/Recharts)
```

---

### 11. Sequence Diagram: Kelola Data Menu
Manajemen katalog produk oleh Owner.

```mermaid
sequenceDiagram
    autonumber
    actor Owner
    participant Frontend as Admin Dashboard
    participant Backend as Express API
    participant PG as PostgreSQL

    Owner->>Frontend: Tambah/Edit Menu Item
    Frontend->>Backend: POST /api/menus (data, formData image)
    Backend->>Backend: Handle Image Upload (Cloudinary/S3)
    Backend->>PG: INSERT/UPDATE "Menus"
    PG-->>Backend: Data Saved
    Backend-->>Frontend: UI Update (Menu List Updated)
```

---

## 📂 Project Directory
- `/controllers`: Logika endpoint (Auth, Orders, Menu).
- `/models`: Definisi skema database PostgreSQL.
- `/routes`: Pintu masuk API.
- `/services`: Integrasi pihak ketiga (Midtrans, Email).
- `/middleware`: Keamanan & Verifikasi Auth.
- `BLACKBOX_TESTING.md`: Laporan hasil pengujian fungsional sistem.

## ⚙️ Setup Lokal
1. `npm install`
2. Konfigurasi `.env` sesuai `.env.example`.
3. `npm run dev`

---
Built with ❤️ for POS SO.
