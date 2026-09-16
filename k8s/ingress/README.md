# Kubernetes Ingress

## Overview

Kubernetes Ingress provides a single entry point for accessing the IT Helpdesk application from outside the Kubernetes cluster.

Instead of exposing every service separately, NGINX Ingress receives HTTP requests and routes them to the correct Kubernetes Service based on the URL path.

## Architecture

```text
                    Browser
                       |
                       | HTTP :80
                       v
              Minikube IP Address
                 192.168.49.2
                       |
                       v
              NGINX Ingress
            it-helpdesk-ingress
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
    /api/users    /api/tickets   /api/notifications
        |              |              |
        v              v              v
 User Service    Ticket Service   Notification Service
    :8001             :8002             :8003
        |              |                 |
        +--------------+-----------------+
                       |
                       v
                  PostgreSQL
                     :5432

        /
        |
        v
    Frontend :80
```

## Why Ingress?

Without Ingress, individual services could be exposed using NodePort or another external service type.

For example:

```text
Browser -> Frontend
Browser -> User Service
Browser -> Ticket Service
Browser -> Notification Service
```

With Ingress, the application uses a single HTTP entry point:

```text
Browser
   |
   v
Minikube IP :80
   |
   v
NGINX Ingress
```

Ingress then routes the request to the correct service.

## Ingress Controller

Minikube provides an NGINX Ingress Controller through its addon.

Check the addon:

```bash
minikube addons list | grep ingress
```

Expected:

```text
ingress                     minikube   enabled
```

Check the controller:

```bash
kubectl get pods -n ingress-nginx
```

Expected:

```text
ingress-nginx-controller-xxxxx   1/1   Running
```

## Ingress Configuration

File:

```text
k8s/ingress/ingress.yaml
```

Configuration:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: it-helpdesk-ingress
  namespace: it-helpdesk
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend
                port:
                  number: 80

          - path: /api/users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 8001

          - path: /api/tickets
            pathType: Prefix
            backend:
              service:
                name: ticket-service
                port:
                  number: 8002

          - path: /api/notifications
            pathType: Prefix
            backend:
              service:
                name: notification-service
                port:
                  number: 8003
```

## URL Routing

| URL Path             | Kubernetes Service   | Port |
| -------------------- | -------------------- | ---: |
| `/`                  | frontend             |   80 |
| `/api/users`         | user-service         | 8001 |
| `/api/tickets`       | ticket-service       | 8002 |
| `/api/notifications` | notification-service | 8003 |

For example:

```text
http://192.168.49.2/
```

routes to:

```text
frontend:80
```

And:

```text
http://192.168.49.2/api/users
```

routes to:

```text
user-service:8001
```

## Apply Ingress

From the project root:

```bash
kubectl apply -f k8s/ingress/ingress.yaml
```

Expected:

```text
ingress.networking.k8s.io/it-helpdesk-ingress created
```

## Verify Ingress

Check the Ingress:

```bash
kubectl get ingress -n it-helpdesk
```

Check detailed information:

```bash
kubectl describe ingress it-helpdesk-ingress -n it-helpdesk
```

Expected routes:

```text
/                    frontend:80
/api/users           user-service:8001
/api/tickets         ticket-service:8002
/api/notifications   notification-service:8003
```

## Get Minikube IP

```bash
minikube ip
```

Example:

```text
192.168.49.2
```

Open the application in a browser:

```text
http://192.168.49.2
```

## Application Test

The application was successfully accessed through:

```text
http://192.168.49.2
```

The IT Helpdesk dashboard loaded successfully and displayed live data from the backend services.

Example:

```text
Tickets: 1
Users: 2
Notifications: 1
```

The dashboard also displayed the existing Kubernetes test ticket and its notification.

## Request Flow

When the browser requests:

```text
http://192.168.49.2/api/tickets
```

the request flow is:

```text
Browser
   |
   v
Minikube IP :80
   |
   v
NGINX Ingress
   |
   | /api/tickets
   v
ticket-service:8002
   |
   +----> user-service:8001
   |
   +----> PostgreSQL
   |
   +----> notification-service:8003
```

For the frontend:

```text
Browser
   |
   v
Minikube IP :80
   |
   v
NGINX Ingress
   |
   | /
   v
frontend:80
```

## Why PostgreSQL Is Not in Ingress

PostgreSQL is an internal database service.

It should not be exposed through HTTP Ingress.

The application services access PostgreSQL internally:

```text
User Service
     |
     v
PostgreSQL

Ticket Service
     |
     v
PostgreSQL

Notification Service
     |
     v
PostgreSQL
```

Ingress is used for HTTP/HTTPS traffic, not PostgreSQL traffic.

## Kubernetes Service vs Ingress

A Kubernetes Service provides stable access to Pods.

```text
frontend:80
user-service:8001
ticket-service:8002
notification-service:8003
```

Ingress provides HTTP routing from outside the cluster.

```text
Browser
   |
   v
Ingress
   |
   +--> frontend
   +--> user-service
   +--> ticket-service
   +--> notification-service
```

In simple terms:

```text
Service  = stable network access to Pods

Ingress  = HTTP routing to Services
```

## Important Service Names

The Ingress uses these Kubernetes Services:

```text
frontend
user-service
ticket-service
notification-service
```

The Ticket Service also communicates internally using these service aliases:

```text
it-helpdesk-user-service
it-helpdesk-notification-service
```

These aliases are separate from Ingress and are used for internal service-to-service communication.

## Troubleshooting

### Check Ingress

```bash
kubectl get ingress -n it-helpdesk
```

### Describe Ingress

```bash
kubectl describe ingress it-helpdesk-ingress -n it-helpdesk
```

### Check NGINX Controller

```bash
kubectl get pods -n ingress-nginx
```

### Check Application Pods

```bash
kubectl get pods -n it-helpdesk
```

### Check Services

```bash
kubectl get svc -n it-helpdesk
```

### Check NGINX Controller Logs

```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Current Status

Ingress is successfully configured and tested.

Application entry point:

```text
http://192.168.49.2
```

Current routing:

```text
/                    -> frontend:80
/api/users           -> user-service:8001
/api/tickets         -> ticket-service:8002
/api/notifications   -> notification-service:8003
```

NGINX Ingress Controller:

```text
Running
```

Frontend:

```text
Running
```

User Service:

```text
Running
```

Ticket Service:

```text
Running
```

Notification Service:

```text
Running
```

PostgreSQL:

```text
Running
```

## Milestone Result

The Kubernetes application can now be accessed through a single HTTP entry point.

```text
                    Browser
                       |
                       v
              Minikube IP :80
                       |
                       v
                 NGINX Ingress
                       |
       +---------------+---------------+
       |               |               |
       v               v               v
   Frontend       User Service    Ticket Service
       |               |               |
       |               +-------+-------+
       |                       |
       |                       v
       |                  PostgreSQL
       |
       +------ API requests ------> Backend Services
```

**Ingress milestone completed successfully.**
