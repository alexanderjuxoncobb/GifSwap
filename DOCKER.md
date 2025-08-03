# Docker Setup Guide

## Prerequisites

- Docker and Docker Compose installed on your system
- Environment variables configured (see below)

## Environment Setup

1. Create a `.env` file in the `backend` directory with your API keys:

```env
REPLICATE_API_TOKEN=your_replicate_api_token_here
PORT=3001
```

## Running the Application

### Option 1: Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Run in detached mode
docker-compose up -d --build

# Stop services
docker-compose down
```

The application will be available at:

- Frontend: http://localhost
- Backend API: http://localhost:3001

### Option 2: Running Services Individually

```bash
# Build backend
docker build -t gif-face-swap-backend ./backend

# Build frontend
docker build -t gif-face-swap-frontend ./frontend

# Run backend
docker run -p 3001:3001 --env-file backend/.env gif-face-swap-backend

# Run frontend
docker run -p 80:80 gif-face-swap-frontend
```

## Development

To make changes while containers are running:

```bash
# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up --build

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Troubleshooting

- Ensure `.env` file exists in backend directory
- Check that ports 80 and 3001 are not in use
- Verify Docker and Docker Compose are installed
- Run `docker-compose logs` to see error messages

## File Uploads

Uploaded files are persisted in the `backend/uploads` directory, which is mounted as a volume in the Docker container.
