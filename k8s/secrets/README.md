# Kubernetes Secrets

This directory contains the Kubernetes Secret configuration used by the IT Helpdesk application.

## Purpose

Kubernetes Secrets are used to store sensitive information separately from application code and Deployment configuration.

In this project, the PostgreSQL password is stored in a Kubernetes Secret instead of being hardcoded in the application code.

---

## Secret File

```text
k8s/secrets/postgres-secret.yaml
```

The Secret is:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
  namespace: it-helpdesk
type: Opaque
stringData:
  POSTGRES_USER: helpdesk_app
  POSTGRES_PASSWORD: helpdesk123
  POSTGRES_DB: helpdesk_db
```

### Secret Keys

| Key                 | Purpose                  |
| ------------------- | ------------------------ |
| `POSTGRES_USER`     | PostgreSQL username      |
| `POSTGRES_PASSWORD` | PostgreSQL password      |
| `POSTGRES_DB`       | PostgreSQL database name |

> **Note:** This project uses `stringData` for local Kubernetes learning. In a production environment, use a proper secret-management solution.

---

# Services Using the Secret

The PostgreSQL password is provided to the backend services through the `DB_PASSWORD` environment variable.

The Kubernetes mapping is:

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: POSTGRES_PASSWORD
```

This means:

```text
Kubernetes Secret
       |
       | POSTGRES_PASSWORD
       v
DB_PASSWORD environment variable
       |
       v
Application
```

---

# User Service

## Application Change

The User Service database configuration reads the password from the environment:

```python
"password": os.getenv("DB_PASSWORD")
```

Other database configuration values are provided through the User Service ConfigMap.

## Verification

```bash
kubectl run user-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://user-service:8001/api/users
```

The API successfully returned users from PostgreSQL.

---

# Ticket Service

## Application Change

The Ticket Service previously had the PostgreSQL password hardcoded.

It was changed to:

```go
dbPassword = os.Getenv("DB_PASSWORD")
```

The password is now read from the environment instead of being stored directly in the Go source code.

## Deployment

The Ticket Service Deployment uses:

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: POSTGRES_PASSWORD
```

## Image

A new image was built after the code change:

```text
it-helpdesk-ticket-service:v6
```

The image was loaded into Minikube and deployed.

## Verification

```bash
kubectl run ticket-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://ticket-service:8002/health
```

Expected response:

```json
{"service":"ticket-service","status":"healthy"}
```

The health check successfully returned:

```json
{"service":"ticket-service","status":"healthy"}
```

This confirms that the Ticket Service started successfully and connected to PostgreSQL using the Secret-provided password.

---

# Notification Service

## Application Change

The Notification Service previously had the PostgreSQL password hardcoded:

```python
"password": "helpdesk123"
```

It was changed to:

```python
"password": os.getenv("DB_PASSWORD")
```

The `os` module was also added:

```python
import os
```

## Deployment

The Notification Service Deployment uses:

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: POSTGRES_PASSWORD
```

## Verification

```bash
kubectl run notification-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://notification-service:8003/health
```

Expected response:

```json
{"status":"healthy","service":"notification-service"}
```

The health check successfully returned:

```json
{"status":"healthy","service":"notification-service"}
```

This confirms that the Notification Service started successfully and connected to PostgreSQL using the Secret-provided password.

---

# Current Kubernetes Status

Check all application Pods:

```bash
kubectl get pods -n it-helpdesk
```

Expected backend services:

```text
user-service              1/1 Running
ticket-service            1/1 Running
notification-service      1/1 Running
postgres                  1/1 Running
```

---

# Useful Commands

## View the Secret

```bash
kubectl get secret postgres-secret -n it-helpdesk
```

## Describe the Secret

```bash
kubectl describe secret postgres-secret -n it-helpdesk
```

`kubectl describe secret` does not normally display the Secret values.

## Check Secret Keys

```bash
kubectl get secret postgres-secret \
  -n it-helpdesk \
  -o jsonpath='{.data}'
```

Do not expose decoded Secret values unnecessarily.

## Check Deployments

```bash
kubectl get deployment user-service -n it-helpdesk -o yaml
```

```bash
kubectl get deployment ticket-service -n it-helpdesk -o yaml
```

```bash
kubectl get deployment notification-service -n it-helpdesk -o yaml
```

## Check Pods

```bash
kubectl get pods -n it-helpdesk
```

## Check Logs

```bash
kubectl logs deployment/user-service -n it-helpdesk
```

```bash
kubectl logs deployment/ticket-service -n it-helpdesk
```

```bash
kubectl logs deployment/notification-service -n it-helpdesk
```

---

# Important Concept

The application should not contain the PostgreSQL password directly.

Instead of:

```text
Application Code
      |
      +-- password = "helpdesk123"
```

we use:

```text
Kubernetes Secret
      |
      +-- POSTGRES_PASSWORD
                |
                v
          DB_PASSWORD
                |
                v
        Application Code
```

The application reads:

```text
DB_PASSWORD
```

from its environment.

This separates sensitive configuration from application source code.

---

# Secret vs ConfigMap

| Resource  | Used For                                |
| --------- | --------------------------------------- |
| ConfigMap | Non-sensitive configuration             |
| Secret    | Sensitive information such as passwords |

In this project:

```text
ConfigMap
   |
   +-- DB_HOST
   +-- DB_NAME
   +-- DB_USER
   +-- DB_PORT


Secret
   |
   +-- POSTGRES_PASSWORD
```

---

# Milestone Verification

The Kubernetes Secrets milestone is complete when:

* [x] PostgreSQL Secret exists
* [x] User Service uses the Secret for `DB_PASSWORD`
* [x] Ticket Service uses the Secret for `DB_PASSWORD`
* [x] Notification Service uses the Secret for `DB_PASSWORD`
* [x] Ticket Service health check passes
* [x] Notification Service health check passes
* [x] All backend Pods are Running

---

