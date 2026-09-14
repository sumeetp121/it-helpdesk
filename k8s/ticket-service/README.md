# Ticket Service - Kubernetes Deployment

This directory contains the Kubernetes manifests and operational documentation for deploying the **Ticket Service** into the `it-helpdesk` Kubernetes namespace.

---

## 1. Service Details

| Item                 | Value                            |
| -------------------- | -------------------------------- |
| Service Name         | ticket-service                   |
| Application Port     | 8002                             |
| Kubernetes Namespace | it-helpdesk                      |
| Docker Image         | it-helpdesk-ticket-service:v5    |
| Previous Image       | it-helpdesk-ticket-service:v4    |
| Replicas             | 1                                |
| Service Type         | ClusterIP                        |
| Database             | PostgreSQL                       |
| Database Service     | it-helpdesk-postgres             |
| User Service         | it-helpdesk-user-service         |
| Notification Service | it-helpdesk-notification-service |

---

## 2. Ticket Service Dependencies

The Ticket Service communicates with three components:

```text
Ticket Service
     |
     ├── PostgreSQL
     │     └── it-helpdesk-postgres:5432
     │
     ├── User Service
     │     └── it-helpdesk-user-service:8001
     │
     └── Notification Service
           └── it-helpdesk-notification-service:8003
```

These hostnames were taken from the Ticket Service application configuration in:

```text
ticket-service/main.go
```

The application listens on:

```text
8002
```

---

## 3. Verify Application Configuration

Check the Ticket Service dependencies:

```bash
grep -n -E 'DB_CONFIG|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|it-helpdesk-postgres|user-service|notification-service|localhost|8001|8003' ticket-service/main.go
```

The application uses:

```text
Database:
it-helpdesk-postgres:5432
```

User Service:

```text
http://it-helpdesk-user-service:8001/api/users/
```

Notification Service:

```text
http://it-helpdesk-notification-service:8003/api/notifications
```

The application listens on:

```text
:8002
```

---

# 4. Important Docker Issue - v4

The original Ticket Service Dockerfile used:

```dockerfile
FROM golang:latest

WORKDIR /app

COPY ticket-service/go.mod ticket-service/go.sum ./

RUN go mod download

COPY ticket-service/main.go .

EXPOSE 8002

CMD ["go", "run", "main.go"]
```

The important problem was:

```text
CMD ["go", "run", "main.go"]
```

`go run` compiles the Go application when the container starts.

Therefore the Kubernetes container was doing:

```text
Container starts
      ↓
Go compiler starts
      ↓
Application is compiled
      ↓
High memory usage
      ↓
Container exceeds memory limit
      ↓
OOMKilled
```

---

# 5. Kubernetes OOM Incident

The first Kubernetes deployment used:

```text
it-helpdesk-ticket-service:v4
```

The Pod repeatedly restarted.

The logs showed:

```text
runtime: /usr/local/go/pkg/tool/linux_amd64/compile: signal: killed
```

The Pod description confirmed:

```text
Reason: OOMKilled
```

The original Kubernetes memory limit was:

```yaml
limits:
  memory: "128Mi"
```

The Pod reached the memory limit while compiling the Go application.

The restart count reached:

```text
3
```

This was identified as a container build/runtime design problem rather than a Kubernetes Service selector problem.

---

# 6. Docker Multi-Stage Build Fix

The Dockerfile was changed to a multi-stage build.

Current file:

```text
docker/ticket-service/Dockerfile
```

Current structure:

```dockerfile
# Stage 1: Build the Go application
FROM golang:1.25 AS builder

WORKDIR /app

COPY ticket-service/go.mod ticket-service/go.sum ./

RUN go mod download

COPY ticket-service/main.go .

RUN go build -o ticket-service main.go


# Stage 2: Runtime image
FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/ticket-service .

EXPOSE 8002

CMD ["./ticket-service"]
```

The Go version was changed to:

```text
golang:1.25
```

because the application's `go.mod` requires:

```text
go >= 1.25.0
```

---

# 7. Why Multi-Stage Build Was Used

The new process is:

```text
Docker Build
     |
     v
Go Builder Image
     |
     | compile
     v
ticket-service binary
     |
     v
Debian Runtime Image
     |
     v
Run compiled binary
```

The Kubernetes container no longer compiles the Go application during startup.

It only runs:

```text
./ticket-service
```

This significantly reduces startup resource requirements.

---

# 8. Image Size Improvement

The original Ticket Service image was approximately:

```text
v4 → 1.58 GB
```

The new image is:

```text
v5 → 162 MB
```

Image verification:

```bash
docker images | grep it-helpdesk-ticket-service
```

Result included:

```text
it-helpdesk-ticket-service:v4   1.58GB
it-helpdesk-ticket-service:v5   162MB
```

The new image is approximately 90% smaller than the original image.

---

# 9. Build Ticket Service Image

Build:

```bash
docker build \
  -t it-helpdesk-ticket-service:v5 \
  -f docker/ticket-service/Dockerfile .
```

Verify:

```bash
docker images | grep it-helpdesk-ticket-service
```

---

# 10. Load Image into Minikube

Because the local Kubernetes environment uses:

```yaml
imagePullPolicy: Never
```

the image must be loaded into Minikube.

Run:

```bash
minikube image load it-helpdesk-ticket-service:v5
```

Verify:

```bash
minikube image ls | grep it-helpdesk-ticket-service
```

Expected:

```text
docker.io/library/it-helpdesk-ticket-service:v5
```

---

# 11. Kubernetes Deployment

Deployment file:

```text
k8s/ticket-service/ticket-service-deployment.yaml
```

Apply:

```bash
kubectl apply -f k8s/ticket-service/ticket-service-deployment.yaml
```

Check:

```bash
kubectl get deployment -n it-helpdesk
```

Check Pods:

```bash
kubectl get pods -n it-helpdesk -l app=ticket-service
```

Expected:

```text
ticket-service-xxxxxxxxxx-xxxxx   1/1   Running   0
```

---

# 12. Resource Configuration

The Ticket Service Deployment currently uses:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "64Mi"
  limits:
    cpu: "250m"
    memory: "128Mi"
```

The important point is that the application now runs as a precompiled binary.

The previous `v4` image was OOMKilled while compiling the application at startup.

The `v5` image runs successfully with the same Kubernetes memory limit.

---

# 13. Verify Ticket Service Pod

Run:

```bash
kubectl get pods -n it-helpdesk -l app=ticket-service
```

Detailed information:

```bash
kubectl describe pod -n it-helpdesk -l app=ticket-service
```

Successful `v5` deployment showed:

```text
Image:          it-helpdesk-ticket-service:v5
State:          Running
Ready:          True
Restart Count:  0
```

This confirms that the OOM problem was resolved.

---

# 14. Ticket Service Kubernetes Service

Service file:

```text
k8s/ticket-service/ticket-service-service.yaml
```

Apply:

```bash
kubectl apply -f k8s/ticket-service/ticket-service-service.yaml
```

Check:

```bash
kubectl get svc ticket-service -n it-helpdesk
```

Expected configuration:

```text
Service Type: ClusterIP
Port:         8002
Target Port:  8002
```

---

# 15. Verify Ticket Service Endpoint

Run:

```bash
kubectl get endpoints ticket-service -n it-helpdesk
```

The Service should have an endpoint similar to:

```text
10.244.0.xxx:8002
```

The endpoint confirms that the Service selector has found the Ticket Service Pod.

Modern Kubernetes uses EndpointSlice.

Check:

```bash
kubectl get endpointslice -n it-helpdesk
```

The warning from:

```bash
kubectl get endpoints
```

about the Endpoints API being deprecated is not an application failure.

---

# 16. User Service Alias

The Ticket Service application expects:

```text
it-helpdesk-user-service:8001
```

The existing User Service was originally named:

```text
user-service
```

To avoid changing and rebuilding the Ticket Service application, a second Kubernetes Service name was created.

File:

```text
k8s/user-service/user-service-alias.yaml
```

The alias:

```text
it-helpdesk-user-service
```

selects the existing Pods with:

```text
app=user-service
```

Therefore:

```text
it-helpdesk-user-service
          |
          v
Existing User Service Pod
```

No second application or second Pod is created.

Verify:

```bash
kubectl get svc it-helpdesk-user-service -n it-helpdesk
```

Verify endpoint:

```bash
kubectl get endpoints it-helpdesk-user-service -n it-helpdesk
```

---

# 17. Notification Service Alias

The Ticket Service application expects:

```text
it-helpdesk-notification-service:8003
```

The existing Notification Service was originally named:

```text
notification-service
```

Therefore a second Kubernetes Service name was created.

File:

```text
k8s/notification-service/notification-service-alias.yaml
```

The alias selects:

```text
app=notification-service
```

Verify:

```bash
kubectl get svc it-helpdesk-notification-service -n it-helpdesk
```

Verify endpoint:

```bash
kubectl get endpoints it-helpdesk-notification-service -n it-helpdesk
```

---

# 18. Test Ticket Service Health

Run a temporary curl Pod:

```bash
kubectl run ticket-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://ticket-service:8002/health
```

Successful result:

```json
{"service":"ticket-service","status":"healthy"}
```

This confirms:

* Ticket Service Pod is running.
* Ticket Service Service is reachable.
* Kubernetes DNS is working.
* Port 8002 is reachable.
* PostgreSQL health check from the application is successful.

---

# 19. Test Ticket Creation

The Ticket API uses:

```text
POST /api/tickets
```

The request format is:

```json
{
  "title": "Kubernetes test ticket",
  "description": "Testing Ticket Service communication in Kubernetes",
  "category": "Infrastructure",
  "priority": "High",
  "user_id": 1
}
```

Run:

```bash
kubectl run ticket-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s -X POST http://ticket-service:8002/api/tickets \
  -H "Content-Type: application/json" \
  -d '{"title":"Kubernetes test ticket","description":"Testing Ticket Service communication in Kubernetes","category":"Infrastructure","priority":"High","user_id":1}'
```

Successful result:

```json
{
  "id": 7,
  "title": "Kubernetes test ticket",
  "description": "Testing Ticket Service communication in Kubernetes",
  "category": "Infrastructure",
  "priority": "High",
  "status": "Open",
  "user_id": 1
}
```

The Ticket Service automatically assigned:

```text
status = Open
```

because the request did not specify a status.

---

# 20. Verify Notification Creation

When a ticket is created, the Ticket Service calls the Notification Service.

Test:

```bash
kubectl run notification-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://notification-service:8003/api/notifications
```

Successful result:

```json
[
  {
    "id": 5,
    "user_id": 1,
    "message": "Your ticket has been created successfully.",
    "ticket_id": 7,
    "read": false
  }
]
```

This confirms that the Ticket Service successfully communicated with the Notification Service.

---

# 21. Verify Ticket Retrieval

Retrieve the created ticket:

```bash
kubectl run ticket-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://ticket-service:8002/api/tickets/7
```

Successful result:

```json
{
  "id": 7,
  "title": "Kubernetes test ticket",
  "description": "Testing Ticket Service communication in Kubernetes",
  "category": "Infrastructure",
  "priority": "High",
  "status": "Open",
  "user_id": 1
}
```

---

# 22. Complete End-to-End Flow

The successful test proved the following:

```text
Client
  |
  | POST /api/tickets
  v
Ticket Service :8002
  |
  | Validate user
  v
User Service :8001
  |
  v
PostgreSQL
  |
  | User exists
  v
Ticket Service
  |
  | INSERT ticket
  v
PostgreSQL
  |
  | Ticket created
  v
Ticket Service
  |
  | Create notification
  v
Notification Service :8003
  |
  v
PostgreSQL
  |
  | Notification created
  v
Ticket Service
  |
  v
Client
```

---

# 23. Useful Troubleshooting Commands

Check all resources:

```bash
kubectl get all -n it-helpdesk
```

Check Ticket Service Pods:

```bash
kubectl get pods -n it-helpdesk -l app=ticket-service
```

Check Pod labels:

```bash
kubectl get pods -n it-helpdesk --show-labels
```

Check logs:

```bash
kubectl logs -n it-helpdesk -l app=ticket-service
```

Follow logs:

```bash
kubectl logs -f -n it-helpdesk -l app=ticket-service
```

Describe Pod:

```bash
kubectl describe pod -n it-helpdesk -l app=ticket-service
```

Describe Deployment:

```bash
kubectl describe deployment ticket-service -n it-helpdesk
```

Check Service:

```bash
kubectl get svc ticket-service -n it-helpdesk
```

Describe Service:

```bash
kubectl describe svc ticket-service -n it-helpdesk
```

Check endpoint:

```bash
kubectl get endpoints ticket-service -n it-helpdesk
```

Check EndpointSlice:

```bash
kubectl get endpointslice -n it-helpdesk
```

Check events:

```bash
kubectl get events -n it-helpdesk --sort-by=.lastTimestamp
```

---

# 24. Troubleshooting OOMKilled

If the Ticket Service is OOMKilled:

```bash
kubectl describe pod -n it-helpdesk -l app=ticket-service
```

Look for:

```text
Reason: OOMKilled
```

Check the image:

```bash
kubectl get pod -n it-helpdesk -l app=ticket-service \
  -o jsonpath='{.items[0].spec.containers[0].image}'
```

Expected:

```text
it-helpdesk-ticket-service:v5
```

Check the local image:

```bash
docker images | grep it-helpdesk-ticket-service
```

Check the Minikube image:

```bash
minikube image ls | grep it-helpdesk-ticket-service
```

If `v5` is missing from Minikube:

```bash
minikube image load it-helpdesk-ticket-service:v5
```

---

# 25. Troubleshooting Service Connectivity

If the Ticket Service cannot reach User Service:

```bash
kubectl get svc it-helpdesk-user-service -n it-helpdesk
```

```bash
kubectl get endpoints it-helpdesk-user-service -n it-helpdesk
```

If the Notification Service cannot be reached:

```bash
kubectl get svc it-helpdesk-notification-service -n it-helpdesk
```

```bash
kubectl get endpoints it-helpdesk-notification-service -n it-helpdesk
```

Check PostgreSQL:

```bash
kubectl get svc it-helpdesk-postgres -n it-helpdesk
```

```bash
kubectl get endpoints it-helpdesk-postgres -n it-helpdesk
```

---

# 26. Current Kubernetes Backend Architecture

```text
it-helpdesk Namespace
│
├── PostgreSQL
│   ├── Deployment
│   ├── Service
│   ├── PVC
│   └── StorageClass
│
├── User Service
│   ├── Deployment
│   ├── user-service
│   └── it-helpdesk-user-service
│
├── Notification Service
│   ├── Deployment
│   ├── notification-service
│   └── it-helpdesk-notification-service
│
└── Ticket Service
    ├── Deployment
    └── ticket-service
```

---

# 27. Current Service Communication

```text
Ticket Service :8002
        |
        +----> it-helpdesk-user-service:8001
        |
        +----> it-helpdesk-notification-service:8003
        |
        +----> it-helpdesk-postgres:5432
```

---

# 28. Milestone Status

Ticket Service Kubernetes deployment is complete.

Completed:

* [x] Ticket Service application configuration inspected
* [x] Dependencies identified
* [x] Port 8002 confirmed
* [x] User Service hostname identified
* [x] Notification Service hostname identified
* [x] PostgreSQL hostname identified
* [x] User Service alias created
* [x] Notification Service alias created
* [x] Original `v4` OOM problem identified
* [x] Multi-stage Docker build implemented
* [x] Go version corrected to 1.25
* [x] Ticket Service `v5` image built
* [x] Image reduced from approximately 1.58 GB to 162 MB
* [x] `v5` image loaded into Minikube
* [x] Kubernetes Deployment updated to `v5`
* [x] Pod running successfully
* [x] Restart count verified as 0
* [x] ClusterIP Service created
* [x] Service endpoint verified
* [x] Health endpoint tested
* [x] Ticket creation tested
* [x] User Service communication verified
* [x] Notification creation verified
* [x] Ticket retrieval verified
* [x] End-to-end microservice flow verified

---

# 29. Important Design Note

The current Ticket Service contains database credentials and service URLs directly in the Go source code.

For example:

```text
dbHost
dbUser
dbPassword
dbName
```

and service URLs are currently hardcoded.

This is acceptable for the current learning milestone.

A later Kubernetes configuration milestone will move configuration out of application code using:

```text
ConfigMap
    +
Secret
    ↓
Environment Variables
    ↓
Application
```

This will also remove sensitive database credentials from the source code.

---

# 30. Next Milestone

The three backend microservices and PostgreSQL are now running in Kubernetes.

The next major milestone is the **Frontend**.

The frontend will provide a browser-accessible interface for the IT Helpdesk application and will eventually communicate with the backend services through the appropriate Kubernetes networking layer.
