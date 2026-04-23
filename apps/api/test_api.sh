#!/bin/bash

BASE_URL="http://localhost:3000/api"
DEVICE_ID="550e8400-e29b-41d4-a716-446655440000"

echo "1. Registering..."
REG_RES=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username": "testparent", "password": "password123"}')
echo "Response: $REG_RES"

# Extract Token (Simple grep for demo, proper JSON parsing preferred but keeping it simple)
TOKEN=$(echo $REG_RES | grep -o '"token":"[^"]*' | cut -d'"' -f4)
echo "Token: $TOKEN"

echo -e "\n2. Enrolling Device..."
ENROLL_RES=$(curl -s -X POST "$BASE_URL/device/enroll" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "deviceId": "'"$DEVICE_ID"'",
    "deviceName": "Test Phone",
    "deviceType": "android"
  }')
echo "Response: $ENROLL_RES"

echo -e "\n3. Testing Heartbeat (Authenticated/Enrolled)..."
HEARTBEAT_RES=$(curl -s -X POST "$BASE_URL/heartbeat" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "'"$DEVICE_ID"'",
    "activity": [
        {"app": "com.instagram.android", "durationSeconds": 120, "timestamp": "'$(date -Iseconds)'"}
    ]
  }')
echo "Response: $HEARTBEAT_RES"

echo -e "\nDone."
