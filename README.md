# 🛡️ Aidbox Access Policy Visualizer

A powerful debugging tool for Aidbox Access Policies that helps developers understand which policies affect resource access for different users.

![Access Policy Visualizer](https://img.shields.io/badge/Aidbox-Access%20Policy%20Visualizer-22d3b0?style=for-the-badge&logo=shield)

## 🎯 Problem

During Aidbox development, managing Access Policies becomes complex:
- Multiple policies may apply to a single resource
- Different users (admin, patient, developer) have varying access levels
- Debugging requires manual DevTools inspection
- Time-consuming to verify policy configurations

## 💡 Solution

This visualizer provides:
- **Matrix View**: See all resources and operations at a glance
- **User Context**: Test access as any user or client
- **Policy Attribution**: Know exactly which policy allowed/denied access
- **Status Differentiation**: Distinguish between 403 (forbidden) and 404 (not found)
- **Compare Mode**: Side-by-side comparison of two users' access

## 🚀 Features

### Core Features
- ✅ Paginated resource matrix (10 resources per page)
- ✅ All CRUD operations: Search, Read, Create, Update, Patch, Delete
- ✅ User and Client selector with search
- ✅ Access policy name display
- ✅ 403 vs 404 differentiation
- ✅ Compare two users side-by-side

### Coming Soon
- 📋 Export results as PDF report
- 🔍 Custom resource filtering
- 📊 Access policy analytics

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ UserSelector│ │AccessMatrix │ │  CompareView    │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │ API Calls
┌───────────────────────────▼─────────────────────────────┐
│                  Backend (Express)                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │  /api/users │ │ /api/access │ │ /api/resources  │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└───────────────────────────┬─────────────────────────────┘
                            │ REST API
┌───────────────────────────▼─────────────────────────────┐
│                      Aidbox                              │
│         (FHIR Server with Access Policies)              │
└─────────────────────────────────────────────────────────┘
```

## 📦 Installation

### Prerequisites
- Node.js 18+
- An Aidbox instance with Access Policies configured
- Admin client credentials (for system operations)

### Setup

1. **Clone the repository**
```bash
cd xmas-hackaton-health-samurai-2025
```

2. **Configure environment variables**

Copy the example environment file and edit it with your Aidbox credentials:
```bash
cd backend
cp .env.example .env
```

Then edit `.env` with your values:
```env
# Aidbox Configuration
AIDBOX_URL=https://your-aidbox-instance.aidbox.app
AIDBOX_CLIENT_ID=your-admin-client-id
AIDBOX_CLIENT_SECRET=your-admin-client-secret

# Server Configuration
PORT=3001
```

3. **Install dependencies**
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

4. **Start the servers**

In one terminal:
```bash
cd backend
npm run dev
```

In another terminal:
```bash
cd frontend
npm run dev
```

5. **Open the app**

Navigate to `http://localhost:5173`

## 🔐 Authentication

The visualizer supports two authentication methods:

### For System Operations (User/Client Search)
Uses admin credentials configured in `.env`:
- Basic Auth with `AIDBOX_CLIENT_ID` and `AIDBOX_CLIENT_SECRET`
- This client should have an `allow` access policy (engine: allow)

### For Access Testing
Tests are performed using the selected user's credentials:
- **Users**: Basic Auth with user ID and password
- **Clients**: Basic Auth with client ID and secret

## 📊 Understanding Results

| Status | Meaning | HTTP Code |
|--------|---------|-----------|
| ✅ Allowed | Operation permitted by an Access Policy | 2xx |
| ❌ Denied | Explicitly forbidden by Access Policy | 403 |
| ⚠️ Not Found | Resource doesn't exist (not a policy issue) | 404 |
| ⚪ Error | Other errors (network, server, etc.) | 4xx/5xx |

## 🧪 Tested Resources

The visualizer tests access for common FHIR resources:
- Patient, Practitioner, Organization
- Observation, Encounter, Condition
- MedicationRequest, Procedure
- And 25+ more...

## 🛠️ API Endpoints

### Backend API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/users` | GET | Search users |
| `/api/users/clients` | GET | Search clients |
| `/api/resources` | GET | List available resources |
| `/api/resources/paginated` | GET | Get paginated resources |
| `/api/access/test` | POST | Test access for a resource |
| `/api/access/test-batch` | POST | Test access for multiple resources |
| `/api/access/compare` | POST | Compare access between two users |

## 🎨 Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Lucide Icons
- Vite

### Backend
- Node.js + TypeScript
- Express
- tsx (TypeScript execution)

## 📝 License

MIT License - feel free to use this for your Aidbox projects!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for the Health Samurai Hackathon 2025 🎄
