#!/bin/bash

# Generate a random secret key base
SECRET_KEY_BASE=$(openssl rand -base64 64 | tr -d '\n')

echo "Generated Secret Key Base: $SECRET_KEY_BASE"

# Create the secret (idempotent-ish using dry-run + apply)
kubectl create secret generic plausible-secrets \
  --from-literal=secret-key-base="$SECRET_KEY_BASE" \
  -n screensprout \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secret 'plausible-secrets' created successfully in namespace 'screensprout'."
