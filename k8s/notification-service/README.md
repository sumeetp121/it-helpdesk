# Notification Service - Kubernetes Deployment

This directory contains the Kubernetes manifests and operational documentation for deploying the **Notification Service** into the `it-helpdesk` Kubernetes namespace.

---

## 1. Service Details

| Item                 | Value                               |
| -------------------- | ----------------------------------- |
| Service Name         | notification-service                |
| Application Port     | 8003                                |
| Kubernetes Namespace | it-helpdesk                         |
| Docker Image         | it-helpdesk-notification-service:v4 |
| Replicas             | 1                                   |
| Service Type         | ClusterIP                           |
| Database             | PostgreSQL                          |
| Database Service     | it-helpdesk-postgres                |

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

Check the Kubernetes node:

```bash
kubectl get nodes
```

---

## 3. Verify Namespace

The Notification Service is deployed in:

```text
it-helpdesk
```

Check:

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

The Notification Service image:

```text
it-helpdesk-notification-service:v4
```

was built locally and loaded into Minikube.

Load the image:

```bash
minikube image load it-helpdesk-notification-service:v4
```

Verify:

```bash
minikube image ls | grep it-helpdesk-notification-service
```

Expected:

```text
docker.io/library/it-helpdesk-notification-service:v4
```

---

## 5. Application Database Configuration

Before creating the Kubernetes Deployment, the application configuration was checked.

Command:

```bash
grep -n -E 'DB_CONFIG|DB_HOST|DB_PORT|DB_NAME|DB_USER|DB_PASSWORD|it-helpdesk-postgres|localhost' notification-service/app.py
```

The application contains:

```python
DB_CONFIG = {
    "host": "it-helpdesk-postgres",
}
```

The Notification Service therefore connects to PostgreSQL using the Kubernetes Service:

```text
it-helpdesk-postgres
```

At this milestone, database configuration has not been moved to environment variables.

ConfigMap and Secret based configuration will be implemented later as a separate Kubernetes configuration milestone.

---

## 6. Notification Service Deployment

Deployment file:

```text
k8s/notification-service/notification-service-deployment.yaml
```

Apply:

```bash
kubectl apply -f k8s/notification-service/notification-service-deployment.yaml
```

Check the Deployment:

```bash
kubectl get deployment -n it-helpdesk
```

Check the Pod:

```bash
kubectl get pods -n it-helpdesk
```

Expected:

```text
notification-service-xxxxxxxxxx-xxxxx   1/1   Running
```

---

## 7. Deployment Resource Configuration

The Notification Service Deployment uses:

```yaml
resources:
  requests:
    cpu: "100m"
    memory: "64Mi"
  limits:
    cpu: "250m"
    memory: "128Mi"
```

### CPU Request

Kubernetes reserves 100 millicores as the requested CPU amount.

### Memory Request

Kubernetes requests 64 MiB of memory for the container.

### CPU Limit

The container is limited to 250 millicores.

### Memory Limit

The container is limited to 128 MiB.

These values are suitable for the current local development lab and can be tuned after observing actual resource usage.

---

## 8. Image Pull Policy

The Deployment uses:

```yaml
imagePullPolicy: Never
```

This is intentional because the project is currently running on a local Minikube environment.

The image must therefore already exist inside Minikube.

If the image is missing:

```bash
minikube image load it-helpdesk-notification-service:v4
```

---

## 9. Notification Service Kubernetes Service

Service file:

```text
k8s/notification-service/notification-service-service.yaml
```

Apply:

```bash
kubectl apply -f k8s/notification-service/notification-service-service.yaml
```

Check:

```bash
kubectl get svc notification-service -n it-helpdesk
```

Example:

```text
NAME                   TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)
notification-service   ClusterIP   10.106.55.96   <none>        8003/TCP
```

The Service configuration is:

```text
Service Port: 8003
Target Port: 8003
Type: ClusterIP
```

The Service selects Pods using:

```text
app=notification-service
```

---

## 10. Verify Service Endpoint

Check:

```bash
kubectl get endpoints notification-service -n it-helpdesk
```

Example:

```text
NAME                   ENDPOINTS
notification-service   10.244.0.99:8003
```

The endpoint confirms that the Kubernetes Service has found the Notification Service Pod.

### EndpointSlice

Modern Kubernetes versions use EndpointSlice internally.

Check:

```bash
kubectl get endpointslice -n it-helpdesk
```

The older `kubectl get endpoints` command may display a warning that the Endpoints API is deprecated. This warning does not indicate a Service failure.

---

## 11. Test Health Endpoint

A temporary curl Pod was used to test the Notification Service from inside the Kubernetes cluster.

Command:

```bash
kubectl run notification-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://notification-service:8003/health
```

Successful result:

```json
{"status":"healthy","service":"notification-service"}
```

This confirms:

* Notification Service Pod is running.
* Kubernetes Service is reachable.
* Kubernetes DNS is working.
* Port 8003 is reachable.
* The application health endpoint is responding.

The temporary test Pod is automatically deleted because `--rm` was used.

---

## 12. Test Notification API

The notification API was tested using:

```bash
kubectl run notification-service-test \
  -n it-helpdesk \
  --rm -it \
  --image=curlimages/curl:latest \
  --restart=Never \
  -- curl -s http://notification-service:8003/api/notifications
```

Result:

```json
[]
```

An empty array is a successful API response.

It confirms that:

* The Notification Service is reachable.
* The API endpoint is working.
* The application can access the PostgreSQL database.
* The `notifications` table is currently empty.

---

## 13. PostgreSQL Connectivity

The Notification Service connects to:

```text
it-helpdesk-postgres
```

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

Check Notification Service logs:

```bash
kubectl logs -n it-helpdesk -l app=notification-service
```

---

## 14. Useful Troubleshooting Commands

### Check all resources

```bash
kubectl get all -n it-helpdesk
```

### Check Notification Service Pods

```bash
kubectl get pods -n it-helpdesk -l app=notification-service
```

### Check Pod labels

```bash
kubectl get pods -n it-helpdesk --show-labels
```

### Check logs

```bash
kubectl logs -n it-helpdesk -l app=notification-service
```

### Follow logs

```bash
kubectl logs -f -n it-helpdesk -l app=notification-service
```

### Describe Pod

```bash
kubectl describe pod -n it-helpdesk -l app=notification-service
```

### Describe Deployment

```bash
kubectl describe deployment notification-service -n it-helpdesk
```

### Check Service

```bash
kubectl get svc notification-service -n it-helpdesk
```

### Check Service details

```bash
kubectl describe svc notification-service -n it-helpdesk
```

### Check endpoints

```bash
kubectl get endpoints notification-service -n it-helpdesk
```

### Check EndpointSlices

```bash
kubectl get endpointslice -n it-helpdesk
```

### Check recent Kubernetes events

```bash
kubectl get events -n it-helpdesk --sort-by=.lastTimestamp
```

---

## 15. Common Problems

### Problem: ErrImageNeverPull

Check whether the image exists in Minikube:

```bash
minikube image ls | grep it-helpdesk-notification-service
```

If it is missing:

```bash
minikube image load it-helpdesk-notification-service:v4
```

Then check:

```bash
kubectl get pods -n it-helpdesk
```

---

### Problem: Pod Not Running

Check:

```bash
kubectl get pods -n it-helpdesk
```

Then:

```bash
kubectl describe pod -n it-helpdesk -l app=notification-service
```

Check logs:

```bash
kubectl logs -n it-helpdesk -l app=notification-service
```

---

### Problem: Service Has No Endpoint

Check:

```bash
kubectl get endpoints notification-service -n it-helpdesk
```

Check Pod labels:

```bash
kubectl get pods -n it-helpdesk --show-labels
```

The Pod must have:

```text
app=notification-service
```

The Service selector must also use:

```text
app=notification-service
```

---

### Problem: Database Connection Failure

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

Check Notification Service logs:

```bash
kubectl logs -n it-helpdesk -l app=notification-service
```

---

## 16. Current Architecture

```text
                    Kubernetes Cluster
                    Namespace: it-helpdesk

                           |
                           v
              +-------------------------+
              | notification-service    |
              |       ClusterIP         |
              |          :8003           |
              +------------+------------+
                           |
                           v
              +-------------------------+
              | Notification Service    |
              |          Pod            |
              |          :8003           |
              +------------+------------+
                           |
                           | PostgreSQL connection
                           v
              +-------------------------+
              | it-helpdesk-postgres    |
              |       ClusterIP         |
              |          :5432           |
              +------------+------------+
                           |
                           v
              +-------------------------+
              |     PostgreSQL Pod      |
              |    Persistent Storage   |
              +-------------------------+
```

---

## 17. Current Kubernetes Backend

At this milestone the backend contains:

```text
it-helpdesk namespace
│
├── PostgreSQL
│   ├── Deployment
│   ├── Service
│   ├── PVC
│   └── StorageClass
│
├── User Service
│   ├── Deployment
│   └── Service
│
└── Notification Service
    ├── Deployment
    └── Service
```

---

## 18. Milestone Status

Notification Service Kubernetes deployment is complete.

Completed:

* [x] Notification Service Docker image loaded into Minikube
* [x] Deployment created
* [x] Pod running
* [x] ClusterIP Service created
* [x] Service endpoint created
* [x] Health endpoint tested
* [x] Notification API tested
* [x] PostgreSQL connectivity confirmed
* [x] Troubleshooting commands documented
* [x] README created

---

## 19. Important Design Note

The current application still contains the PostgreSQL hostname in the application code:

```text
it-helpdesk-postgres
```

This is acceptable for the current Kubernetes deployment milestone.

Later, configuration will be improved by using:

```text
ConfigMap
    +
Secret
    ↓
Deployment environment variables
    ↓
Application
```

The configuration-management milestone will also allow database credentials and other configuration values to be removed from application source code.

---

## 20. Next Milestone

The next backend component is:

```text
Ticket Service
```

Before deploying Ticket Service, its application configuration and dependencies will be checked carefully because it communicates with:

```text
PostgreSQL
User Service
Notification Service
```

Those Kubernetes Service names must match the URLs expected by the Ticket Service application.
