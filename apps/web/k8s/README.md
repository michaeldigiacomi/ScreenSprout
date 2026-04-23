# Screen Sprout Web - Kubernetes Manifests

This directory contains Kubernetes manifests for deploying the Screen Sprout Web application.

## Structure

```
k8s/
├── deployment.yaml          # Web app deployment
├── service.yaml             # ClusterIP service
├── ingress.yaml             # Traefik ingress with TLS
├── kustomization.yaml       # Root kustomization
├── base/
│   ├── deployment.yaml      # Base deployment (2 replicas)
│   ├── service.yaml         # Base service
│   ├── ingress.yaml         # Base ingress
│   └── kustomization.yaml   # Base kustomization
├── overlays/
│   └── production/
│       └── kustomization.yaml  # Production overlay (3 replicas)
└── argocd/
    └── application.yaml     # ArgoCD Application manifest
```

## Requirements

- Kubernetes cluster with Traefik ingress controller
- cert-manager for TLS certificates (Let's Encrypt)

## Configuration

### Image

- **Registry:** ghcr.io/screensprout/web
- **Tag:** latest

### Ports

- **Container:** 80 (nginx)
- **Service:** 80 → 80

### Ingress

- **Host:** app.screensprout.digitaladrenalin.net
- **TLS:** Automatic via cert-manager (Let's Encrypt)
- **Path Routing:**
  - `/api` (prefix) → screen-sprout-api service (port 3000)
  - `/` (prefix) → web service (port 80)

### GitHub Container Registry Secret

Create a GitHub personal access token with `read:packages` scope:

```bash
kubectl create secret docker-registry ghcr-registry-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --docker-email=YOUR_EMAIL \
  --namespace=screensprout
```

## Deployment

### Using kubectl with kustomize:

```bash
# Deploy base configuration (2 replicas, dev resources)
kubectl apply -k k8s/base/

# Deploy production overlay (3 replicas, higher resources)
kubectl apply -k k8s/overlays/production/
```

### Using ArgoCD:

Apply the ArgoCD Application manifest:

```bash
kubectl apply -f k8s/argocd/application.yaml
```

### Manual deploy (quick):

```bash
kubectl set image deployment/web web=ghcr.io/screensprout/web:latest -n screensprout
kubectl rollout status deployment/web -n screensprout --timeout=5m
```

## Resource Allocation

### Base (Development):
- Replicas: 2
- Memory: 64Mi request / 256Mi limit
- CPU: 50m request / 300m limit

### Production:
- Replicas: 3
- Memory: 128Mi request / 512Mi limit
- CPU: 100m request / 500m limit

## Health Checks

- **Readiness Probe:** `GET /api/health` on port 80
  - Initial delay: 5s
  - Period: 5s
- **Liveness Probe:** `GET /api/health` on port 80
  - Initial delay: 10s
  - Period: 10s

## Security

- Runs as non-root user (UID 101)
- Read-only root filesystem (with EmptyDir for nginx cache and runtime)
- Dropped all capabilities
- AppArmor/Seccomp: restricted profile