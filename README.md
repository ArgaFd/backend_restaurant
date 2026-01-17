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

## 📂 Core Structure

- `/controllers`: Request logic (Auth, Orders, Menu, etc.)
- `/models`: Database schemas for PostgreSQL & MongoDB.
- `/routes`: API endpoint definitions.
- `/services`: Third-party integrations (Midtrans, Email).
- `/middleware`: Auth verification, error handling, and security.

## ⚙️ Configuration (.env)

Ensure these variables are set in your `.env` file:

```env
APP_NAME=POS SO
DATABASE_URL=postgresql://your_db_url
JWT_SECRET=your_jwt_secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password
```

## 🚀 Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run in development mode:
   ```bash
   npm run dev
   ```
3. Production:
   ```bash
   npm start
   ```

---
Built with ❤️ for POS SO.
