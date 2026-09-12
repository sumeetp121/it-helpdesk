# IT Helpdesk Notification Service

The Notification Service is a FastAPI-based microservice responsible for creating, retrieving, updating, and deleting notifications related to helpdesk tickets.

## Technology Stack

* Python
* FastAPI
* Uvicorn
* PostgreSQL
* psycopg2-binary
* Docker

## Service Port

```text
8003
```

## API Endpoints

### Health Check

```http
GET /health
```

Example:

```bash
curl http://127.0.0.1:8003/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "notification-service"
}
```

### Create Notification

```http
POST /api/notifications
```

Example:

```bash
curl -X POST http://127.0.0.1:8003/api/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "message": "Your ticket has been created successfully.",
    "ticket_id": 7,
    "read": false
  }'
```

### Get All Notifications

```http
GET /api/notifications
```

Example:

```bash
curl http://127.0.0.1:8003/api/notifications
```

### Get Notification

```http
GET /api/notifications/{notification_id}
```

Example:

```bash
curl http://127.0.0.1:8003/api/notifications/5
```

### Update Notification

```http
PUT /api/notifications/{notification_id}
```

### Delete Notification

```http
DELETE /api/notifications/{notification_id}
```

### Delete Notifications for a Ticket

```http
DELETE /api/notifications/ticket/{ticket_id}
```

Example:

```bash
curl -X DELETE \
  http://127.0.0.1:8003/api/notifications/ticket/7
```

## PostgreSQL Configuration

When running inside the Docker network, the service connects to PostgreSQL using the Docker service/container hostname:

```text
Host: it-helpdesk-postgres
Port: 5432
Database: helpdesk_db
User: helpdesk_app
```

The PostgreSQL database contains the `notifications` table used by this service.

## Docker

The Dockerfile is located at:

```text
docker/notification-service/Dockerfile
```

Build the image:

```bash
docker build -t it-helpdesk-notification-service:v4 \
  -f docker/notification-service/Dockerfile .
```

Run the container:

```bash
docker run -d \
  --name it-helpdesk-notification-service \
  --network it-helpdesk-network \
  -p 8003:8003 \
  it-helpdesk-notification-service:v4
```

Check the container:

```bash
docker ps
```

Check logs:

```bash
docker logs it-helpdesk-notification-service
```

## Service Architecture

```text
Ticket Service :8002
        |
        | Create/Delete Notification
        v
Notification Service :8003
        |
        v
PostgreSQL :5432
```

The Notification Service communicates with PostgreSQL through the Docker network using:

```text
it-helpdesk-postgres:5432
```

## Testing

Health check:

```bash
curl http://127.0.0.1:8003/health
```

A healthy service returns:

```json
{
  "status": "healthy",
  "service": "notification-service"
}
```

## Project Structure

```text
it-helpdesk/
├── notification-service/
│   ├── app.py
│   └── requirements.txt
│
└── docker/
    └── notification-service/
        └── Dockerfile
```
