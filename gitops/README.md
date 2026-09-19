# GitOps – IT Helpdesk

## 1. What is GitOps?

GitOps is a deployment approach where **Git is the source of truth** for the desired state of the Kubernetes application.

In this project:

```text
Developer
   |
   v
GitHub Repository
   |
   +----------------------+
   |                      |
   v                      v
GitHub Actions          Argo CD
   |                      |
   v                      v
Build Docker Images      Helm Chart
   |                      |
   v                      v
GHCR                    Kubernetes
```

The desired application configuration is stored in Git, and Argo CD continuously compares the Git state with the Kubernetes cluster.

---

## 2. GitOps Directory

```text
gitops/
├── README.md
└── it-helpdesk-values.yaml
```

### `it-helpdesk-values.yaml`

This file contains the GitOps-specific image tags used by the Helm chart.

Example:

```yaml
images:
  userService:
    tag: "717957c939d65b9bc8eddac3df7c149f8b26ebab"

  ticketService:
    tag: "717957c939d65b9bc8eddac3df7c149f8b26ebab"

  notificationService:
    tag: "717957c939d65b9bc8eddac3df7c149f8b26ebab"

  frontend:
    tag: "717957c939d65b9bc8eddac3df7c149f8b26ebab"
```

The tag is the Git commit SHA used to identify the Docker image.

---

## 3. Why Use Git Commit SHA as Image Tag?

GitHub Actions builds and pushes Docker images using the Git commit SHA.

Example:

```text
ghcr.io/sumeetp121/it-helpdesk-user-service:717957c939d65b9bc8eddac3df7c149f8b26ebab
```

This provides a direct relationship between:

```text
Git commit
     |
     v
Docker image
     |
     v
Kubernetes deployment
```

It also makes it possible to identify exactly which source-code version is running in Kubernetes.

---

## 4. GitHub Actions and GitOps

The CI pipeline performs the following tasks:

```text
Git Push
   |
   v
GitHub Actions
   |
   +--> Validate Python
   |
   +--> Build Go service
   |
   +--> Build frontend
   |
   +--> Build Docker images
   |
   v
Push images to GHCR
```

The Docker images are stored in GitHub Container Registry.

Repositories:

```text
ghcr.io/sumeetp121/it-helpdesk-user-service
ghcr.io/sumeetp121/it-helpdesk-ticket-service
ghcr.io/sumeetp121/it-helpdesk-notification-service
ghcr.io/sumeetp121/it-helpdesk-frontend
```

---

## 5. GitOps Deployment Flow

The complete deployment flow is:

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
    | Build & Push
    v
GHCR
    |
    | Docker images
    |
    v
GitOps values
    |
    | Image tag
    v
Argo CD
    |
    v
Helm Chart
    |
    v
Kubernetes
    |
    v
IT Helpdesk Pods
```

---

## 6. Helm and GitOps Values

The Helm chart is located at:

```text
helm/it-helpdesk/
```

The GitOps values are located at:

```text
gitops/it-helpdesk-values.yaml
```

The Helm chart contains the application configuration, while the GitOps values file contains the image versions that should be deployed.

Conceptually:

```text
Helm Chart
    +
GitOps Values
    |
    v
Rendered Kubernetes Manifests
```

---

## 7. Desired State

Git contains the desired state.

For example:

```yaml
images:
  frontend:
    tag: "717957c939d65b9bc8eddac3df7c149f8b26ebab"
```

This means Git declares that Kubernetes should run:

```text
ghcr.io/sumeetp121/it-helpdesk-frontend:
717957c939d65b9bc8eddac3df7c149f8b26ebab
```

Argo CD compares this desired state with the actual Kubernetes state.

---

## 8. Automated Synchronization

The Argo CD Application is configured with:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### Automated Sync

Argo CD automatically applies changes detected in Git.

### Self Heal

If someone manually changes a resource in Kubernetes, Argo CD can restore the state defined in Git.

### Prune

Resources removed from the desired Git configuration can be removed from the Kubernetes application.

---

## 9. Checking GitOps Status

Check the Argo CD Application:

```bash
kubectl get application it-helpdesk -n argocd
```

Check only Sync and Health status:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}{.status.health.status}{"\n"}'
```

Expected healthy state:

```text
Synced
Healthy
```

---

## 10. Check Kubernetes State

```bash
kubectl get pods -n it-helpdesk
```

Check deployed images:

```bash
kubectl get deployments -n it-helpdesk \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
```

---

## 11. Updating an Application Version

When a new Docker image is available, update:

```text
gitops/it-helpdesk-values.yaml
```

For example:

```yaml
images:
  frontend:
    tag: "NEW_COMMIT_SHA"
```

After committing and pushing the change:

```text
GitHub
   |
   v
Argo CD detects change
   |
   v
Helm renders new configuration
   |
   v
Kubernetes Deployment updated
   |
   v
New Pod created
```

No manual `helm upgrade` should be required when Argo CD automated synchronization is enabled.

---

## 12. Verify After a GitOps Change

Check Git:

```bash
git status
git log -1 --oneline
```

Check Argo CD:

```bash
kubectl get application it-helpdesk -n argocd \
  -o jsonpath='{.status.sync.status}{"\n"}{.status.health.status}{"\n"}'
```

Check Pods:

```bash
kubectl get pods -n it-helpdesk
```

Check deployed images:

```bash
kubectl get deployments -n it-helpdesk \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
```

---

## 13. GitOps Troubleshooting

### Application is `Unknown`

```bash
kubectl describe application it-helpdesk -n argocd
```

Look under:

```text
Conditions
```

Common causes include:

* Incorrect repository path
* Incorrect values file path
* Git repository not accessible
* Helm template error

---

### Application is `OutOfSync`

Check:

```bash
kubectl get application it-helpdesk -n argocd
```

Then:

```bash
kubectl describe application it-helpdesk -n argocd
```

`OutOfSync` means the Kubernetes state does not currently match the desired state in Git.

---

### Application is `Progressing`

Check:

```bash
kubectl get pods -n it-helpdesk
```

Then inspect the affected pod:

```bash
kubectl describe pod <pod-name> -n it-helpdesk
```

Check logs:

```bash
kubectl logs <pod-name> -n it-helpdesk
```

---

## 14. Important GitOps Principle

Do not use manual Kubernetes changes as the normal deployment method.

Avoid using:

```bash
kubectl set image ...
```

or:

```bash
helm upgrade ...
```

for normal application releases after GitOps is established.

Instead:

```text
Change Git
   |
   v
Commit
   |
   v
Push
   |
   v
Argo CD
   |
   v
Kubernetes
```

Git should remain the **source of truth**.

---

## 15. Current IT Helpdesk GitOps Architecture

```text
                    GitHub
                       |
             +---------+---------+
             |                   |
             v                   v
      GitHub Actions          Argo CD
             |                   |
             v                   |
            GHCR                 |
             |                   |
             |            Helm + GitOps Values
             |                   |
             +--------->---------+
                         |
                         v
                    Kubernetes
                         |
        +----------------+----------------+
        |                |                |
        v                v                v
   User Service    Ticket Service   Notification Service
        |                |                |
        +----------------+----------------+
                         |
                    PostgreSQL
                         |
                         v
                     Frontend
```

## 16. Current GitOps Status

The IT Helpdesk application is currently configured with:

```text
Git repository:
https://github.com/sumeetp121/it-helpdesk.git

Branch:
main

Helm chart:
helm/it-helpdesk

GitOps values:
gitops/it-helpdesk-values.yaml

Argo CD Application:
it-helpdesk

Kubernetes namespace:
it-helpdesk
```

Current verified state:

```text
Argo CD Sync:   Synced
Application:    Healthy
Kubernetes:     Running
Frontend:       Working
API:            Working
```
