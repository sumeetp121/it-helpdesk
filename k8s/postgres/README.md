# PostgreSQL on Kubernetes

This directory contains the Kubernetes configuration for running PostgreSQL for the IT Helpdesk application on a local Minikube Kubernetes cluster.

The PostgreSQL setup uses:

* Kubernetes Secret for database credentials
* Custom StorageClass
* Dynamic PersistentVolume provisioning
* PersistentVolumeClaim
* PostgreSQL Deployment
* Kubernetes ClusterIP Service
* Database backup restore using `pg_restore`

---

## Directory Structure

```text
k8s/
├── postgres/
│   ├── postgres-storageclass.yaml
│   ├── postgres-pvc.yaml
│   ├── postgres-deployment.yaml
│   ├── postgres-service.yaml
│   └── README.md
│
└── secrets/
    └── postgres-secret.yaml
```

---

# 1. Kubernetes Namespace

All IT Helpdesk PostgreSQL resources are deployed in:

```text
it-helpdesk
```

Create the namespace:

```bash
kubectl apply -f k8s/namespace/namespace.yaml
```

Verify:

```bash
kubectl get ns
```

---

# 2. PostgreSQL Secret

The database credentials are stored in:

```text
k8s/secrets/postgres-secret.yaml
```

The Secret contains:

```text
POSTGRES_USER
POSTGRES_PASSWORD
POSTGRES_DB
```

Current database configuration:

```text
Database: helpdesk_db
User:     helpdesk_app
```

Apply the Secret:

```bash
kubectl apply -f k8s/secrets/postgres-secret.yaml
```

Verify:

```bash
kubectl get secrets -n it-helpdesk
```

Describe the Secret:

```bash
kubectl describe secret postgres-secret -n it-helpdesk
```

---

# 3. Custom StorageClass

The project uses its own StorageClass:

```text
it-helpdesk-storage
```

File:

```text
k8s/postgres/postgres-storageclass.yaml
```

Apply:

```bash
kubectl apply -f k8s/postgres/postgres-storageclass.yaml
```

Verify:

```bash
kubectl get storageclass
```

Describe:

```bash
kubectl describe storageclass it-helpdesk-storage
```

The StorageClass uses the Minikube hostpath provisioner:

```text
k8s.io/minikube-hostpath
```

The configuration uses:

```text
Reclaim Policy:    Delete
Volume Binding:    Immediate
```

---

# 4. PersistentVolumeClaim

The PostgreSQL PVC is:

```text
postgres-pvc
```

File:

```text
k8s/postgres/postgres-pvc.yaml
```

The PVC explicitly uses:

```yaml
storageClassName: it-helpdesk-storage
```

Requested storage:

```text
5Gi
```

Access mode:

```text
ReadWriteOnce
```

Apply:

```bash
kubectl apply -f k8s/postgres/postgres-pvc.yaml
```

Verify:

```bash
kubectl get pvc -n it-helpdesk
```

Detailed information:

```bash
kubectl describe pvc postgres-pvc -n it-helpdesk
```

Expected state:

```text
STATUS:        Bound
CAPACITY:      5Gi
ACCESS MODES:  RWO
STORAGECLASS:  it-helpdesk-storage
```

---

# 5. Verify Dynamic PV Provisioning

The PVC dynamically creates a PersistentVolume.

Check:

```bash
kubectl get pv
```

For more information:

```bash
kubectl describe pv <PV-NAME>
```

Example:

```text
postgres-pvc
     │
     ▼
it-helpdesk-storage
     │
     ▼
Dynamic PersistentVolume
```

The expected relationship is:

```text
StorageClass
     │
     ▼
PersistentVolume
     │
     ▼
PersistentVolumeClaim
     │
     ▼
PostgreSQL Pod
```

---

# 6. PostgreSQL Docker Image

The PostgreSQL Deployment uses the locally built image:

```text
it-helpdesk-postgres:v1
```

Because the project uses local Minikube, the image must be available inside Minikube.

Check the local Docker image:

```bash
docker images | grep it-helpdesk-postgres
```

Load the image into Minikube:

```bash
minikube image load it-helpdesk-postgres:v1
```

Verify:

```bash
minikube image ls | grep it-helpdesk-postgres
```

The image should appear similar to:

```text
docker.io/library/it-helpdesk-postgres:v1
```

The Deployment uses:

```yaml
imagePullPolicy: Never
```

This tells Kubernetes to use the image already available inside Minikube rather than attempting to pull it from a remote registry.

---

# 7. PostgreSQL Deployment

File:

```text
k8s/postgres/postgres-deployment.yaml
```

The Deployment runs:

```text
Replicas: 1
Container Port: 5432
```

Resource configuration:

```text
Requests:
  CPU:    250m
  Memory: 64Mi

Limits:
  CPU:    500m
  Memory: 128Mi
```

The PostgreSQL data directory is mounted at:

```text
/var/lib/postgresql/data
```

The Deployment obtains database credentials from:

```text
postgres-secret
```

The persistent storage comes from:

```text
postgres-pvc
```

Apply the Deployment:

```bash
kubectl apply -f k8s/postgres/postgres-deployment.yaml
```

---

# 8. Verify PostgreSQL Pod

Check Pods:

```bash
kubectl get pods -n it-helpdesk
```

Check Pod details:

```bash
kubectl get pods -n it-helpdesk -o wide
```

Describe the Pod:

```bash
kubectl describe pod <POSTGRES-POD-NAME> -n it-helpdesk
```

Example:

```bash
kubectl describe pod postgres-57dd9ff854-st7ct -n it-helpdesk
```

Check Deployment:

```bash
kubectl get deployment postgres -n it-helpdesk
```

Detailed Deployment information:

```bash
kubectl describe deployment postgres -n it-helpdesk
```

Expected state:

```text
1 desired
1 updated
1 available
0 unavailable
```

---

# 9. PostgreSQL Service

The PostgreSQL Service is:

```text
it-helpdesk-postgres
```

File:

```text
k8s/postgres/postgres-service.yaml
```

Service type:

```text
ClusterIP
```

Port:

```text
5432
```

The Service selects PostgreSQL Pods using:

```yaml
selector:
  app: postgres
```

Apply:

```bash
kubectl apply -f k8s/postgres/postgres-service.yaml
```

Check:

```bash
kubectl get svc -n it-helpdesk
```

Detailed information:

```bash
kubectl describe svc it-helpdesk-postgres -n it-helpdesk
```

Expected:

```text
Selector:   app=postgres
Port:       5432/TCP
TargetPort: 5432/TCP
Endpoints:  <POSTGRES-POD-IP>:5432
```

The application services should connect using:

```text
it-helpdesk-postgres:5432
```

They should not connect directly to the PostgreSQL Pod IP.

---

# 10. Verify Service Endpoints

Get the Service:

```bash
kubectl get svc -n it-helpdesk -o wide
```

Describe it:

```bash
kubectl describe svc it-helpdesk-postgres -n it-helpdesk
```

The Service must have an endpoint.

Example:

```text
Endpoints: 10.244.0.94:5432
```

If the endpoint is empty:

```text
Endpoints:
```

check the Pod labels:

```bash
kubectl get pods -n it-helpdesk --show-labels
```

The Pod should have:

```text
app=postgres
```

The Service selector must match the Pod label:

```text
Service selector:
app=postgres

Pod label:
app=postgres
```

---

# 11. Test PostgreSQL Connectivity Using a Test Pod

A temporary PostgreSQL client Pod can be used to test Kubernetes DNS, Service networking, authentication, and database connectivity.

Run:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db
```

This opens a PostgreSQL client inside the Kubernetes cluster.

The important part is:

```text
-h it-helpdesk-postgres
```

This verifies that Kubernetes DNS resolves the PostgreSQL Service.

Exit the PostgreSQL client with:

```text
\q
```

The temporary Pod is removed automatically because of:

```text
--rm
```

---

# 12. Check Database List Using a Test Pod

Run:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "\l"
```

The expected database includes:

```text
helpdesk_db
```

---

# 13. Check Database Tables Using a Test Pod

Run:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "\dt"
```

Expected application tables:

```text
notifications
tickets
users
```

Example:

```text
 Schema |     Name      | Type  |    Owner
--------+---------------+-------+--------------
 public | notifications | table | helpdesk_app
 public | tickets       | table | helpdesk_app
 public | users         | table | helpdesk_app
```

---

# 14. Database Backup Dump

The existing PostgreSQL database dump is stored in the project at:

```text
docker/postgres/backup/helpdesk_db.dump
```

Check the file:

```bash
ls -lh docker/postgres/backup/helpdesk_db.dump
```

---

# 15. Copy Database Dump into PostgreSQL Pod

First get the PostgreSQL Pod name:

```bash
kubectl get pods -n it-helpdesk
```

Example:

```text
postgres-57dd9ff854-st7ct
```

Copy the dump into the Pod:

```bash
kubectl cp docker/postgres/backup/helpdesk_db.dump \
it-helpdesk/postgres-57dd9ff854-st7ct:/tmp/helpdesk_db.dump
```

Verify:

```bash
kubectl exec -n it-helpdesk postgres-57dd9ff854-st7ct -- \
ls -lh /tmp/helpdesk_db.dump
```

Expected:

```text
/tmp/helpdesk_db.dump
```

---

# 16. Restore Database Using pg_restore

Run:

```bash
kubectl exec -n it-helpdesk postgres-57dd9ff854-st7ct -- \
pg_restore \
-U helpdesk_app \
-d helpdesk_db \
--no-owner \
/tmp/helpdesk_db.dump
```

If successful, `pg_restore` may return no output.

---

# 17. Verify Restored Tables

Run a temporary PostgreSQL client Pod:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "\dt"
```

Expected:

```text
notifications
tickets
users
```

---

# 18. Verify Application Data

Check users:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "SELECT * FROM users;"
```

Check tickets:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "SELECT * FROM tickets;"
```

Check notifications:

```bash
kubectl run postgres-test \
  -n it-helpdesk \
  --rm -it \
  --image=postgres:16 \
  --restart=Never \
  --env="PGPASSWORD=helpdesk123" \
  -- psql \
  -h it-helpdesk-postgres \
  -U helpdesk_app \
  -d helpdesk_db \
  -c "SELECT * FROM notifications;"
```

---

# 19. PostgreSQL Logs

Check logs:

```bash
kubectl logs -n it-helpdesk deployment/postgres
```

Follow logs:

```bash
kubectl logs -f -n it-helpdesk deployment/postgres
```

Or use the Pod directly:

```bash
kubectl logs -n it-helpdesk <POSTGRES-POD-NAME>
```

---

# 20. Execute Commands Inside PostgreSQL Pod

Open a shell:

```bash
kubectl exec -it -n it-helpdesk <POSTGRES-POD-NAME> -- bash
```

Check PostgreSQL processes:

```bash
kubectl exec -n it-helpdesk <POSTGRES-POD-NAME> -- \
ps aux | grep postgres
```

Check PostgreSQL version:

```bash
kubectl exec -n it-helpdesk <POSTGRES-POD-NAME> -- \
psql --version
```

Connect directly:

```bash
kubectl exec -it -n it-helpdesk <POSTGRES-POD-NAME> -- \
psql -U helpdesk_app -d helpdesk_db
```

---

# 21. Check Persistent Storage

Check PVC:

```bash
kubectl get pvc -n it-helpdesk
```

Check PV:

```bash
kubectl get pv
```

Check StorageClass:

```bash
kubectl get storageclass
```

Check all PostgreSQL resources:

```bash
kubectl get all -n it-helpdesk
```

Check storage-related resources:

```bash
kubectl get storageclass,pv,pvc -n it-helpdesk
```

---

# 22. Important PVC and Data Warning

The PostgreSQL database uses dynamically provisioned storage.

The relationship is:

```text
StorageClass
     ↓
Dynamic PV
     ↓
PVC
     ↓
PostgreSQL Pod
```

The current StorageClass uses:

```text
reclaimPolicy: Delete
```

Therefore, deleting the PVC can result in deletion of the dynamically provisioned storage.

For this reason, do not delete:

```bash
kubectl delete pvc postgres-pvc -n it-helpdesk
```

unless the database data has been backed up or the data is intentionally disposable.

The project has an existing database dump:

```text
docker/postgres/backup/helpdesk_db.dump
```

which can be restored using `pg_restore`.

---

# 23. Recreating PostgreSQL After PVC Recreation

If the PostgreSQL PVC is intentionally recreated:

1. Create the StorageClass.
2. Create the PVC.
3. Verify that the PVC is `Bound`.
4. Verify that a new PV was dynamically provisioned.
5. Deploy PostgreSQL.
6. Verify the PostgreSQL Pod is `Running`.
7. Verify the PostgreSQL Service has an endpoint.
8. Copy the database dump into the PostgreSQL Pod.
9. Run `pg_restore`.
10. Verify the application tables.

Useful commands:

```bash
kubectl get storageclass
kubectl get pv
kubectl get pvc -n it-helpdesk
kubectl get pods -n it-helpdesk
kubectl get svc -n it-helpdesk
```

---

# 24. Troubleshooting

## Pod shows ErrImageNeverPull

Check:

```bash
kubectl describe pod <POSTGRES-POD-NAME> -n it-helpdesk
```

Load the image into Minikube:

```bash
minikube image load it-helpdesk-postgres:v1
```

Verify:

```bash
minikube image ls | grep it-helpdesk-postgres
```

---

## Service has no Endpoints

Check:

```bash
kubectl describe svc it-helpdesk-postgres -n it-helpdesk
```

Check Pod labels:

```bash
kubectl get pods -n it-helpdesk --show-labels
```

The Service selector:

```text
app=postgres
```

must match the PostgreSQL Pod label:

```text
app=postgres
```

---

## PVC is Pending

Check:

```bash
kubectl get pvc -n it-helpdesk
```

Then:

```bash
kubectl describe pvc postgres-pvc -n it-helpdesk
```

Check StorageClass:

```bash
kubectl get storageclass
```

Check StorageClass details:

```bash
kubectl describe storageclass it-helpdesk-storage
```

Check PVs:

```bash
kubectl get pv
```

---

## PostgreSQL Pod is restarting

Check:

```bash
kubectl get pods -n it-helpdesk
```

Then:

```bash
kubectl describe pod <POSTGRES-POD-NAME> -n it-helpdesk
```

Check logs:

```bash
kubectl logs -n it-helpdesk <POSTGRES-POD-NAME>
```

If the container previously restarted, check the previous container logs:

```bash
kubectl logs -n it-helpdesk <POSTGRES-POD-NAME> --previous
```

---

# 25. Current Architecture

```text
                         Kubernetes Cluster
                              Minikube
                                  │
                         it-helpdesk namespace
                                  │
             ┌────────────────────┴────────────────────┐
             │                                         │
             ▼                                         ▼
     postgres-secret                           it-helpdesk-storage
             │                                  StorageClass
             │                                         │
             │                                         ▼
             │                                  Dynamic PV
             │                                         │
             │                                         ▼
             │                                  postgres-pvc
             │                                         │
             │                                         ▼
             │                                PostgreSQL Pod
             │                                Port: 5432
             │                                         │
             │                                         ▲
             │                                         │
             └──────────────────────────────┐          │
                                            │          │
                                            ▼          │
                                  it-helpdesk-postgres
                                      ClusterIP
                                         :5432
                                            │
                                            ▼
                                  Application Services
```

---

# 26. PostgreSQL Kubernetes Milestone

The PostgreSQL Kubernetes setup has been completed and verified.

```text
Namespace                    ✅
Secret                       ✅
Custom StorageClass          ✅
Dynamic PV provisioning      ✅
PVC                          ✅
PostgreSQL Deployment        ✅
PostgreSQL Pod               ✅
PostgreSQL Service           ✅
Service Endpoint             ✅
Minikube Image Loading       ✅
Database Connectivity        ✅
Database Restore             ✅
users table                  ✅
tickets table                ✅
notifications table          ✅
Persistent Storage           ✅
```

The next Kubernetes component is the **User Service**.
