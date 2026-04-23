#!/bin/bash
echo "1. Logging in..."
LOGIN_RES=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testparent","password":"password123"}')

echo "Login Response: $LOGIN_RES"

TOKEN=$(echo $LOGIN_RES | grep -o '"token":"[^"]*' | grep -o '[^"]*$')

if [ -z "$TOKEN" ]; then
  echo "Failed to get token."
  exit 1
fi

echo "Token: $TOKEN"

echo "2. Fetching Devices..."
curl -s -X GET http://localhost:3000/api/devices \
  -H "Authorization: Bearer $TOKEN"
