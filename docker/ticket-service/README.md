# Ticket Service

## Overview

The Ticket Service is a Go-based REST API responsible for creating, reading, updating, and deleting helpdesk tickets.

It uses:

- Go
- Gin
- PostgreSQL
- Docker

The service runs on port `8002`.

---

## Project Structure

```text
ticket-service/
├── main.go
├── go.mod
└── go.sum

docker/
└── ticket-service/
    ├── Dockerfile
    └── README.md
````

---

## Database Configuration

The Ticket Service connects to PostgreSQL using:

```text
Host:     it-helpdesk-postgres
Port:     5432
Database: helpdesk_db
User:     helpdesk_app
Password: helpdesk123
SSL:      disabled
```

The PostgreSQL container and Ticket Service communicate through:

```text
it-helpdesk-network
```

---

## Dockerfile

The service uses the official Go image:

```dockerfile
FROM golang:latest

WORKDIR /app

COPY ticket-service/go.mod ticket-service/go.sum ./

RUN go mod download

COPY ticket-service/main.go .

EXPOSE 8002

CMD ["go", "run", "main.go"]
```

---

## Build Docker Image

From the project root:

```bash
docker build \
  -t it-helpdesk-ticket-service:v3 \
  -f docker/ticket-service/Dockerfile .
```

Verify:

```bash
docker images | grep it-helpdesk-ticket-service
```

---

## Run Container

Create and run the container:

```bash
docker run -d \
  --name it-helpdesk-ticket-service \
  --network it-helpdesk-network \
  -p 8002:8002 \
  it-helpdesk-ticket-service:v3
```

Verify:

```bash
docker ps
```

---

## Check Container Logs

```bash
docker logs it-helpdesk-ticket-service
```

---

## Check Container Network

```bash
docker network inspect it-helpdesk-network
```

The Ticket Service should appear as a connected container.

---

## Health Check

Test from the host:

```bash
curl http://127.0.0.1:8002/health
```

Expected response:

```json
{
  "service": "ticket-service",
  "status": "healthy"
}
```

You can also test IPv6:

```bash
curl http://[::1]:8002/health
```

---

## API Endpoints

### Health

```text
GET /health
```

Example:

```bash
curl http://127.0.0.1:8002/health
```

---

### Create Ticket

```text
POST /api/tickets
```

Example:

```bash
curl -X POST http://127.0.0.1:8002/api/tickets \
  -H "Content-Type: application/json" \
  -d '{
    "title": "VPN not working",
    "description": "Unable to connect to company VPN",
    "category": "Network",
    "priority": "High",
    "user_id": 1
  }'
```

---

### Get All Tickets

```text
GET /api/tickets
```

Example:

```bash
curl http://127.0.0.1:8002/api/tickets
```

---

### Get Ticket by ID

```text
GET /api/tickets/:id
```

Example:

```bash
curl http://127.0.0.1:8002/api/tickets/1
```

---

### Update Ticket

```text
PUT /api/tickets/:id
```

Example:

```bash
curl -X PUT http://127.0.0.1:8002/api/tickets/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "VPN issue",
    "description": "VPN connection problem resolved",
    "category": "Network",
    "priority": "High",
    "status": "Closed",
    "user_id": 1
  }'
```

---

### Delete Ticket

```text
DELETE /api/tickets/:id
```

Example:

```bash
curl -X DELETE http://127.0.0.1:8002/api/tickets/1
```

---

## Service Dependencies

The Ticket Service depends on:

```text
Ticket Service
      │
      ├── PostgreSQL
      │      └── helpdesk_db
      │
      ├── User Service
      │      └── User validation
      │
      └── Notification Service
             └── Ticket notifications
```

All Docker services communicate through:

```text
it-helpdesk-network
```

---

## Current Docker Services

```text
PostgreSQL
    Container: it-helpdesk-postgres
    Port:      5432

User Service
    Container: it-helpdesk-user-service
    Port:      8001

Ticket Service
    Container: it-helpdesk-ticket-service
    Port:      8002
```

---

## Useful Docker Commands

### Start

```bash
docker start it-helpdesk-ticket-service
```

### Stop

```bash
docker stop it-helpdesk-ticket-service
```

### Restart

```bash
docker restart it-helpdesk-ticket-service
```

### Remove

```bash
docker rm -f it-helpdesk-ticket-service
```

### Inspect

```bash
docker inspect it-helpdesk-ticket-service
```

### Enter Container

```bash
docker exec -it it-helpdesk-ticket-service bash
```

If Bash is unavailable:

```bash
docker exec -it it-helpdesk-ticket-service sh
```

---

## Verification

Check all running services:

```bash
docker ps
```

Check the Ticket Service:

```bash
curl http://127.0.0.1:8002/health
```

Check PostgreSQL connectivity from the Ticket Service:

```bash
docker logs it-helpdesk-ticket-service
```

Check the API:

```bash
curl http://127.0.0.1:8002/api/tickets
```

---

## Docker Networking

The Ticket Service must be attached to:

```text
it-helpdesk-network
```

Verify:

```bash
docker network inspect it-helpdesk-network
```

The PostgreSQL container should be reachable using:

```text
it-helpdesk-postgres:5432
```

---

## Version History

### v1

Initial Docker image for Ticket Service.

### v2

Updated Ticket Service Docker configuration and database connectivity.

### v3

Updated PostgreSQL connection to use:

```text
sslmode=disable
```

for the local Docker PostgreSQL environment.

---

## Milestone

Ticket Service is successfully:

* Built as a Docker image
* Connected to PostgreSQL
* Connected to the Docker network
* Exposed on port `8002`
* Running inside Docker
* Health endpoint verified
* REST API endpoints implemented


