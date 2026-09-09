# IT Helpdesk Microservices

A locally hosted IT Helpdesk application built as a **DevOps learning project** using microservices, REST APIs, PostgreSQL, Git, Docker, Kubernetes, CI/CD, and other DevOps tools.

## Architecture

```text
                         IT Helpdesk
                              |
             +----------------+----------------+
             |                |                |
             v                v                v
       User Service     Ticket Service   Notification Service
          :8001             :8002              :8003
             |                |                |
             +----------------+----------------+
                              |
                              v
                         PostgreSQL
                         helpdesk_db
```

## Services

### User Service

**Technology:** Python / FastAPI
**Port:** `8001`
**Purpose:** Manage helpdesk users
**Database table:** `users`

Endpoints:

```text
GET    /health
POST   /api/users
GET    /api/users
GET    /api/users/{id}
PUT    /api/users/{id}
DELETE /api/users/{id}
```

### Ticket Service

**Technology:** Go / Gin
**Port:** `8002`
**Purpose:** Manage helpdesk tickets
**Database table:** `tickets`

The Ticket Service validates the user through the User Service before creating a ticket.

Endpoints:

```text
GET    /health
POST   /api/tickets
GET    /api/tickets
GET    /api/tickets/{id}
PUT    /api/tickets/{id}
DELETE /api/tickets/{id}
```

### Notification Service

**Technology:** Python / FastAPI
**Port:** `8003`
**Purpose:** Manage ticket notifications
**Database table:** `notifications`

Endpoints:

```text
GET    /health
POST   /api/notifications
GET    /api/notifications
GET    /api/notifications/{id}
PUT    /api/notifications/{id}
DELETE /api/notifications/{id}
```

## Database

**Database:** `helpdesk_db`

PostgreSQL tables:

```text
users
tickets
notifications
```

Relationships:

```text
users
  |
  +---- tickets
  |
  +---- notifications

tickets
  |
  +---- notifications
```

Foreign keys are used to maintain relationships between users, tickets, and notifications.

## Current Features

* User CRUD
* Ticket CRUD
* Notification CRUD
* PostgreSQL persistence
* User validation before ticket creation
* Inter-service REST communication
* Ticket-to-notification communication
* PostgreSQL foreign-key relationships
* Data survives service restart
* Basic API testing using `curl`

## Current Ports

| Service              | Port |
| -------------------- | ---: |
| User Service         | 8001 |
| Ticket Service       | 8002 |
| Notification Service | 8003 |
| PostgreSQL           | 5432 |

## Ticket Creation Flow

```text
Client
  |
  v
Ticket Service :8002
  |
  |-- Check User
  v
User Service :8001
  |
  v
PostgreSQL
  |
  |-- Save Ticket
  |
  v
Notification Service :8003
  |
  v
PostgreSQL
  |
  v
Notification Created
```

## DevOps Roadmap

- [x] User Service
- [x] Ticket Service
- [x] Notification Service
- [x] PostgreSQL
- [x] PostgreSQL persistence
- [x] User validation
- [x] Inter-service communication
- [x] Ticket CRUD
- [x] Notification CRUD
- [x] Git and GitHub
- [ ] Docker
- [ ] Docker Compose
- [ ] Environment variables
- [ ] CI/CD
- [ ] GitHub Actions
- [ ] Ansible
- [ ] Terraform
- [ ] Kubernetes / Minikube
- [ ] Helm
- [ ] Monitoring
- [ ] Logging

## Development Workflow

Every completed milestone will follow:

```text
Develop
   ↓
Test
   ↓
Verify
   ↓
Git Commit
   ↓
Git Push
   ↓
Next Milestone
```

## Local Development

Activate the Python virtual environment:

```bash
source .venv/bin/activate
```

Run User Service:

```bash
uvicorn user-service.app:app --host 0.0.0.0 --port 8001
```

Run Notification Service:

```bash
uvicorn notification-service.app:app --host 0.0.0.0 --port 8003
```

Run Ticket Service:

```bash
cd ticket-service
go run main.go
```

---

# Service Flow Diagrams

## 1. Overall Application Flow

```text
                         USER
                          |
                          v
                    Web Browser
                          |
                          v
                 React Frontend :5173
                          |
                     Vite Proxy
                          |
          +---------------+---------------+
          |               |               |
          v               v               v
    User Service    Ticket Service   Notification Service
       :8001            :8002              :8003
          |               |                 |
          |               |                 |
          +---------------+-----------------+
                          |
                          v
                    PostgreSQL :5432
                       helpdesk_db
                          |
              +-----------+-----------+
              |           |           |
              v           v           v
            users      tickets   notifications
```

### Overall Flow

1. The user opens the Helpdesk application in a web browser.
2. The React frontend runs on Vite port `5173`.
3. The frontend sends API requests using paths such as:

   * `/api/users`
   * `/api/tickets`
   * `/api/notifications`
4. Vite acts as a development proxy and forwards these requests to the appropriate backend service.
5. The three backend services communicate with PostgreSQL for data storage.
6. The Ticket Service also communicates with the User Service and Notification Service using REST APIs.

---

# 2. User Service Flow

```text
                    Client / Frontend
                           |
                           | /api/users
                           v
                  Vite Proxy :5173
                           |
                           | HTTP
                           v
                  User Service :8001
                    Python / FastAPI
                           |
              +------------+------------+
              |            |            |
              v            v            v
          Create User   Get User    Update/Delete
              |            |            |
              +------------+------------+
                           |
                           | SQL
                           v
                    PostgreSQL :5432
                           |
                           v
                       users table
```

### User Service Flow

1. The frontend sends a request to `/api/users`.
2. Vite forwards the request to the User Service on port `8001`.
3. The User Service is built using Python and FastAPI.
4. The service handles user operations such as:

   * Create user
   * Get users
   * Get a specific user
   * Update user
   * Delete user
5. The User Service communicates with PostgreSQL using SQL.
6. User information is stored in the `users` table.
7. The User Service sends the result back to the frontend through the Vite proxy.

### User Service Responsibility

```text
User Service
     |
     +-- User creation
     +-- User retrieval
     +-- User update
     +-- User deletion
     +-- User validation
```

The User Service is responsible for **user-related operations**.

```text
Browser -> Frontend :5173 -> Vite Proxy -> User Service :8001 -> PostgreSQL -> users table
```

---

# 3. Ticket Service Flow

```text
                       Client / Frontend
                              |
                              | /api/tickets
                              v
                       Vite Proxy :5173
                              |
                              | HTTP
                              v
                     Ticket Service :8002
                           Go / Gin
                              |
                              |
                    +---------+---------+
                    |                   |
                    | Check User        | Create Ticket
                    v                   v
             User Service :8001    PostgreSQL :5432
                    |                   |
                    |                   v
                    |              tickets table
                    |                   |
                    |                   |
                    +---------+---------+
                              |
                              | User exists
                              v
                     Ticket Service
                              |
                              | POST notification
                              v
                Notification Service :8003
                              |
                              | SQL
                              v
                       PostgreSQL :5432
                              |
                              v
                     notifications table
```

### Ticket Creation Flow

1. The user creates a ticket from the frontend.
2. The frontend sends `POST /api/tickets`.
3. Vite forwards the request to the Ticket Service on port `8002`.
4. The Ticket Service receives the ticket information.
5. Before creating the ticket, the Ticket Service validates that the user exists.
6. The Ticket Service sends an HTTP request to the User Service:

   ```text
   GET /api/users/{id}
   ```
7. The User Service checks PostgreSQL to find the requested user.
8. If the user exists, the User Service returns a successful response.
9. The Ticket Service inserts the new ticket into the PostgreSQL `tickets` table.
10. After creating the ticket, the Ticket Service sends a request to the Notification Service.
11. The Notification Service creates a notification in the `notifications` table.
12. The Ticket Service returns the result to the frontend.

### Ticket Service Responsibility

```text
Ticket Service
     |
     +-- Create ticket
     +-- Get tickets
     +-- Get specific ticket
     +-- Update ticket
     +-- Delete ticket
     +-- Validate user
     +-- Trigger notification
```

The Ticket Service is responsible for **ticket-related operations** and coordinates with the User and Notification Services.

``` text
User Exists:

Browser -> :5173 -> Proxy -> :8002 -> :8001 -> DB(users)
        -> User Found -> :8002 -> DB(tickets)
        -> Ticket Created -> :8003 -> DB(notifications)
        -> Notification Created -> :8002 -> :5173 -> Browser


User Does Not Exists:

Browser -> :5173 -> Proxy -> :8002 -> :8001 -> DB(users)
        -> User NOT Found -> :8002 -> STOP -> :5173 -> Browser (Error)

```

---

# 4. Notification Service Flow

```text
                     Client / Frontend
                            |
                            | /api/notifications
                            v
                     Vite Proxy :5173
                            |
                            | HTTP
                            v
                 Notification Service :8003
                     Python / FastAPI
                            |
                            | SQL
                            v
                     PostgreSQL :5432
                            |
                            v
                  notifications table
```

The Notification Service can also be called by the Ticket Service:

```text
                  Ticket Service :8002
                          |
                          | POST /api/notifications
                          v
              Notification Service :8003
                          |
                          | SQL
                          v
                   PostgreSQL :5432
                          |
                          v
                notifications table
```

### Notification Service Flow

1. The frontend can request notification information through `/api/notifications`.
2. Vite forwards the request to port `8003`.
3. The Notification Service is built using Python and FastAPI.
4. The service handles notification-related operations.
5. The Ticket Service can also call the Notification Service after creating a ticket.
6. The Notification Service stores notification information in PostgreSQL.
7. Notification data is stored in the `notifications` table.
8. The result is returned to the requesting service or frontend.

### Notification Service Responsibility

```text
Notification Service
     |
     +-- Create notification
     +-- Get notifications
     +-- Get specific notification
     +-- Update notification
     +-- Delete notification
```

The Notification Service is responsible for **notification-related operations**.

```text
Browser Calls:

Browser -> :5173 -> Proxy -> :8003 -> DB(notifications) -> :8003 -> :5173 -> Browser

Ticket Service Calls:

:8002 -> :8003 -> DB(notifications) -> :8003 -> :8002

```

---

# 5. Create Ticket - Complete Flow

The most important flow in this application is ticket creation.

```text
User
 |
 | 1. Create Ticket
 v
Browser
 |
 | 2. POST /api/tickets
 v
React Frontend :5173
 |
 | 3. Vite Proxy
 v
Ticket Service :8002
 |
 | 4. Check user
 |------------------------------+
 v                              |
User Service :8001              |
 |                              |
 | 5. Query user                |
 v                              |
PostgreSQL                      |
 |                              |
 | 6. User exists               |
 +----------------------------->+
                                |
                                v
                       Ticket Service
                                |
                                | 7. INSERT ticket
                                v
                           PostgreSQL
                                |
                                | 8. Ticket created
                                v
                       Ticket Service
                                |
                                | 9. POST notification
                                v
                   Notification Service :8003
                                |
                                | 10. INSERT notification
                                v
                           PostgreSQL
                                |
                                | 11. Notification created
                                v
                       Ticket Service
                                |
                                v
                         React Frontend
                                |
                                v
                            Browser
```

### Short Version

```text
Browser
   |
   v
Frontend :5173
   |
   v
Ticket Service :8002
   |
   +----> User Service :8001
   |            |
   |            v
   |       PostgreSQL
   |
   +----> PostgreSQL
   |
   +----> Notification Service :8003
                |
                v
           PostgreSQL
```

---

# 6. Communication Types

There are two major communication types in the current application.

## HTTP Communication

Used between the frontend and backend services:

```text
Frontend
   |
   +---- HTTP ----> User Service
   |
   +---- HTTP ----> Ticket Service
   |
   +---- HTTP ----> Notification Service
```

Used between backend services:

```text
Ticket Service
   |
   +---- HTTP ----> User Service
   |
   +---- HTTP ----> Notification Service
```

## Database Communication

All three backend services communicate with PostgreSQL:

```text
User Service
     |
     +---- SQL ----> PostgreSQL


Ticket Service
     |
     +---- SQL ----> PostgreSQL


Notification Service
     |
     +---- SQL ----> PostgreSQL
```

---

# 7. Database Relationship

```text
                    users
                      |
            +---------+---------+
            |                   |
            | user_id           | user_id
            v                   v
        tickets          notifications
            |
            | ticket_id
            v
      notifications
```

Actual relationships:

```text
users.id
   |
   +----> tickets.user_id
   |
   +----> notifications.user_id

tickets.id
   |
   +----> notifications.ticket_id
```

### Meaning

* One user can have multiple tickets.
* One user can have multiple notifications.
* A notification can be associated with a ticket.
* Foreign keys are used to maintain these relationships.

---

# 8. Current Local Architecture

At the moment, all components are running directly on the local Ubuntu machine:

```text
                         Ubuntu Machine
                              |
        +---------------------+---------------------+
        |          |          |          |          |
        v          v          v          v          v
     Frontend    User      Ticket   Notification PostgreSQL
      :5173     :8001      :8002       :8003       :5432
        |          |          |           |           |
        |          |          |           |           |
        +----------+----------+-----------+-----------+
                              |
                              v
                         helpdesk_db
```

The current application therefore uses:

```text
Frontend       → localhost:5173
User Service   → localhost:8001
Ticket Service → localhost:8002
Notification   → localhost:8003
PostgreSQL     → localhost:5432
```
