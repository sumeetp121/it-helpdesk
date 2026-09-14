# User Service - Kubernetes Deployment

This directory contains the Kubernetes manifests and operational steps for deploying the **User Service** into the `it-helpdesk` namespace.

---

## 1. Service Details

| Item                 | Value                       |
| -------------------- | --------------------------- |
| Service Name         | user-service                |
| Application Port     | 8001                        |
| Kubernetes Namespace | it-helpdesk                 |
| Docker Image         | it-helpdesk-user-service:v2 |
| Replicas             | 1                           |
| Service Type         | ClusterIP                   |
| Database             | PostgreSQL                  |
| Database Service     | it-helpdesk-postgres        |

---

## 2. Prerequisites

Minikube must be running.

Check:

```bash
minikube status
```

Expected:

```text
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

Check Kubernetes nodes:

```bash
kubectl get nodes
```

---

## 3. Verify Namespace

The User Service is deployed in the `it-helpdesk` namespace.

```bash
kubectl get namespace it-helpdesk
```

Expected:

```text
NAME          STATUS
it-helpdesk   Active
```

---

## 4. Verify Docker Image

The User Service image was built locally:

```text
it-helpdesk-user-service:v2
```

Because Minikube is being used locally, the image must be available inside the Minikube node.

Load the image:

```bash
minikube image load it-helpdesk-user-service:v2
```

Verify:

```bash
minikube image ls | grep it-helpdesk-user-service
```

Expected:

```text
docker.io/library/it-helpdesk-user-service:v2
```

---

## 5. Application Database Configuration

Before creating the Kubernetes Deployment, the application configuration was checked.

Command:

```bash
grep -n -E 'DB_CONFIG|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|it-helpdesk-postgres|localhost' user-service/app.py
```

The application currently contains:

```python
DB_CONFIG = {
    "host": "it-helpdesk-postgres",
}
```

Therefore, the application already uses the Kubernetes PostgreSQL Service name:

```text
it-helpdesk-postgres
```

No new database environment variables were added at this stage because the current application code does not read them.

ConfigMap and Secret based application configuration will be handled in a later configuration-management milestone.

---

## 6. User Service Deployment

Deployment file:

```text
k8s/user-service/user-service-deployment.yaml
```

Apply:

```bash
kubectl apply -f k8s/user-service/user-service-deployment.yaml
```

Check Deployment:

```bash
kubectl get deployment -n it-helpdesk
```

Check Pods:

```bash
kubectl get pods -n it-helpdesk -o wide
```

Expected:

```text
user-service-xxxxxxxxxx-xxxxx   1/1   Running
```

Check Deployment details:

```bash
kubectl describe deployment user-service -n it-helpdesk
```

---

## 7. Resource Configuration

The Deployment currently uses:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "64Mi"
  limits:
    cpu: "250m"
    memory: "128Mi"
```

### Requests

Requests tell Kubernetes the minimum resources required by the container.

### Limits

Limits prevent the container from using more than the configured amount.

---

## 8. Image Pull Policy

The Deployment uses:

```yaml
imagePullPolicy: Never
```

This is intentional for the local Minikube lab.

It means Kubernetes must use an image already available inside Minikube.

Therefore:

```bash
minikube image load it-helpdesk-user-service:v2
```

must be performed before deployment if the image is not already present.

---

## 9. User Service Kubernetes Service

Service file:

```text
k8s/user-service/user-service-service.yaml
```

Apply:

```bash
kubectl apply -f k8s/user-service/user-service-service.yaml
```

Check:

```bash
kubectl get service -n it-helpdesk
```

Check endpoints:

```bash
kubectl get endpoints -n it-helpdesk
```

The User Service Service uses:

```text
port: 8001
targetPort: 8001
type: ClusterIP
```

The selector is:

```text
app=user-service
```

The Service therefore sends traffic to Pods having:

```text
app=user-service
```

---

## 10. Verify User Service Pod

Get the Pod name:

```bash
kubectl get pods -n it-helpdesk -l app=user-service
```

Check Pod details:

```bash
kubectl describe pod -n it-helpdesk -l app=user-service
```

Check logs:

```bash
kubectl logs -n it-helpdesk -l app=user-service
```

---

## 11. Test Health Endpoint

A temporary curl Pod is used to test the User Service from inside the Kubernetes cluster.

Command:

```bash
kubectl run user-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://user-service:8001/health
```

Expected:

```json
{"status":"healthy","service":"user-service"}
```

This confirms:

* User Service Pod is running.
* Kubernetes Service is reachable.
* Kubernetes DNS is working.
* Port 8001 is reachable.

---

## 12. Test User API

Command:

```bash
kubectl run user-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://user-service:8001/api/users
```

Expected data:

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

This confirms that the User Service can communicate with PostgreSQL through the Kubernetes PostgreSQL Service.

---

## 13. Verify PostgreSQL Connectivity

Check PostgreSQL:

```bash
kubectl get pods -n it-helpdesk -l app=postgres
```

Check PostgreSQL Service:

```bash
kubectl get service it-helpdesk-postgres -n it-helpdesk
```

The User Service uses:

```text
it-helpdesk-postgres
```

as the PostgreSQL hostname.

---

## 14. Useful Troubleshooting Commands

### Check all resources

```bash
kubectl get all -n it-helpdesk
```

### Check User Service Pods

```bash
kubectl get pods -n it-helpdesk -l app=user-service
```

### Check Pod logs

```bash
kubectl logs -n it-helpdesk -l app=user-service
```

### Follow logs

```bash
kubectl logs -f -n it-helpdesk -l app=user-service
```

### Describe Pod

```bash
kubectl describe pod -n it-helpdesk -l app=user-service
```

### Describe Deployment

```bash
kubectl describe deployment user-service -n it-helpdesk
```

### Check Service

```bash
kubectl get svc user-service -n it-helpdesk
```

### Check Endpoints

```bash
kubectl get endpoints user-service -n it-helpdesk
```

### Check recent events

```bash
kubectl get events -n it-helpdesk --sort-by=.lastTimestamp
```

---

## 15. Common Problems

### ImagePull / ErrImageNeverPull

Check:

```bash
minikube image ls | grep it-helpdesk-user-service
```

If the image is missing:

```bash
minikube image load it-helpdesk-user-service:v2
```

---

### Pod Not Running

Check:

```bash
kubectl get pods -n it-helpdesk
```

Then:

```bash
kubectl describe pod -n it-helpdesk -l app=user-service
```

And:

```bash
kubectl logs -n it-helpdesk -l app=user-service
```

---

### Service Has No Endpoint

Check:

```bash
kubectl get endpoints user-service -n it-helpdesk
```

If no endpoint exists, compare the Service selector with the Pod labels:

```bash
kubectl get pods -n it-helpdesk --show-labels
```

The Service expects:

```text
app=user-service
```

---

### Database Connection Problem

Check PostgreSQL:

```bash
kubectl get pods -n it-helpdesk -l app=postgres
```

Check PostgreSQL Service:

```bash
kubectl get svc it-helpdesk-postgres -n it-helpdesk
```

Check PostgreSQL endpoints:

```bash
kubectl get endpoints it-helpdesk-postgres -n it-helpdesk
```

Check User Service logs:

```bash
kubectl logs -n it-helpdesk -l app=user-service
```

---

## 16. Current Kubernetes Architecture

```text
                    Kubernetes Cluster
                    Namespace: it-helpdesk

                         |
                         |
                +-------------------+
                |   user-service    |
                |    ClusterIP      |
                |      :8001        |
                +---------+---------+
                          |
                          v
                +-------------------+
                |  User Service Pod |
                |   :8001           |
                +---------+---------+
                          |
                          | PostgreSQL connection
                          v
                +-------------------+
                | it-helpdesk-      |
                | postgres Service  |
                |      :5432        |
                +---------+---------+
                          |
                          v
                +-------------------+
                | PostgreSQL Pod    |
                | Persistent Storage|
                +-------------------+
```

---

## 17. Milestone Status

User Service Kubernetes deployment is complete for this milestone.

Completed:

* [x] User Service Docker image available
* [x] Image loaded into Minikube
* [x] Kubernetes Deployment created
* [x] Kubernetes Service created
* [x] Pod running
* [x] Service endpoint created
* [x] Health endpoint tested
* [x] `/api/users` tested
* [x] PostgreSQL connectivity verified
* [x] Operational troubleshooting commands documented

---

## 18. Important Design Note

At this stage, the User Service is intentionally kept simple.

The application currently contains its PostgreSQL connection configuration in `app.py`.

Later, during the **ConfigMap and Secret milestone**, configuration will be moved out of the application code and Kubernetes will provide configuration and sensitive values separately.

The current milestone focuses on:

```text
Application
    ↓
Docker Image
    ↓
Kubernetes Deployment
    ↓
Kubernetes Service
    ↓
PostgreSQL Service
    ↓
PostgreSQL
```
