# AI-Powered Employee Leave Management System

Enterprise-grade leave management platform with rule-based AI features, built with **Node.js/Express** (backend) and **React/Vite** (frontend).

## ✨ Features

- **Role-Based Access**: Employee, Manager, Admin dashboards with scoped permissions
- **Leave Management**: Apply, approve/reject, cancel, filter, paginate, CSV export
- **AI Insights** (rule-based — no API key needed):
  - Burnout scoring with weighted factors and recommendations
  - Leave timing advice with conflict/overlap detection
  - NLP text parsing for natural-language leave requests
  - Smart leave date suggestions based on balance & team patterns
- **Real-Time Notifications**: In-app notification bell with unread counts
- **Audit Trail**: Immutable audit logs with action filtering and export
- **Dark/Light Theme**: "Carbon & Citrus" design system via CSS custom properties
- **Demo Data Seeder**: Realistic seed data for 11 users, 3 departments, 20 leaves

## 🛠 Tech Stack

| Layer | Technology |
|---------|---------------------------------------------|
| Backend | Node.js, Express, Mongoose, JWT, date-fns |
| Frontend| React 18, Vite, Tailwind CSS, Axios, React Router |
| Database| MongoDB (Atlas or local) |
| AI | Rule-based (deterministic — no external API) |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas free tier)

### 1. Clone & Configure

```bash
git clone <repo-url>
cd leavemanagementsystem
cp backend/.env.example backend/.env
# Edit backend/.env — set MONGO_URI and JWT_SECRET at minimum
```

### 2. Backend

```bash
cd backend
npm install
npm run seed        # Seed demo data (users, departments, holidays, leaves)
npm run dev         # Start Express server on port 5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev         # Start Vite dev server on port 5173
```

### 4. Login

| Role     | Email                   | Password     |
|----------|--------------------------|-------------|
| Admin    | admin@company.com        | Admin@123   |
| Manager  | manager1@company.com     | Manager@123 |
| Employee | rahul@company.com        | Employee@123|

## 📁 Project Structure

```
leavemanagementsystem/
├── backend/
│   ├── config/          # db, cloudinary, socket
│   ├── controllers/     # 9 controllers
│   ├── middleware/       # auth, role, errorHandler, rateLimiter, etc.
│   ├── models/          # 7 Mongoose models
│   ├── routes/          # 9 route files
│   ├── services/        # AI, burnout, NLP, email, leaveBalance
│   ├── utils/           # ApiError, logger, validators, seedData
│   ├── server.js        # Express entry point
│   └── seeder.js        # Database seeder
├── frontend/
│   ├── src/
│   │   ├── components/  # ui/ (10 primitives), layout/ (4 components)
│   │   ├── contexts/    # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/       # 8 pages (Login, Register, Dashboard, etc.)
│   │   ├── services/    # Axios API layer with interceptors
│   │   ├── utils/       # constants, helpers, dateUtils, cn, exportUtils
│   │   ├── App.jsx      # React Router setup
│   │   └── main.jsx     # Entry point
│   └── index.html
└── README.md
```

## 🧪 AI Features (Rule-Based)

All AI features are **deterministic** — they use weighted scoring formulas and regex patterns, with no external API calls:

- **Burnout Score**: Weighted average of consecutive work days, total hours, denied leave ratio, and leave gap frequency
- **Leave Advice**: Conflict detection (overlapping leaves, holidays, team unavailability) + date scoring
- **NLP Parsing**: Regex + date-fns to parse "I need 3 days sick leave starting tomorrow" into structured leave data
- **Smart Suggestions**: Identifies optimal leave windows based on balance expiry and workload patterns

## 📝 License

MIT
