# Kubernetes ConfigMap

## Overview

Kubernetes ConfigMap is used to store non-sensitive application configuration separately from the application code and container image.

For the IT Helpdesk project, the User Service previously had PostgreSQL configuration hardcoded inside `user-service/app.py`.

The configuration was moved to Kubernetes ConfigMap and Secret based environment variables.

---

## Before ConfigMap

Previously, `user-service/app.py` contained database configuration directly in the Python code:

```python
DB_CONFIG = {
    "host": "it-helpdesk-postgres",
    "database": "helpdesk_db",
    "user": "helpdesk_app",
    "password": "helpdesk123",
    "port": 5432
}
````

This meant the application code contained both configuration and the database password.

---

## After ConfigMap

The User Service now reads database configuration from environment variables:

```python
import os

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD"),
    "port": int(os.getenv("DB_PORT", "5432"))
}
```

This separates application code from environment-specific configuration.

---

## Configuration Separation

The configuration is divided between ConfigMap and Secret.

### ConfigMap

The following non-sensitive values are stored in:

```text
user-service-config
```

```text
DB_HOST = it-helpdesk-postgres
DB_NAME = helpdesk_db
DB_USER = helpdesk_app
DB_PORT = 5432
```

### Secret

The database password remains in the existing:

```text
postgres-secret
```

The Secret contains:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

The password is mapped to the environment variable expected by the Python application:

```text
POSTGRES_PASSWORD
        |
        v
   DB_PASSWORD
        |
        v
     app.py
```

The password is therefore not stored in the ConfigMap.

---

## ConfigMap File

File:

```text
k8s/configmap/user-service-configmap.yaml
```

Configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
  namespace: it-helpdesk
data:
  DB_HOST: "it-helpdesk-postgres"
  DB_NAME: "helpdesk_db"
  DB_USER: "helpdesk_app"
  DB_PORT: "5432"
```

---

## Create ConfigMap

Dry-run validation:

```bash
kubectl apply --dry-run=client \
  -f k8s/configmap/user-service-configmap.yaml
```

Expected:

```text
configmap/user-service-config created (dry run)
```

Apply the ConfigMap:

```bash
kubectl apply \
  -f k8s/configmap/user-service-configmap.yaml
```

Expected:

```text
configmap/user-service-config created
```

---

## Verify ConfigMap

List ConfigMaps:

```bash
kubectl get configmaps -n it-helpdesk
```

Expected:

```text
NAME                  DATA
kube-root-ca.crt      1
user-service-config   4
```

Describe the ConfigMap:

```bash
kubectl describe configmap user-service-config -n it-helpdesk
```

Expected data:

```text
DB_HOST:
it-helpdesk-postgres

DB_NAME:
helpdesk_db

DB_PORT:
5432

DB_USER:
helpdesk_app
```

---

## User Service Deployment Changes

File:

```text
k8s/user-service/user-service-deployment.yaml
```

The User Service Deployment was updated to load the ConfigMap:

```yaml
envFrom:
  - configMapRef:
      name: user-service-config
```

The database password is loaded separately from the Secret:

```yaml
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: postgres-secret
        key: POSTGRES_PASSWORD
```

The relevant section is:

```yaml
containers:
  - name: user-service
    image: it-helpdesk-user-service:v2
    imagePullPolicy: Never

    envFrom:
      - configMapRef:
          name: user-service-config

    env:
      - name: DB_PASSWORD
        valueFrom:
          secretKeyRef:
            name: postgres-secret
            key: POSTGRES_PASSWORD
```

---

## How Configuration Reaches the Application

```text
                  Kubernetes
                      |
          +-----------+-----------+
          |                       |
          v                       v
   user-service-config      postgres-secret
       ConfigMap                Secret
          |                       |
          |                       |
     DB_HOST                 POSTGRES_PASSWORD
     DB_NAME                       |
     DB_USER                       |
     DB_PORT                       |
          |                       v
          |                  DB_PASSWORD
          |                       |
          +-----------+-----------+
                      |
                      v
              User Service Pod
                      |
                      v
                  app.py
                      |
                      v
                PostgreSQL
```

---

## Why We Use ConfigMap

ConfigMap allows configuration to be changed without putting configuration values directly into application source code.

For example, instead of:

```python
"host": "it-helpdesk-postgres"
```

the application now uses:

```python
"host": os.getenv("DB_HOST")
```

Kubernetes provides the actual value through the ConfigMap.

This makes the application easier to configure for different environments.

---

## ConfigMap vs Secret

```text
ConfigMap
---------
Normal configuration
Non-sensitive values
Database host
Database name
Database user
Database port


Secret
------
Sensitive configuration
Passwords
Tokens
Credentials
```

For this project:

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

## Deployment Verification

After updating the Deployment:

```bash
kubectl apply --dry-run=client \
  -f k8s/user-service/user-service-deployment.yaml
```

Expected:

```text
deployment.apps/user-service configured (dry run)
```

Apply the Deployment:

```bash
kubectl apply \
  -f k8s/user-service/user-service-deployment.yaml
```

Expected:

```text
deployment.apps/user-service configured
```

Check the Deployment:

```bash
kubectl get deployment user-service -n it-helpdesk
```

Expected:

```text
NAME           READY   UP-TO-DATE   AVAILABLE
user-service   1/1     1            1
```

Check the Pod:

```bash
kubectl get pods -n it-helpdesk
```

The User Service Pod should be:

```text
1/1 Running
```

---

## Verify Environment Configuration

Describe the User Service Pod:

```bash
kubectl describe pod <user-service-pod> -n it-helpdesk
```

The output should show:

```text
Environment Variables from:
  user-service-config  ConfigMap
```

And:

```text
Environment:
  DB_PASSWORD:
    <set to the key 'POSTGRES_PASSWORD' in secret 'postgres-secret'>
```

The actual password should not be displayed.

---

## Application Logs

Check the User Service logs:

```bash
kubectl logs <user-service-pod> -n it-helpdesk
```

Successful startup:

```text
Application startup complete.
Uvicorn running on http://0.0.0.0:8001
```

No database connection errors were reported.

---

## Functional Test

The User Service API was tested from inside the Kubernetes cluster:

```bash
kubectl run user-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://user-service:8001/api/users
```

The API successfully returned users from PostgreSQL:

```json
[
  {
    "id": 1,
    "name": "Sumeet Patel P",
    "email": "sumeet@example.com",
    "department": "Infrastructure"
  },
  {
    "id": 3,
    "name": "sam",
    "email": "sam@company.com",
    "department": "HR"
  }
]
```

This confirms that:

```text
ConfigMap
    +
Secret
    +
User Service
    +
PostgreSQL
```

are working together correctly.

---

## Files Changed

This milestone includes the following changes:

```text
k8s/configmap/user-service-configmap.yaml
k8s/configmap/README.md
k8s/user-service/user-service-deployment.yaml
user-service/app.py
```

---

## Important Commands

### Check ConfigMaps

```bash
kubectl get configmaps -n it-helpdesk
```

### Describe ConfigMap

```bash
kubectl describe configmap user-service-config -n it-helpdesk
```

### Check User Service

```bash
kubectl get deployment user-service -n it-helpdesk
```

### Check User Service Pods

```bash
kubectl get pods -n it-helpdesk
```

### Check User Service Logs

```bash
kubectl logs <user-service-pod> -n it-helpdesk
```

### Check Deployment Configuration

```bash
kubectl describe deployment user-service -n it-helpdesk
```

---

## Milestone Result

The User Service database configuration has been separated from the application code.

```text
Before:

app.py
  |
  +-- DB Host
  +-- DB Name
  +-- DB User
  +-- DB Password
  +-- DB Port


After:

ConfigMap
  |
  +-- DB Host
  +-- DB Name
  +-- DB User
  +-- DB Port
          |
          v
     User Service

Secret
  |
  +-- DB Password
          |
          v
     User Service
```

The User Service successfully connects to PostgreSQL and the `/api/users` endpoint returns database records.

**ConfigMap milestone completed successfully.**
