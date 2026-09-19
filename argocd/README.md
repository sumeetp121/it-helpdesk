# Argo CD – IT Helpdesk

## 1. Overview

Argo CD is used to implement **GitOps deployment** for the IT Helpdesk project.

Argo CD continuously monitors the Kubernetes configuration stored in the GitHub repository and keeps the Kubernetes cluster synchronized with the desired state defined in Git.

### Git Repository

```text
https://github.com/sumeetp121/it-helpdesk.git
```

### Argo CD Application

```text
it-helpdesk
```

### Kubernetes Namespace

```text
it-helpdesk
```

---

## 2. GitOps Architecture

```text
Developer
    |
    | git push
    v
GitHub Repository
    |
    | Argo CD monitors main branch
    v
Argo CD
    |
    | Helm
    v
Kubernetes Cluster
    |
    +-- frontend
    +-- user-service
    +-- ticket-service
    +-- notification-service
    +-- postgres
```

---

## 3. Argo CD Application Configuration

File:

```text
argocd/it-helpdesk-application.yaml
```

The Argo CD Application connects:

```text
GitHub
   |
   +-- helm/it-helpdesk
   |
   +-- gitops/it-helpdesk-values.yaml
```

The Helm chart defines the Kubernetes resources, while the GitOps values file defines the Docker image versions.

---

## 4. Important Files

```text
argocd/
└── it-helpdesk-application.yaml
```

The Application configuration defines:

* Git repository
* Git branch
* Helm chart path
* GitOps values file
* Kubernetes namespace
* Automated synchronization
* Pruning
* Self-healing

---

## 5. Automated Sync

Argo CD is configured with:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### `prune: true`

If a Kubernetes resource is removed from Git, Argo CD can remove the corresponding resource from the cluster.

### `selfHeal: true`

If someone manually changes a resource in Kubernetes, Argo CD can restore it to the configuration stored in Git.

---

## 6. Install Argo CD

Create the Argo CD namespace:

```bash
kubectl create namespace argocd
```

Install Argo CD:

```bash
kubectl apply \
  -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Check Argo CD pods:

```bash
kubectl get pods -n argocd
```

Expected components include:

```text
argocd-application-controller
argocd-applicationset-controller
argocd-dex-server
argocd-notifications-controller
argocd-redis
argocd-repo-server
argocd-server
```

---

## 7. Create the IT Helpdesk Application

Apply:

```bash
kubectl apply \
  -f argocd/it-helpdesk-application.yaml
```

Check the Application:

```bash
kubectl get application it-helpdesk -n argocd
```

Expected:

```text
NAME          SYNC STATUS   HEALTH STATUS
it-helpdesk   Synced        Healthy
```

---

## 8. Check Application Details

```bash
kubectl describe application it-helpdesk -n argocd
```

Check only sync status:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}'
```

Check only health:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.health.status}{"\n"}'
```

Check both:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}{.status.health.status}{"\n"}'
```

Healthy state:

```text
Synced
Healthy
```

---

## 9. Check Argo CD Resources

```bash
kubectl get pods -n argocd
```

```bash
kubectl get svc -n argocd
```

Check the Argo CD Application CRD:

```bash
kubectl get applications.argoproj.io -A
```

---

## 10. Access Argo CD UI

Check the Argo CD server:

```bash
kubectl get svc argocd-server -n argocd
```

For local Minikube:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Open:

```text
https://localhost:8080
```

Get the initial admin password:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d
```

Username:

```text
admin
```

---

## 11. GitOps Deployment Flow

The complete flow is:

```text
Developer changes application
        |
        v
Git commit
        |
        v
Git push
        |
        v
GitHub Actions
        |
        +-- Test
        +-- Build Docker images
        +-- Push images to GHCR
        |
        v
GitOps values
        |
        v
Argo CD detects Git change
        |
        v
Helm renders Kubernetes manifests
        |
        v
Argo CD synchronizes cluster
        |
        v
New application version deployed
```

---

## 12. Verify Deployment

Check deployments:

```bash
kubectl get deployments -n it-helpdesk
```

Check pods:

```bash
kubectl get pods -n it-helpdesk
```

Check images:

```bash
kubectl get deployments -n it-helpdesk \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
```

Check Argo CD:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}{.status.health.status}{"\n"}'
```

Expected:

```text
Synced
Healthy
```

---

## 13. Manual Sync

If automated synchronization is disabled or a manual sync is required:

```bash
kubectl patch application it-helpdesk \
  -n argocd \
  --type merge \
  -p '{"operation":{"sync":{}}}'
```

Then verify:

```bash
kubectl get application it-helpdesk -n argocd
```

---

## 14. GitOps Principle

With Argo CD, Kubernetes should be treated as the **deployment target**, while Git is the **source of truth**.

```text
Git
 |
 | Desired State
 v
Argo CD
 |
 | Reconciliation
 v
Kubernetes
```

Changes should normally be made in Git rather than manually modifying Kubernetes resources.

---

## 15. Useful Commands

### Application status

```bash
kubectl get application it-helpdesk -n argocd
```

### Application details

```bash
kubectl describe application it-helpdesk -n argocd
```

### Argo CD applications

```bash
kubectl get applications.argoproj.io -A
```

### Argo CD pods

```bash
kubectl get pods -n argocd
```

### IT Helpdesk pods

```bash
kubectl get pods -n it-helpdesk
```

### IT Helpdesk deployments

```bash
kubectl get deployments -n it-helpdesk
```

### Verify Git status

```bash
git status
```

### View Git history

```bash
git log --oneline
```

---

## 16. Current IT Helpdesk GitOps Components

```text
GitHub
   |
   +-- .github/workflows/ci.yml
   |
   +-- helm/it-helpdesk/
   |      |
   |      +-- Chart.yaml
   |      +-- values.yaml
   |      +-- templates/
   |
   +-- gitops/
   |      |
   |      +-- it-helpdesk-values.yaml
   |
   +-- argocd/
          |
          +-- it-helpdesk-application.yaml
```

### Responsibilities

| Component      | Responsibility                               |
| -------------- | -------------------------------------------- |
| GitHub         | Stores source code and desired configuration |
| GitHub Actions | Tests and builds application images          |
| GHCR           | Stores Docker images                         |
| Helm           | Generates Kubernetes manifests               |
| `gitops/`      | Stores desired application image versions    |
| Argo CD        | Synchronizes Git state with Kubernetes       |
| Kubernetes     | Runs the application                         |

---

## 17. Desired Final State

```text
Developer
    |
    v
GitHub
    |
    v
GitHub Actions
    |
    v
GHCR
    |
    v
GitOps Values
    |
    v
Argo CD
    |
    v
Helm
    |
    v
Kubernetes
    |
    +-- Frontend
    +-- User Service
    +-- Ticket Service
    +-- Notification Service
    +-- PostgreSQL
```

The expected Argo CD state is:

```text
SYNC STATUS:   Synced
HEALTH STATUS: Healthy
```
