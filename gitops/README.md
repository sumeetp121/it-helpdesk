# GitOps – IT Helpdesk

## 1. What is GitOps?

GitOps is a deployment approach where **Git is the source of truth** for the desired state of the Kubernetes application.

In this project:

```text
Developer
   |
   | git push
   v
GitHub Repository
   |
   +-------------------------+
   |                         |
   v                         v
GitHub Actions             Argo CD
   |                         |
   | Build images             | Read desired state
   v                         v
GHCR                      Helm + GitOps Values
                             |
                             v
                         Kubernetes
```

The important principle is:

```text
Git = Desired State
Kubernetes = Actual State
Argo CD = Reconciler
```

Argo CD continuously compares the desired state stored in Git with the state running in Kubernetes.

---

## 2. GitOps Directory

```text
gitops/
├── README.md
└── it-helpdesk-values.yaml
```

The important file is:

```text
gitops/it-helpdesk-values.yaml
```

This file contains the **Docker image tags that should be deployed**.

Example:

```yaml
images:
  userService:
    tag: "ed0ea7779b70ceb707bef1da1450ad6abc2d99c6"

  ticketService:
    tag: "ed0ea7779b70ceb707bef1da1450ad6abc2d99c6"

  notificationService:
    tag: "ed0ea7779b70ceb707bef1da1450ad6abc2d99c6"

  frontend:
    tag: "ed0ea7779b70ceb707bef1da1450ad6abc2d99c6"
```

The tags are Git commit SHAs.

---

## 3. Why Do We Have a Separate GitOps Values File?

The Helm chart contains the application's deployment configuration.

```text
helm/it-helpdesk/
```

The GitOps values file contains the **version of the application that should be deployed**.

```text
gitops/it-helpdesk-values.yaml
```

Conceptually:

```text
Helm Chart
    |
    | Deployment configuration
    |
    +----------------------+
                           |
GitOps Values ------------>|
                           v
                  Rendered Kubernetes
                    configuration
```

This separation allows the Helm chart to remain reusable while GitOps controls which image version is deployed.

---

# 4. Helm Chart vs GitOps Values

The Helm chart contains the image repository and other deployment configuration.

For example, `values.yaml` contains:

```yaml
images:
  frontend:
    repository: ghcr.io/sumeetp121/it-helpdesk-frontend
    tag: ""
```

The GitOps file provides the actual tag:

```yaml
images:
  frontend:
    tag: "COMMIT_SHA"
```

Argo CD combines them.

The resulting image becomes:

```text
ghcr.io/sumeetp121/it-helpdesk-frontend:COMMIT_SHA
```

Therefore:

```text
Helm values.yaml
        +
GitOps values
        |
        v
Final image
```

---

# 5. Git Commit SHA as Docker Image Tag

GitHub Actions builds Docker images using:

```text
${{ github.sha }}
```

For example:

```text
717957c939d65b9bc8eddac3df7c149f8b26ebab
```

The resulting image is:

```text
ghcr.io/sumeetp121/it-helpdesk-frontend:717957c939d65b9bc8eddac3df7c149f8b26ebab
```

The same commit can therefore be traced through the complete pipeline:

```text
Git Commit
    |
    v
GitHub Actions
    |
    v
Docker Image
    |
    v
GitOps Values
    |
    v
Argo CD
    |
    v
Kubernetes Pod
```

This makes it possible to identify exactly which source-code version is running.

---

# 6. GitHub Actions CI/CD Pipeline

The GitHub Actions workflow is:

```text
.github/workflows/ci.yml
```

The pipeline performs these stages:

```text
Git Push
   |
   v
GitHub Actions
   |
   +--> Validate Python Services
   |
   +--> Build Ticket Service
   |
   +--> Build Frontend
   |
   +--> Build Docker Images
   |
   +--> Push Docker Images to GHCR
   |
   +--> Update GitOps Values
   |
   +--> Commit GitOps Values
   |
   +--> Push back to GitHub
```

---

# 7. Docker Images

The pipeline builds four application images:

```text
ghcr.io/sumeetp121/it-helpdesk-user-service
ghcr.io/sumeetp121/it-helpdesk-ticket-service
ghcr.io/sumeetp121/it-helpdesk-notification-service
ghcr.io/sumeetp121/it-helpdesk-frontend
```

Each image is tagged using the Git commit SHA.

For example:

```text
ghcr.io/sumeetp121/it-helpdesk-frontend:<commit-sha>
```

---

# 8. Automatic GitOps Image Tag Update

This is an important part of the current implementation.

After GitHub Actions successfully builds and pushes the Docker images, it updates:

```text
gitops/it-helpdesk-values.yaml
```

The workflow uses:

```bash
sed -i \
  "s/tag: \".*\"/tag: \"${{ github.sha }}\"/g" \
  gitops/it-helpdesk-values.yaml
```

This changes the image tag to the SHA of the current commit.

For example, before:

```yaml
images:
  frontend:
    tag: "ed0ea7779b70ceb707bef1da1450ad6abc2d99c6"
```

After a new commit:

```yaml
images:
  frontend:
    tag: "NEW_COMMIT_SHA"
```

The workflow then commits the change:

```bash
git add gitops/it-helpdesk-values.yaml

git commit -m "Update GitOps image tags to ${{ github.sha }}"

git push
```

Therefore, the GitOps values file is now **automatically maintained by GitHub Actions**.

---

# 9. Important: Why the GitOps File Changes Automatically

The developer does **not** normally need to manually update:

```text
gitops/it-helpdesk-values.yaml
```

The normal flow is:

```text
Developer changes application
          |
          v
git add
git commit
git push
          |
          v
GitHub Actions
          |
          +--> Build application
          |
          +--> Build Docker images
          |
          +--> Push images to GHCR
          |
          +--> Update GitOps values
          |
          +--> Commit GitOps change
          |
          +--> Push GitOps change to GitHub
          |
          v
       Argo CD
          |
          v
     Kubernetes
```

---

# 10. Important Git Workflow Detail

Because GitHub Actions pushes the updated GitOps values file back to GitHub, the remote `main` branch can move ahead of the local repository.

For example:

```text
Local:
A ---- B

GitHub:
A ---- B ---- C
```

Where:

```text
C = GitHub Actions updated gitops/it-helpdesk-values.yaml
```

If you then try:

```bash
git push origin main
```

from the old local branch, Git may reject the push:

```text
! [rejected] main -> main (fetch first)
```

This happens because the remote contains a commit that your local repository does not have.

Before making another local change, synchronize your local branch:

```bash
git pull --rebase origin main
```

Then make your changes:

```bash
git add .
git commit -m "Your change"
git push origin main
```

The important point is:

```text
GitHub Actions can also create commits.
```

Therefore your local repository must occasionally synchronize with the remote repository.

---

# 11. Application Change Example

Suppose the developer changes:

```html
<title>IT Helpdesk</title>
```

to:

```html
<title>IT Devops Helpdesk</title>
```

The developer commits and pushes:

```bash
git add frontend/index.html

git commit -m "Update frontend title"

git push origin main
```

GitHub Actions starts automatically.

```text
frontend/index.html changed
        |
        v
Git Push
        |
        v
GitHub Actions
        |
        v
Frontend Docker image built
        |
        v
Image pushed to GHCR
        |
        v
GitOps values updated
        |
        v
GitOps commit pushed
        |
        v
Argo CD detects Git change
        |
        v
Helm renders new image
        |
        v
Kubernetes creates new Pod
        |
        v
New frontend version running
```

No manual:

```bash
helm upgrade
```

is required.

---

# 12. Why the Browser Update May Take Some Time

After GitHub Actions completes, there are still several steps:

```text
GitHub Actions
      |
      v
GitOps commit
      |
      v
Argo CD detects change
      |
      v
Helm rendering
      |
      v
Kubernetes Deployment update
      |
      v
New Pod
      |
      v
Frontend available
```

Therefore, the GitHub Actions page can show completed while the browser is still temporarily serving the previous version.

The status can be checked with:

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

# 13. Argo CD Application

The Argo CD Application is:

```text
argocd/it-helpdesk-application.yaml
```

It connects GitHub, Helm, GitOps values, and Kubernetes.

The important configuration is:

```yaml
sources:
  - repoURL: https://github.com/sumeetp121/it-helpdesk.git
    targetRevision: main
    path: helm/it-helpdesk
    helm:
      valueFiles:
        - $values/gitops/it-helpdesk-values.yaml

  - repoURL: https://github.com/sumeetp121/it-helpdesk.git
    targetRevision: main
    ref: values
```

This tells Argo CD:

```text
Source 1
    |
    +--> Helm chart
    |
    +--> helm/it-helpdesk

Source 2
    |
    +--> GitOps values
    |
    +--> gitops/it-helpdesk-values.yaml
```

The `$values` reference connects the Helm chart to the second Git source.

---

# 14. Argo CD Destination

The Application specifies:

```yaml
destination:
  server: https://kubernetes.default.svc
  namespace: it-helpdesk
```

This means Argo CD deploys the application into:

```text
Namespace:
it-helpdesk
```

inside the Kubernetes cluster where Argo CD is running.

---

# 15. Automated Sync

The Argo CD Application contains:

```yaml
syncPolicy:
  automated:
    prune: true
    selfHeal: true
```

### Automated Sync

Argo CD automatically applies changes detected in Git.

### Self Heal

If a Kubernetes resource is manually changed, Argo CD can restore the state defined in Git.

### Prune

If a resource is removed from the desired configuration in Git, Argo CD can remove the corresponding Kubernetes resource.

---

# 16. Complete CI/CD + GitOps Flow

The current project now follows this flow:

```text
                         DEVELOPER
                             |
                             | git push
                             v
                    +----------------+
                    |     GitHub     |
                    +----------------+
                             |
                             v
                    +----------------+
                    | GitHub Actions |
                    +----------------+
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
        Validate        Build Docker      Frontend
         Services          Images           Build
                             |
                             v
                    +----------------+
                    |      GHCR      |
                    | Docker Images   |
                    +----------------+
                             |
                             v
                 Update GitOps Values
                             |
                             v
                    Git commit + push
                             |
                             v
                    +----------------+
                    |     GitHub     |
                    | Desired State  |
                    +----------------+
                             |
                             v
                       +----------+
                       | Argo CD  |
                       +----------+
                             |
                             v
                         Helm Chart
                             +
                      GitOps Values
                             |
                             v
                    Rendered Manifests
                             |
                             v
                      +-------------+
                      | Kubernetes  |
                      +-------------+
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
       User Service    Ticket Service   Notification
             |               |               |
             +---------------+---------------+
                             |
                             v
                        PostgreSQL
                             |
                             v
                         Frontend
```

---

# 17. Desired State vs Actual State

GitOps becomes easier to understand by separating two concepts.

### Desired State

Stored in Git:

```text
GitHub
   |
   +-- Helm chart
   |
   +-- GitOps values
```

Example:

```yaml
images:
  frontend:
    tag: "abc123"
```

This means:

```text
I want Kubernetes to run frontend image abc123.
```

### Actual State

Running inside Kubernetes:

```text
Kubernetes
   |
   +-- frontend Pod
   +-- user-service Pod
   +-- ticket-service Pod
   +-- notification-service Pod
   +-- postgres Pod
```

Argo CD continuously compares:

```text
Desired State
      |
      | compare
      v
   Argo CD
      |
      | compare
      v
Actual State
```

---

# 18. Argo CD Sync States

Check:

```bash
kubectl get application it-helpdesk -n argocd
```

Possible states include:

### Synced

```text
Synced
```

Git desired state and Kubernetes state match.

### OutOfSync

```text
OutOfSync
```

The Kubernetes state does not currently match Git.

### Unknown

```text
Unknown
```

Argo CD could not determine the desired state, commonly because of a repository, path, values-file, or Helm rendering problem.

---

# 19. Argo CD Health States

The health status indicates the state of the deployed Kubernetes resources.

For example:

```text
Healthy
```

means the application resources are healthy.

During a deployment you may temporarily see:

```text
Progressing
```

because Kubernetes is creating or replacing Pods.

---

# 20. Checking GitOps Status

Run:

```bash
kubectl get application it-helpdesk -n argocd
```

Or:

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

# 21. Check Kubernetes Pods

```bash
kubectl get pods -n it-helpdesk
```

Expected example:

```text
frontend                     1/1   Running
notification-service         1/1   Running
postgres                     1/1   Running
ticket-service               1/1   Running
user-service                 1/1   Running
```

---

# 22. Check Deployed Docker Images

```bash
kubectl get deployments -n it-helpdesk \
  -o custom-columns='NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image'
```

This allows you to verify which Git commit SHA is actually running.

Example:

```text
frontend   ghcr.io/sumeetp121/it-helpdesk-frontend:<SHA>
```

Compare this SHA with:

```bash
cat gitops/it-helpdesk-values.yaml
```

---

# 23. Checking the GitOps File

```bash
cat gitops/it-helpdesk-values.yaml
```

Example:

```yaml
images:
  userService:
    tag: "NEW_SHA"

  ticketService:
    tag: "NEW_SHA"

  notificationService:
    tag: "NEW_SHA"

  frontend:
    tag: "NEW_SHA"
```

This file should reflect the image version that GitHub Actions most recently published.

---

# 24. GitOps Troubleshooting

## Application is `Unknown`

Run:

```bash
kubectl describe application it-helpdesk -n argocd
```

Look under:

```text
Conditions
```

Common causes:

```text
Incorrect repository path
Incorrect values file path
Git repository unavailable
Helm template error
Missing GitOps values file
```

---

## Application is `OutOfSync`

Run:

```bash
kubectl get application it-helpdesk -n argocd
```

Then:

```bash
kubectl describe application it-helpdesk -n argocd
```

`OutOfSync` means the desired Git state and actual Kubernetes state do not currently match.

---

## Application is `Progressing`

Check:

```bash
kubectl get pods -n it-helpdesk
```

Then:

```bash
kubectl describe pod <pod-name> -n it-helpdesk
```

And:

```bash
kubectl logs <pod-name> -n it-helpdesk
```

---

# 25. Important GitOps Rule

Once GitOps is established, normal application deployments should be performed through Git.

Avoid using:

```bash
kubectl set image ...
```

or:

```bash
helm upgrade ...
```

as the normal application release process.

Instead:

```text
Change application
       |
       v
Commit
       |
       v
Push
       |
       v
GitHub Actions
       |
       v
Build + Push image
       |
       v
Update GitOps values
       |
       v
Argo CD
       |
       v
Kubernetes
```

Git remains the source of truth.

---

# 26. Important Distinction: CI/CD vs GitOps

These are related but different concepts.

### CI

Continuous Integration:

```text
Code
 |
 v
Test / Validate
 |
 v
Build
```

### CD

Continuous Delivery/Deployment:

```text
Build artifact
 |
 v
Deploy
```

### GitOps

GitOps controls deployment through Git:

```text
Git desired state
       |
       v
Argo CD
       |
       v
Kubernetes
```

In this project:

```text
GitHub Actions
      |
      +--> CI
      |
      +--> Build Docker images
      |
      +--> Push images to GHCR
      |
      +--> Update GitOps desired state
                         |
                         v
                       Argo CD
                         |
                         v
                     Kubernetes
```

---

# 27. Current IT Helpdesk GitOps Architecture

```text
                     GitHub Repository
                            |
             +--------------+--------------+
             |                             |
             v                             v
      .github/workflows/ci.yml       gitops/
             |                       it-helpdesk-values.yaml
             |                             |
             v                             |
       GitHub Actions                      |
             |                             |
             v                             |
            GHCR                           |
             |                             |
             +--------------+--------------+
                            |
                            v
                         Argo CD
                            |
                            v
                     Helm Chart
                  helm/it-helpdesk
                            |
                            v
                       Kubernetes
                            |
          +-----------------+-----------------+
          |                 |                 |
          v                 v                 v
     user-service    ticket-service    notification-service
          |                 |                 |
          +-----------------+-----------------+
                            |
                            v
                       PostgreSQL
                            |
                            v
                        Frontend
```

---

# 28. Current Project Configuration

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

Argo CD Application manifest:
argocd/it-helpdesk-application.yaml

Kubernetes namespace:
it-helpdesk

Container Registry:
GHCR
```

---

# 29. Current Deployment Model

The current deployment model is:

```text
1. Developer changes application
        |
2. Developer commits and pushes
        |
3. GitHub Actions starts
        |
4. Code is validated
        |
5. Docker images are built
        |
6. Docker images are pushed to GHCR
        |
7. GitOps values are automatically updated
        |
8. GitHub Actions commits the updated values
        |
9. GitHub Actions pushes the GitOps commit
        |
10. Argo CD detects the Git change
        |
11. Argo CD renders the Helm chart
        |
12. Kubernetes Deployment is updated
        |
13. New Pods are created
        |
14. Old Pods are replaced
        |
15. Argo CD reports Synced + Healthy
```

---

# 30. Verified Current State

The current IT Helpdesk GitOps setup has been verified with:

```text
Argo CD:
Installed and running

Application:
it-helpdesk

Sync:
Synced

Health:
Healthy

Kubernetes:
Running

Frontend:
Working

API:
Working

GitOps:
Automatic image-tag updates enabled
```

The key GitOps loop is now:

```text
Application Code
      |
      v
Git Push
      |
      v
GitHub Actions
      |
      v
Docker Image
      |
      v
GHCR
      |
      v
gitops/it-helpdesk-values.yaml
      |
      v
Argo CD
      |
      v
Helm
      |
      v
Kubernetes
```

**Git is the source of truth for the desired deployment state.**
