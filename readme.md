# selfShare

Small personal, self-hosted filesharing REST API built with Flask, PostgreSQL that allow you to upload file, write description and set expiration dates and generate sharable link to each file.
Vanilla JS (SPA) for the frontend.

Quick Start (Docker)

You can spin up the entire application environment (Flask, Postgres, Redis, Celery Worker, Celery Beat) using Docker Compose.

### 1. Clone & Configure

```bash
git clone https://github.com/andriydread/selfShare.git
cd selfShare

# Create your environment variables(set a strong ADMIN_PASSWORD and JWT_SECRET)
cp .env.example .env
```

### 2. Run the Stack

```bash
docker-compose up -d --build
```

### 3. Access the App

- **Local Development:** `http://localhost:5000`
- **Server Deployment:** `http://<YOUR_SERVER_IP>:5000`
- **Login:** Use the password you set in your `.env` file.

### TODO:

1. Improve UI
2. Multi-user functionality
