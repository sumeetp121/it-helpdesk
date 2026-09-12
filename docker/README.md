# Docker

This directory contains Docker configuration for the IT Helpdesk microservices.

## Docker Learning Roadmap

- [x] User Service Dockerfile
- [x] User Service Docker image
- [x] User Service Docker container
- [x] User Service port mapping
- [ ] PostgreSQL container
- [ ] Ticket Service container
- [ ] Notification Service container
- [ ] Frontend container
- [ ] Docker network
- [ ] Docker Compose

---

# User Service

## Application

The User Service is a Python FastAPI application.

Application location:

```text
user-service/app.py
````

Port:

```text
8001
```

The application uses:

* Python
* FastAPI
* Uvicorn
* Pydantic
* psycopg2-binary
* PostgreSQL

## Dockerfile

Dockerfile location:

```text
docker/user-service/Dockerfile
```

The Dockerfile performs the following steps:

```text
FROM
  ↓
Create Python 3.12 environment

WORKDIR
  ↓
Set /app as the working directory

COPY
  ↓
Copy requirements.txt

RUN
  ↓
Install Python dependencies

COPY
  ↓
Copy app.py

EXPOSE
  ↓
Document application port 8001

CMD
  ↓
Start Uvicorn
```

## Build Image

Run the command from the project root:

```bash
cd /home/sumeet/it-helpdesk
```

Build the Docker image:

```bash
docker build \
  -f docker/user-service/Dockerfile \
  -t it-helpdesk-user-service:v1 \
  .
```

Check the image:

```bash
docker images
```

## Run Container

```bash
docker run -d \
  --name it-helpdesk-user-service \
  -p 8001:8001 \
  it-helpdesk-user-service:v1
```

Check the running container:

```bash
docker ps
```

Expected port mapping:

```text
0.0.0.0:8001 -> 8001/tcp
```

This means:

```text
Ubuntu Host :8001
      ↓
Docker
      ↓
Container :8001
```

## Test User Service

Health check:

```bash
curl http://localhost:8001/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "user-service"
}
```

FastAPI Swagger documentation:

```text
http://localhost:8001/docs
```

The service can also be accessed from a browser:

```text
http://localhost:8001/health
```

## Container Structure

Inside the container:

```text
/app
├── app.py
└── requirements.txt
```

Python and the required Python packages are installed inside the Docker image.

To enter the running container:

```bash
docker exec -it it-helpdesk-user-service /bin/sh
```

Useful commands inside the container:

```bash
pwd
ls -la
python --version
pip list
```

## Docker Architecture

The current User Service flow is:

```text
Browser
   ↓
Ubuntu Host :8001
   ↓
Docker Port Mapping
   ↓
User Service Container :8001
   ↓
Uvicorn
   ↓
FastAPI
```

## PostgreSQL Connectivity

The User Service currently contains the following PostgreSQL configuration:

```python
DB_CONFIG = {
    "host": "localhost",
    "database": "helpdesk_db",
    "user": "helpdesk_app",
    "password": "helpdesk123",
    "port": 5432
}
```

When the User Service runs directly on Ubuntu:

```text
User Service
     ↓
localhost:5432
     ↓
PostgreSQL
```

When the User Service runs inside Docker:

```text
User Service Container
     ↓
localhost:5432
     ↓
The User Service container itself
```

Therefore, the health endpoint works:

```text
GET /health
```

but database-dependent endpoints such as:

```text
GET /api/users
```

cannot currently connect to the PostgreSQL database from inside the container.

We will solve this later using Docker networking and environment variables.

## Current Status

The User Service has successfully been containerized.

Completed:

```text
Dockerfile
    ↓
Docker Image
    ↓
Docker Container
    ↓
Port 8001
    ↓
FastAPI
    ↓
/health
```

---

# User Service — Docker Network

## Overview

The User Service is a FastAPI application that provides REST APIs for managing users.

The service runs inside a Docker container and connects to the PostgreSQL container through a dedicated Docker bridge network.

## Paths

```text
Application:
 /home/sumeet/it-helpdesk/user-service/app.py

Requirements:
 /home/sumeet/it-helpdesk/user-service/requirements.txt

Dockerfile:
 /home/sumeet/it-helpdesk/docker/user-service/Dockerfile

Docker Network:
 it-helpdesk-network
```

## Docker Image

```text
it-helpdesk-user-service:v2
```

## Container

```text
Container:
it-helpdesk-user-service
```

The service is exposed on:

```text
Host:      8001
Container: 8001
```

## PostgreSQL Connection

The User Service connects to PostgreSQL using the Docker container name:

```text
Host:     it-helpdesk-postgres
Port:     5432
Database: helpdesk_db
User:     helpdesk_app
```

Inside Docker, `localhost` refers to the User Service container itself.

Therefore, the PostgreSQL container name is used as the database host:

```python
"host": "it-helpdesk-postgres"
```

## Docker Network

Both containers are connected to:

```text
it-helpdesk-network
```

```text
it-helpdesk-user-service
          |
          | it-helpdesk-network
          |
          v
it-helpdesk-postgres:5432
```

## Running Containers

Verify:

```bash
docker ps
```

Expected containers:

```text
it-helpdesk-user-service
it-helpdesk-postgres
```

Verify the network:

```bash
docker network inspect it-helpdesk-network
```

## API Verification

Health check:

```bash
curl http://localhost:8001/health
```

Expected:

```json
{
  "status": "healthy",
  "service": "user-service"
}
```

Get all users:

```bash
curl http://localhost:8001/api/users
```

The API successfully retrieves users from PostgreSQL through the Docker network.

## Build Image

From:

```text
/home/sumeet/it-helpdesk
```

Build the image:

```bash
docker build \
  -t it-helpdesk-user-service:v2 \
  -f docker/user-service/Dockerfile .
```

## Run Container

```bash
docker run -d \
  --name it-helpdesk-user-service \
  --network it-helpdesk-network \
  -p 8001:8001 \
  it-helpdesk-user-service:v2
```

## Important Docker Concepts

### Container-to-container communication

Containers on the same Docker network can communicate using the container name.

Example:

```text
it-helpdesk-postgres:5432
```

### Host port vs container port

User Service:

```text
0.0.0.0:8001 -> 8001
```

PostgreSQL:

```text
5432/tcp
```

PostgreSQL does not need to publish port `5432` to the host for communication with the User Service.

The communication happens internally through:

```text
it-helpdesk-network
```

## Current Milestone

```text
User Service Dockerized
        +
PostgreSQL Dockerized
        +
Docker Network
        +
User Service → PostgreSQL communication
        =
Working
```