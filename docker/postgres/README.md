````markdown
# PostgreSQL Dockerization

## Milestone 1

This milestone moves the Helpdesk PostgreSQL database into a Docker container.

The database contains three tables:

- `users`
- `tickets`
- `notifications`

---

## Project Path

```text
/home/sumeet/it-helpdesk/docker/postgres/
````

Structure:

```text
docker/
└── postgres/
    ├── backup/
    │   └── helpdesk_db.dump
    ├── Dockerfile
    └── README.md
```

---

## 1. Existing PostgreSQL Database

Before Dockerization, PostgreSQL was running directly on the Ubuntu host.

Database:

```text
Database: helpdesk_db
User: helpdesk_app
Port: 5432
```

Verify PostgreSQL:

```bash
psql -h localhost -U helpdesk_app -d helpdesk_db
```

Check tables:

```sql
\dt
```

Expected:

```text
notifications
tickets
users
```

---

## 2. Database Backup

Create a PostgreSQL custom-format backup:

```bash
pg_dump \
  -h localhost \
  -U helpdesk_app \
  -d helpdesk_db \
  -Fc \
  -f /home/sumeet/it-helpdesk/docker/postgres/backup/helpdesk_db.dump
```

Verify the backup:

```bash
ls -lh /home/sumeet/it-helpdesk/docker/postgres/backup/helpdesk_db.dump
```

Inspect the dump:

```bash
pg_restore -l \
  /home/sumeet/it-helpdesk/docker/postgres/backup/helpdesk_db.dump
```

The backup contains the database objects and data required to restore:

```text
users
tickets
notifications
```

---

## 3. PostgreSQL Dockerfile

File:

```text
/home/sumeet/it-helpdesk/docker/postgres/Dockerfile
```

The Dockerfile creates an image based on PostgreSQL.

Build the image:

```bash
cd /home/sumeet/it-helpdesk
```

```bash
docker build \
  -f docker/postgres/Dockerfile \
  -t it-helpdesk-postgres:v1 \
  .
```

Verify:

```bash
docker images | grep it-helpdesk
```

Expected image:

```text
it-helpdesk-postgres:v1
```

---

## 4. Run PostgreSQL Container

Create the container:

```bash
docker run -d \
  --name it-helpdesk-postgres \
  -e POSTGRES_DB=helpdesk_db \
  -e POSTGRES_USER=helpdesk_app \
  -e POSTGRES_PASSWORD=helpdesk123 \
  it-helpdesk-postgres:v1
```

Check the container:

```bash
docker ps -a
```

Start it if required:

```bash
docker start it-helpdesk-postgres
```

Check logs:

```bash
docker logs it-helpdesk-postgres
```

---

## 5. Access PostgreSQL Inside the Container

Open PostgreSQL interactively:

```bash
docker exec -it it-helpdesk-postgres \
  psql -U helpdesk_app -d helpdesk_db
```

Check tables:

```sql
\dt
```

Expected:

```text
notifications
tickets
users
```

---

## 6. Restore Database Backup

Copy the backup into the container:

```bash
docker cp \
  /home/sumeet/it-helpdesk/docker/postgres/backup/helpdesk_db.dump \
  it-helpdesk-postgres:/tmp/helpdesk_db.dump
```

Verify:

```bash
docker exec it-helpdesk-postgres \
  ls -lh /tmp/helpdesk_db.dump
```

Restore:

```bash
docker exec it-helpdesk-postgres \
  pg_restore \
  -U helpdesk_app \
  -d helpdesk_db \
  /tmp/helpdesk_db.dump
```

---

## 7. Verify Tables

Check all tables:

```bash
docker exec it-helpdesk-postgres \
  psql -U helpdesk_app -d helpdesk_db -c "\dt"
```

Expected:

```text
notifications
tickets
users
```

Check `users`:

```bash
docker exec it-helpdesk-postgres \
  psql -U helpdesk_app -d helpdesk_db -c "SELECT * FROM users;"
```

Check `tickets`:

```bash
docker exec it-helpdesk-postgres \
  psql -U helpdesk_app -d helpdesk_db -c "SELECT * FROM tickets;"
```

Check `notifications`:

```bash
docker exec it-helpdesk-postgres \
  psql -U helpdesk_app -d helpdesk_db -c "SELECT * FROM notifications;"
```

Current database state:

```text
users
  └── 2 records

tickets
  └── 0 records

notifications
  └── 0 records
```

---

## 8. Database Relationships

The database relationships are:

```text
users
  │
  │ user_id
  ▼
tickets
  │
  │ ticket_id
  ▼
notifications
```

`tickets.user_id` references:

```text
users.id
```

`notifications.user_id` references:

```text
users.id
```

`notifications.ticket_id` references:

```text
tickets.id
```

---

## 9. Important Docker Concept

A Docker image is the template used to create a container.

```text
Dockerfile
     ↓
docker build
     ↓
Docker Image
     ↓
docker run
     ↓
Docker Container
```

For this project:

```text
Dockerfile
     ↓
it-helpdesk-postgres:v1
     ↓
it-helpdesk-postgres
     ↓
PostgreSQL
     ↓
helpdesk_db
     ├── users
     ├── tickets
     └── notifications
```

---

## 10. Milestone Result

### Completed

* [x] PostgreSQL Dockerfile created
* [x] PostgreSQL image built
* [x] PostgreSQL container created
* [x] PostgreSQL container started
* [x] `helpdesk_db` created
* [x] Database backup created
* [x] Backup copied into container
* [x] Database restored
* [x] `users` table verified
* [x] `tickets` table verified
* [x] `notifications` table verified
* [x] User data verified

### Current Architecture

```text
Ubuntu Host
│
├── User Service Container :8001
│
└── PostgreSQL Container
       │
       └── helpdesk_db
              ├── users
              ├── tickets
              └── notifications
```

---

## Next Milestone

### Milestone 2 — Docker Network

The next step is to connect the User Service container and PostgreSQL container using a Docker network.

Current situation:

```text
User Service
    │
    X
    │
PostgreSQL
```

Target:

```text
User Service :8001
       │
       │ Docker Network
       ▼
PostgreSQL :5432
```

This milestone will also explain why:

```text
localhost
```

cannot be used by the User Service to reach PostgreSQL when both applications run in separate containers.

```
```
