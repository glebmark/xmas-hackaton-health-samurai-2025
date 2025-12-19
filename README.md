# 🛡️ Aidbox Access Policy Visualizer

A powerful debugging tool for Aidbox Access Policies that helps developers understand which policies affect resource access for different users and clients.

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
- ✅ Access policy name display (requires `BOX_SECURITY_DEV_MODE`)
- ✅ 403 vs 404 differentiation
- ✅ Compare two users side-by-side

### Coming Soon
- 📋 Export results as PDF report
- 🔍 Custom resource filtering
- 📊 Access policy analytics

---

## 📦 Prerequisites

- Node.js 18+
- An Aidbox instance
- Admin credentials for Aidbox

---

## 🔧 Aidbox Configuration

Before using the visualizer, you need to set up the required Clients and Access Policies in your Aidbox instance.

### Step 1: Create the Admin API Client

This client is used by the visualizer to fetch the list of Users and Clients. It needs read access to User and Client resources.

```http
PUT /Client/developer-api
Content-Type: application/json

{
  "resourceType": "Client",
  "id": "developer-api",
  "secret": "your-secure-secret-here",
  "grant_types": ["client_credentials"]
}
```

### Step 2: Create Access Policy for Admin API Client

This policy allows the `developer-api` client to search and read Users and Clients:

```http
PUT /AccessPolicy/admin-api-access
Content-Type: application/json

{
  "resourceType": "AccessPolicy",
  "id": "admin-api-access",
  "description": "Allows developer-api client to read Users and Clients for the visualizer",
  "engine": "matcho",
  "matcho": {
    "client": {
      "id": "developer-api"
    },
    "params": {
      "resource/type": {
        "$enum": ["User", "Client"]
      }
    },
    "operation": {
      "id": {
        "$one-of": ["FhirRead", "FhirSearch"]
      }
    }
  }
}
```

### Step 3: Create the User Authentication Client

This client is used to authenticate **Users** via OAuth2 password grant. It's required because:

> ⚠️ **Why do we need a separate client for Users?**
> 
> In Aidbox, **Users** and **Clients** authenticate differently:
> - **Clients** can use `client_credentials` grant (client ID + secret → token)
> - **Users** must use `password` grant (username + password → token via a client)
> 
> The visualizer needs to test access **as a specific User**, which requires obtaining a Bearer token on behalf of that User. This requires a Client with `password` grant type enabled.

```http
PUT /Client/user-auth-client
Content-Type: application/json

{
  "resourceType": "Client",
  "id": "user-auth-client",
  "secret": "user-auth-secret",
  "grant_types": ["password"]
}
```

> **Note**: This client doesn't need any Access Policies linked to it. It's only used to issue tokens for Users via password grant.

### Step 4: Enable Debug Mode (Optional but Recommended)

To see **which Access Policy** allowed a request, enable Aidbox Developer Mode:

```yaml
# In your Aidbox docker-compose.yml or environment:
BOX_SECURITY_DEV_MODE: 'true'
```

When enabled:
- ✅ The visualizer shows the policy name that allowed each request
- ✅ Purple "Has Policy" indicator appears on allowed operations

When disabled:
- ❌ Policy names won't be displayed (you'll only see allowed/denied status)

---

## 🧪 Example: Testing User Access

### Create a Test User

```http
PUT /User/test-developer
Content-Type: application/json

{
  "resourceType": "User",
  "id": "test-developer",
  "email": "developer@example.com",
  "password": "developer-password",
  "roles": [
    {
      "type": "developer"
    }
  ],
  "data": {
    "firstName": "Test",
    "lastName": "Developer"
  }
}
```

### Create an Access Policy for Developers

This example policy allows users with the `developer` role to search Clients:

```http
PUT /AccessPolicy/dev-client-search
Content-Type: application/json

{
  "resourceType": "AccessPolicy",
  "id": "dev-client-search",
  "description": "Developers can search Client resources",
  "engine": "matcho",
  "matcho": {
    "user": {
      "roles": {
        "$contains": {
          "type": "developer"
        }
      }
    },
    "params": {
      "resource/type": "Client"
    },
    "operation": {
      "id": "FhirSearch"
    }
  }
}
```

Now when you select "test-developer" in the visualizer and test access, you'll see:
- ✅ **Client Search**: Allowed (policy: `dev-client-search`)
- ❌ **Client Read/Create/Update/Delete**: Forbidden

---

## 🧪 Example: Testing Client Access

You can also test access for Clients directly (not just Users).

### Create a Test Client

```http
PUT /Client/test-api-client
Content-Type: application/json

{
  "resourceType": "Client",
  "id": "test-api-client",
  "secret": "test-api-secret",
  "grant_types": ["client_credentials"]
}
```

### Create an Access Policy for the Client

This policy allows `test-api-client` to read Patient resources:

```http
PUT /AccessPolicy/test-api-patient-read
Content-Type: application/json

{
  "resourceType": "AccessPolicy",
  "id": "test-api-patient-read",
  "description": "Test API client can read Patient resources",
  "engine": "matcho",
  "matcho": {
    "client": {
      "id": "test-api-client"
    },
    "params": {
      "resource/type": "Patient"
    },
    "operation": {
      "id": {
        "$one-of": ["FhirRead", "FhirSearch"]
      }
    }
  }
}
```

---

## 📦 Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd xmas-hackaton-health-samurai-2025
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Aidbox Configuration
AIDBOX_URL=https://your-aidbox-instance.aidbox.app

# Admin API Client (for fetching Users/Clients list)
AIDBOX_CLIENT_ID=developer-api
AIDBOX_CLIENT_SECRET=your-secure-secret-here

# User Authentication Client (for password grant)
AIDBOX_USER_AUTH_CLIENT_ID=user-auth-client
AIDBOX_USER_AUTH_CLIENT_SECRET=user-auth-secret

# Server Configuration
PORT=3001
```

### 3. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start the servers

Terminal 1 (Backend):
```bash
cd backend
npm run dev
```

Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

### 5. Open the app

Navigate to `http://localhost:5173`

---

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

---

## 🔐 How Authentication Works

### System Operations (Fetching Users/Clients)

The visualizer uses `developer-api` client with `client_credentials` grant:
1. Backend sends `POST /auth/token` with client_id + client_secret
2. Receives Bearer token
3. Uses token to fetch `/fhir/User` and `/fhir/Client`

### Testing User Access

When testing as a **User**:
1. Backend uses `user-auth-client` to perform password grant
2. Sends `POST /auth/token` with username + password
3. Receives Bearer token for that User
4. Tests FHIR operations using that User's token

### Testing Client Access

When testing as a **Client**:
1. Backend performs `client_credentials` grant for that client
2. Sends `POST /auth/token` with client_id + client_secret
3. Receives Bearer token
4. Tests FHIR operations using that token

---

## 📊 Understanding Results

| Status | Icon | Meaning | HTTP Code |
|--------|------|---------|-----------|
| Allowed | ✅ | Operation permitted by an Access Policy | 2xx |
| Unauthorized | ⚠️ | Authentication failed | 401 |
| Denied | ❌ | Explicitly forbidden by Access Policy | 403 |
| Not Found | 📄 | Resource doesn't exist (not a policy issue) | 404 |
| Error | ⚪ | Other errors (network, server, etc.) | 4xx/5xx |

### Policy Attribution

When `BOX_SECURITY_DEV_MODE=true`:
- A purple dot (●) appears next to allowed operations
- Hover to see which Access Policy allowed the request

---

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

---

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

---

## 🐛 Troubleshooting

### "Basic auth is not enabled for client"

This error occurs when testing a Client that doesn't have `basic` in its `grant_types`. 

**Solution**: The visualizer now uses `client_credentials` grant for Clients instead of Basic auth. Make sure your test clients have `client_credentials` in their `grant_types`.

### "Password grant is not allowed for this client"

This error occurs when trying to test a User but the authentication client doesn't support password grant.

**Solution**: Ensure `user-auth-client` has `"grant_types": ["password"]` in its configuration.

### Access Policy names not showing

**Solution**: Enable `BOX_SECURITY_DEV_MODE: 'true'` in your Aidbox configuration.

### 401 errors for all operations

Check that:
1. `developer-api` client exists and has correct secret
2. `admin-api-access` policy is created
3. Environment variables match the client credentials

---

## 📝 License

MIT License - feel free to use this for your Aidbox projects!

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for the Health Samurai Hackathon 2025 🎄
