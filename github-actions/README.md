# GitHub Actions

## Overview

GitHub Actions is used in this project for CI/CD automation.

For this project, we are using:

* GitHub Actions
* GitHub repository
* Kubernetes
* Helm
* Minikube

---

## Current CI Workflow

The current GitHub Actions workflow performs **Continuous Integration (CI)**.

Workflow file:

```text
.github/workflows/ci.yml
```

The workflow runs automatically when:

* Code is pushed to the `main` branch
* A Pull Request is created against the `main` branch

---

## CI Jobs

The workflow contains three independent jobs.

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

Python syntax is checked using:

```bash
python -m py_compile user-service/app.py
python -m py_compile notification-service/app.py
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

Commands used:

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
2. Set up Node.js 20
3. Install frontend dependencies
4. Build the frontend

Commands used:

```bash
cd frontend
npm ci
npm run build
```

---

## Workflow Structure

```text
GitHub Push / Pull Request
          |
          v
   GitHub Actions CI
          |
    +-----+-----+
    |     |     |
    v     v     v
 Python  Go   Frontend
   |      |      |
   v      v      v
Syntax  Build   Build
 Check
```

The three jobs run independently.

If a job fails, GitHub Actions marks the workflow as failed.

---

## Why CI Is Useful

Without CI, we would have to manually check the project after every code change.

GitHub Actions automatically checks the application after code is pushed.

For example:

```text
Developer changes code
        |
        v
Push to GitHub
        |
        v
GitHub Actions starts
        |
        +--> Python validation
        |
        +--> Go build
        |
        +--> Frontend build
        |
        v
      Result
```

This helps catch problems early.

---

## Important Files

```text
.github/
└── workflows/
    └── ci.yml
```

The workflow configuration is stored inside:

```text
.github/workflows/
```

GitHub automatically detects workflow YAML files in this directory.

---

## Local Validation

Before committing the workflow, YAML syntax was validated locally using Ruby:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/ci.yml"); puts "GitHub Actions YAML syntax: OK"'
```

Expected output:

```text
GitHub Actions YAML syntax: OK
```

Git whitespace validation:

```bash
git diff --cached --check
```

No output means no whitespace errors were found.

---

## Current Scope

The current workflow is **CI only**.

It currently:

* Validates Python services
* Builds the Go Ticket Service
* Builds the React/Vite frontend

It does **not yet**:

* Build Docker images
* Push Docker images to a registry
* Deploy to Kubernetes
* Perform Helm deployment
* Perform GitOps deployment
* Use Argo CD

Those will be added in later milestones.

---

## Git Workflow

After completing a GitHub Actions milestone:

```bash
git status
git add .
git commit -m "message"
git push origin main
```

Always verify the GitHub Actions workflow after pushing.

---

## Current Milestone

### GitHub Actions CI

Status:

```text
CI workflow created
YAML syntax validated
Workflow committed
```

