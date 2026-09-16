# Frontend - Kubernetes Deployment

This directory contains the Kubernetes manifests and documentation for deploying the existing React/Vite IT Helpdesk frontend.

## 1. Frontend Details

| Item | Value |
|---|---|
| Application | IT Helpdesk Frontend |
| Technology | React + Vite |
| Node.js | 22 |
| Docker Image | it-helpdesk-frontend:v1 |
| Container | Nginx |
| Container Port | 80 |
| Kubernetes Namespace | it-helpdesk |
| Replicas | 1 |
| Service Type | ClusterIP |

## 2. Existing Frontend Application

The actual React application is located at:

    frontend/

Important files:

    frontend/
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── src/
    │   ├── api.js
    │   ├── main.jsx
    │   └── styles.css
    └── vite.config.js

The application already provides:

- Dashboard
- Tickets
- Users
- Notifications
- Reports
- Settings
- Ticket creation
- Ticket update
- Ticket deletion
- User creation
- User update
- User deletion
- Notification handling
- Search
- Refresh

## 3. Frontend API Paths

The frontend uses relative API paths:

    /api/users
    /api/tickets
    /api/notifications

The frontend does not directly use Kubernetes ClusterIP addresses.

A later Ingress configuration will route these API paths to the appropriate backend services.

## 4. Verify Local Frontend Build

Go to the frontend directory:

    cd /home/sumeet/it-helpdesk/frontend

Build the application:

    npm run build

Successful build:

    ✓ 1577 modules transformed.
    ✓ built in 1.68s

The production files are generated in:

    frontend/dist/

## 5. Dockerfile

Dockerfile location:

    docker/frontend/Dockerfile

The frontend uses a multi-stage Docker build.

### Stage 1 - Build

The Node.js image is used to:

1. Install dependencies.
2. Copy the React application.
3. Run the production build.

### Stage 2 - Runtime

The Nginx Alpine image is used to serve the generated React files.

The final container does not need Node.js to serve the application.

The production flow is:

    React Source
        |
        v
    npm run build
        |
        v
    dist/
        |
        v
    Nginx
        |
        v
    Port 80

## 6. Build Docker Image

From the project root:

    cd /home/sumeet/it-helpdesk

Build:

    docker build -t it-helpdesk-frontend:v1 -f docker/frontend/Dockerfile .

Verify:

    docker images | grep -i frontend

Image created:

    it-helpdesk-frontend:v1

Approximate local image size:

    102 MB

## 7. Load Image into Minikube

Because the Kubernetes Deployment uses:

    imagePullPolicy: Never

the image must be available inside Minikube.

Load the image:

    minikube image load it-helpdesk-frontend:v1

Verify:

    minikube image ls | grep it-helpdesk-frontend

Expected:

    docker.io/library/it-helpdesk-frontend:v1

## 8. Kubernetes Deployment

Deployment file:

    k8s/frontend/frontend-deployment.yaml

Apply:

    kubectl apply -f k8s/frontend/frontend-deployment.yaml

Check:

    kubectl get pods -n it-helpdesk -l app=frontend

Successful result:

    frontend-d5d9cf67b-s2d2v   1/1   Running   0

The frontend container listens on port 80.

## 9. Kubernetes Service

Service file:

    k8s/frontend/frontend-service.yaml

Apply:

    kubectl apply -f k8s/frontend/frontend-service.yaml

Check:

    kubectl get svc frontend -n it-helpdesk

Current configuration:

    Type: ClusterIP
    Port: 80
    TargetPort: 80

Check the Service details:

    kubectl describe svc frontend -n it-helpdesk

The Service successfully selected the Frontend Pod.

Example endpoint:

    10.244.0.114:80

## 10. Test Frontend Service

A temporary curl Pod can be used to test the frontend from inside Kubernetes.

Run:

    kubectl run frontend-test \
      -n it-helpdesk \
      --rm -it \
      --image=curlimages/curl:latest \
      --restart=Never \
      -- curl -s http://frontend:80

The response should contain the React production HTML.

Example:

    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>IT Helpdesk</title>

This confirms that:

- Frontend Pod is running.
- Frontend Service is working.
- Kubernetes DNS can resolve the Service.
- Nginx is serving the React application.
- React production files are available.

## 11. Current Frontend Architecture

    React Application
          |
          v
    Docker Build
          |
          v
    it-helpdesk-frontend:v1
          |
          v
       Minikube
          |
          v
    Kubernetes Deployment
          |
          v
    Frontend Pod
          |
          v
    Frontend Service :80

## 12. Current Backend Architecture

The frontend will eventually communicate with:

    Frontend
       |
       +---- /api/users
       |          |
       |          v
       |     User Service :8001
       |
       +---- /api/tickets
       |          |
       |          v
       |     Ticket Service :8002
       |
       +---- /api/notifications
                  |
                  v
          Notification Service :8003

The backend services communicate with PostgreSQL.

## 13. Why Frontend Service Uses ClusterIP

The current Frontend Service is:

    type: ClusterIP

ClusterIP makes the frontend reachable inside the Kubernetes cluster.

It is intentionally not exposed directly to the external browser yet.

External browser access will be handled in a separate Kubernetes Ingress milestone.

## 14. Troubleshooting

### Check Frontend Pod

    kubectl get pods -n it-helpdesk -l app=frontend

### Check Frontend Logs

    kubectl logs -n it-helpdesk -l app=frontend

### Describe Frontend Pod

    kubectl describe pod -n it-helpdesk -l app=frontend

### Check Frontend Service

    kubectl get svc frontend -n it-helpdesk

### Describe Frontend Service

    kubectl describe svc frontend -n it-helpdesk

### Check Service Endpoints

    kubectl get endpoints frontend -n it-helpdesk

### Check EndpointSlices

    kubectl get endpointslice -n it-helpdesk

### Check Minikube Image

    minikube image ls | grep it-helpdesk-frontend

## 15. Important Note About Browser Access

The Frontend Pod and Service are working inside Kubernetes.

The browser cannot directly access the ClusterIP Service from outside the cluster.

Current:

    Browser
       |
       X
    ClusterIP

The planned external access will be:

    Browser
       |
       v
    Kubernetes Ingress
       |
       +---- Frontend
       |
       +---- /api/users
       |
       +---- /api/tickets
       |
       +---- /api/notifications

Ingress will be configured as a separate milestone.

## 16. Milestone Status

Completed:

- [x] Existing React frontend identified
- [x] Existing frontend reused
- [x] Production build tested
- [x] Frontend Dockerfile created
- [x] Multi-stage Docker build created
- [x] Docker image built
- [x] Image loaded into Minikube
- [x] Kubernetes Deployment created
- [x] Frontend Pod running
- [x] Kubernetes Service created
- [x] Service endpoint verified
- [x] Nginx serving React production files
- [x] Frontend tested from inside Kubernetes

Next separate milestone:

- [ ] Kubernetes Ingress