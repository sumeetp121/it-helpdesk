# Helm — IT Helpdesk

## Purpose

This Helm chart packages the complete **IT Helpdesk microservices application** so that the Kubernetes resources can be installed and managed as one Helm release.

Helm allows us to manage Kubernetes manifests using configurable values instead of hardcoding the same settings in every YAML file.

---

## Chart Information

```text
Chart Name: it-helpdesk
Chart Version: 0.1.0
App Version: 1.0.0
Namespace: it-helpdesk
```

---

## Helm Chart Structure

```text
helm/
└── it-helpdesk/
    ├── Chart.yaml
    ├── values.yaml
    ├── .helmignore
    ├── charts/
    └── templates/
        ├── _helpers.tpl
        ├── postgres-pvc.yaml
        ├── postgres-deployment.yaml
        ├── postgres-service.yaml
        ├── postgres-secret.yaml
        ├── user-service-configmap.yaml
        ├── user-service-deployment.yaml
        ├── user-service-service.yaml
        ├── ticket-service-deployment.yaml
        ├── ticket-service-service.yaml
        ├── notification-service-deployment.yaml
        ├── notification-service-service.yaml
        ├── notification-service-alias.yaml
        ├── frontend-deployment.yaml
        ├── frontend-service.yaml
        └── ingress.yaml
```

---

# values.yaml

The `values.yaml` file contains configurable values used by the Helm templates.

Current configuration:

```yaml
namespace: it-helpdesk

replicaCount:
  postgres: 1
  userService: 1
  ticketService: 1
  notificationService: 1
  frontend: 1

images:
  postgres:
    repository: it-helpdesk-postgres
    tag: v1

  userService:
    repository: it-helpdesk-user-service
    tag: v2

  ticketService:
    repository: it-helpdesk-ticket-service
    tag: v6

  notificationService:
    repository: it-helpdesk-notification-service
    tag: v4

  frontend:
    repository: it-helpdesk-frontend
    tag: v1
```

---

# Why use values.yaml?

Without Helm values, we would hardcode values directly in Deployment templates.

For example:

```yaml
replicas: 1
```

and:

```yaml
image: it-helpdesk-ticket-service:v6
```

With Helm, these values are configurable:

```yaml
replicas: {{ .Values.replicaCount.ticketService }}
```

and:

```yaml
image: "{{ .Values.images.ticketService.repository }}:{{ .Values.images.ticketService.tag }}"
```

This makes the chart easier to maintain and change.

---

# Replica Configuration

Each Deployment gets its replica count from `values.yaml`.

```yaml
replicaCount:
  postgres: 1
  userService: 1
  ticketService: 1
  notificationService: 1
  frontend: 1
```

For example, the frontend Deployment uses:

```yaml
spec:
  replicas: {{ .Values.replicaCount.frontend }}
```

If we change:

```yaml
frontend: 2
```

Helm renders:

```yaml
replicas: 2
```

The Deployment template does not need to be changed.

---

# Image Configuration

Container images and tags are also controlled from `values.yaml`.

For example:

```yaml
ticketService:
  repository: it-helpdesk-ticket-service
  tag: v6
```

The Deployment template uses:

```yaml
image: "{{ .Values.images.ticketService.repository }}:{{ .Values.images.ticketService.tag }}"
```

Helm renders:

```yaml
image: "it-helpdesk-ticket-service:v6"
```

The same approach is used for:

* PostgreSQL
* User Service
* Ticket Service
* Notification Service
* Frontend

---

# Helm Validation

Check the chart:

```bash
helm lint helm/it-helpdesk
```

Expected result:

```text
1 chart(s) linted, 0 chart(s) failed
```

The following message is informational:

```text
[INFO] Chart.yaml: icon is recommended
```

It does not mean the lint failed.

---

# Render Templates Without Installing

Use:

```bash
helm template it-helpdesk helm/it-helpdesk
```

To check container images:

```bash
helm template it-helpdesk helm/it-helpdesk | grep "image:"
```

To check replica values:

```bash
helm template it-helpdesk helm/it-helpdesk | grep "replicas:"
```

Expected current result:

```text
replicas: 1
replicas: 1
replicas: 1
replicas: 1
replicas: 1
```

---

# Helm Installation

Install the chart:

```bash
helm install it-helpdesk helm/it-helpdesk -n it-helpdesk
```

The Kubernetes namespace must already exist:

```bash
kubectl get namespace it-helpdesk
```

---

# Check Helm Release

```bash
helm list -n it-helpdesk
```

Check detailed release information:

```bash
helm status it-helpdesk -n it-helpdesk
```

---

# Check Kubernetes Resources

Pods:

```bash
kubectl get pods -n it-helpdesk
```

Services:

```bash
kubectl get svc -n it-helpdesk
```

Deployments:

```bash
kubectl get deployments -n it-helpdesk
```

Ingress:

```bash
kubectl get ingress -n it-helpdesk
```

PVC:

```bash
kubectl get pvc -n it-helpdesk
```

---

# Helm Upgrade

After changing `values.yaml` or Helm templates:

```bash
helm upgrade it-helpdesk helm/it-helpdesk -n it-helpdesk
```

Then verify:

```bash
helm status it-helpdesk -n it-helpdesk
kubectl get pods -n it-helpdesk
```

---

# Helm Rollback

Check release history:

```bash
helm history it-helpdesk -n it-helpdesk
```

Rollback to a previous revision:

```bash
helm rollback it-helpdesk <REVISION> -n it-helpdesk
```

Then verify:

```bash
helm status it-helpdesk -n it-helpdesk
```

---

# Helm Uninstall

To remove the Helm release:

```bash
helm uninstall it-helpdesk -n it-helpdesk
```

Check:

```bash
helm list -n it-helpdesk
```

---

# Local Minikube Images

This project currently runs locally using Minikube.

Images are built locally and configured so Kubernetes does not try to pull them from Docker Hub.

The Deployments use:

```yaml
imagePullPolicy: Never
```

Therefore the required images must already be available inside the Minikube environment.

Check images:

```bash
minikube image ls
```

---

# Helm vs kubectl

### kubectl

With `kubectl`, we directly apply Kubernetes YAML files:

```bash
kubectl apply -f k8s/
```

### Helm

With Helm, we package the Kubernetes configuration into a chart:

```bash
helm install it-helpdesk helm/it-helpdesk -n it-helpdesk
```

Helm gives us:

* One release to manage the application
* Configurable values
* Easier upgrades
* Rollbacks
* Versioned releases
* Reusable templates

---

# Current Helm Values Improvement Milestone

The Helm chart was improved to make the following settings configurable through `values.yaml`:

### Image configuration

```text
PostgreSQL
User Service
Ticket Service
Notification Service
Frontend
```

### Replica configuration

```text
PostgreSQL
User Service
Ticket Service
Notification Service
Frontend
```

All five Deployments now use values from `values.yaml`.

Validation completed with:

```bash
helm lint helm/it-helpdesk
```

and:

```bash
helm template it-helpdesk helm/it-helpdesk | grep "image:"
```

and:

```bash
helm template it-helpdesk helm/it-helpdesk | grep "replicas:"
```

The rendered output correctly produced the configured image tags and replica counts.

---

# Local Development Note

The PostgreSQL credentials currently used by this local development project are:

```text
Database: helpdesk_db
User: helpdesk_app
Password: helpdesk123
```

These credentials are for local development only and should not be used as production credentials.
