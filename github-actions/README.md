# GitHub Actions

## Overview

GitHub Actions is used in this project for CI/CD automation.

For this project, we are using:

- GitHub Actions
- GitHub repository
- Docker
- GitHub Container Registry (GHCR)
- Kubernetes
- Helm
- Minikube

---

## CI Workflow

The workflow file is:

```text
.github/workflows/ci.yml
````

The workflow runs automatically when:

* Code is pushed to the `main` branch
* A Pull Request is created against the `main` branch

---

## CI Jobs

The workflow validates and builds the application components.

### 1. Python Services

Job name:

```text
Validate Python Services
```

It performs:

1. Checkout the repository
2. Set up Python 3.12
3. Install User Service dependencies
4. Install Notification Service dependencies
5. Check Python syntax

Commands:

```bash
python -m py_compile user-service/app.py
python -m py_compile notification-service/app.py
```

This validates both Python services:

```text
user-service
notification-service
```

---

### 2. Ticket Service

Job name:

```text
Build Ticket Service
```

It performs:

1. Checkout the repository
2. Set up Go 1.25
3. Download Go dependencies
4. Build the Ticket Service

Commands:

```bash
cd ticket-service
go mod download
go build -v .
```

---

### 3. Frontend

Job name:

```text
Build Frontend
```

It performs:

1. Checkout the repository
2. Set up Node.js
3. Install frontend dependencies
4. Build the frontend

Commands:

```bash
cd frontend
npm ci
npm run build
```

---

## Docker Image Build and Push

The CI workflow also builds Docker images for the application components.

Job name:

```text
Build and Push Docker Images
```

The following images are built:

```text
User Service
Notification Service
Ticket Service
Frontend
```

Dockerfiles are located under:

```text
docker/
├── user-service/Dockerfile
├── notification-service/Dockerfile
├── ticket-service/Dockerfile
└── frontend/Dockerfile
```

---

## GitHub Container Registry

The Docker images are pushed to:

```text
ghcr.io
```

GitHub Actions logs in using:

```yaml
permissions:
  contents: read
  packages: write
```

and:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

---

## Image Tagging

Each Docker image is tagged using the Git commit SHA:

```text
${{ github.sha }}
```

For example:

```text
ghcr.io/sumeetp121/it-helpdesk-user-service:<commit-sha>
```

The same approach is used for:

```text
ghcr.io/sumeetp121/it-helpdesk-notification-service:<commit-sha>

ghcr.io/sumeetp121/it-helpdesk-ticket-service:<commit-sha>

ghcr.io/sumeetp121/it-helpdesk-frontend:<commit-sha>
```

### Why use the commit SHA?

The image can be directly connected to the exact Git commit that produced it.

For example:

```text
Git commit
    |
    v
ac74688...
    |
    v
Docker image
    |
    v
user-service:ac74688...
```

This makes it possible to know exactly which source code version is running.

---

## Current CI Flow

```text
Developer
    |
    | git push
    v
GitHub
    |
    v
GitHub Actions
    |
    +-------------------+
    |                   |
    v                   v
Application CI       Docker CI
    |                   |
    +----+------+-------+
         |      |
         v      v
      Python   Go
         |      |
         +---+--+
             |
             v
          Frontend
             |
             v
       Docker Images
             |
             v
       GitHub Container
          Registry
             |
             v
            GHCR
```

---

## CI vs CD

A simple way to remember the difference:

```text
CI = Is my code/build ready?

CD = Take that ready build and deploy it.
```

### CI

Our current CI performs:

```text
Code
  |
  v
Validate
  |
  v
Build
  |
  v
Build Docker Images
  |
  v
Push Images to GHCR
```

### CD

CD will take the Docker images from GHCR and deploy them to Kubernetes.

The future flow will be:

```text
GHCR
  |
  v
Kubernetes
  |
  v
Helm
  |
  v
Minikube / Kubernetes Cluster
```

Later, we will extend this toward:

```text
GitHub
   |
   v
GitHub Actions
   |
   v
GHCR
   |
   v
GitOps
   |
   v
Argo CD
   |
   v
Kubernetes
```

---

## Kubernetes Image Usage

Kubernetes currently uses container images defined in deployment manifests.

Example:

```yaml
containers:
  - name: user-service
    image: ghcr.io/sumeetp121/it-helpdesk-user-service:<commit-sha>
```

Kubernetes uses:

```yaml
imagePullSecrets:
  - name: ghcr-secret
```

to authenticate with the private GitHub Container Registry.

---

## Important Files

```text
.github/
└── workflows/
    └── ci.yml

docker/
├── user-service/
│   └── Dockerfile
├── notification-service/
│   └── Dockerfile
├── ticket-service/
│   └── Dockerfile
└── frontend/
    └── Dockerfile

k8s/
├── user-service/
├── notification-service/
├── ticket-service/
├── frontend/
└── postgres/
```

---

## Local Validation

Before committing the workflow, YAML syntax can be validated using:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml"); puts "GitHub Actions YAML syntax: OK"'
```

Expected output:

```text
GitHub Actions YAML syntax: OK
```

Git whitespace validation:

```bash
git diff --check
```

No output means no whitespace errors were found.

---

## Current Milestone

### GitHub Actions CI + Docker Image Publishing

Status:

```text
CI workflow created
Python services validated
Go service built
Frontend built
Docker images built
Docker images pushed to GHCR
Kubernetes tested with GHCR image
```

The next stage is **CD**.

CD will be responsible for taking the image produced by CI and deploying/updating the application in Kubernetes.

```
```
