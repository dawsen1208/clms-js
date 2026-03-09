# CLMS-JS: Intelligent Cloud-Based Library Management System

**Author:** Xuran Ding  
**Student ID:** F5164136    
**Project Date:** March 2026

---

## 🌟 Project Overview

**CLMS-JS** (Cloud Library Management System) is a comprehensive, production-grade full-stack web application designed to modernize library operations. Built with the **MERN** (MongoDB, Express, React, Node.js) stack and deployed on **Azure**, the system bridges the gap between traditional book management and modern intelligent services. It features a unique "Smart Assistant" that uses multi-dimensional data to recommend and compare books, alongside a robust administrative suite for automated workflow management.

## 🚀 Core Features

### 📖 For Readers (Users)
- **Interactive Search & Discovery**: A "Book World" dual-panel interface with real-time filtering, category sorting, and metadata-based deduplication.
- **Intelligent Recommendations**: Personalized book suggestions based on borrowing history and popularity metrics.
- **Borrowing Lifecycle**: One-click borrowing, flexible renewal requests, and return tracking with automated due-date notifications.
- **Smart Assistant**: A comparison engine allowing users to evaluate up to 6 books simultaneously using a **Radar Chart** visualization (Metrics: Rating, Popularity, Availability, Recency, and Match Score).
- **User Profile & Security**: Personalized dashboards, avatar uploads, and **Two-Factor Authentication (2FA)** via email binding for enhanced security.
- **Feedback & Notifications**: Direct communication channel with administrators and real-time in-app notifications for system updates and review reminders.

### 🛠️ For Administrators
- **Comprehensive Dashboard**: Real-time statistics on inventory, active loans, pending requests, and reader engagement.
- **Inventory Management**: Full CRUD operations for books, including ISBN integration and stock control.
- **Request Approval Workflow**: Streamlined interface for processing renewal and return requests with one-click approval/rejection.
- **User & Role Management**: Complete control over user status (Approve/Reject), role assignment, and blacklisting for frequent overdue returns.
- **System Auditing**: Detailed borrow history logs for tracking every transaction within the system.

## 🛡️ Technical Highlights & Security

- **MERN Stack Architecture**: Scalable backend with Express/Node.js and a responsive, component-based frontend using React and Ant Design.
- **Security First**: 
  - **JWT (JSON Web Tokens)** for stateless authentication.
  - **Bcrypt** password hashing with 10 salt rounds.
  - **Helmet.js** for securing HTTP headers and preventing common vulnerabilities.
  - **CORS** configuration for restricted origin access.
- **Data Integrity**: Unified ID normalization handling both legacy `String` and `Mongoose.ObjectId` to ensure database consistency.
- **Serverless Integration**: Integrated with **Azure Functions** for background tasks such as automated email reminders and system health checks.
- **Responsive Design**: Fully optimized for Desktop, Tablet, and Mobile devices with a custom CSS-in-JS and media query system.

## 💻 Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, Ant Design (v5), Axios, React Router, Framer Motion |
| **Backend** | Node.js, Express, Mongoose (MongoDB ODM), Multer (File Uploads) |
| **Security** | JWT, Bcrypt, Two-Factor Authentication (Email-based) |
| **Deployment** | Microsoft Azure (Web Apps & Static Web Apps), MongoDB Atlas |
| **Dev Tools** | ESLint, Prettier, Dotenv, Nodemon, Morgan (Logging) |

## 📂 Directory Structure

```text
clms-js/
├── backend/
│   ├── server.js                 # Unified backend entry point
│   ├── middleware/authUnified.js # JWT & Role-based access control
│   ├── routes/                   # API Route definitions (Books, Users, Requests, etc.)
│   ├── controllers/              # Business logic for library operations
│   ├── models/                   # Mongoose Schemas (User, Book, BorrowRecord, etc.)
│   ├── scripts/                  # Data merging & maintenance scripts
│   ├── services/                 # Mailer and external API services
│   └── seed*.js                  # Database initialization & demo data scripts
├── frontend/
│   ├── src/
│   │   ├── api.js                # Centralized API communication layer
│   │   ├── components/           # Reusable UI components (Common, Cards, Layouts)
│   │   ├── pages/                # Main application views (Dashboard, Assistant, etc.)
│   │   ├── contexts/             # Global state (Language, Accessibility, Auth)
│   │   └── utils/                # Helper functions (Translations, UI logic)
│   ├── vite.config.js            # Build and Proxy configuration
│   └── .env                      # Frontend environment variables
└── README.md                     # Comprehensive documentation
```

## 🛠️ Installation and Setup

### 1. Prerequisites
- Node.js (v18.0 or higher)
- MongoDB Atlas account or local MongoDB instance

### 2. Environment Configuration
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
SMTP_USER=your_gmail_for_notifications
SMTP_PASS=your_gmail_app_password
```

### 3. Setup Commands
```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Initialize database (optional)
node backend/seedBooks.js
node backend/seedDemoData.js

# Start development servers
# Backend (from backend/ directory)
npm run dev

# Frontend (from frontend/ directory)
npm run dev
```

## ☁️ Deployment

The system is designed for cloud deployment on **Azure**:
- **Frontend**: Deployed as an **Azure Static Web App** or served via Node.js static middleware.
- **Backend**: Deployed as an **Azure App Service (Web App)**.
- **Database**: Hosted on **MongoDB Atlas** for high availability.

---

**© 2026 Xuran Ding (F5164136). All Rights Reserved.**
