#!/bin/bash
# Script to test the /api/refresh endpoint

echo "🧪 Testing /api/refresh endpoint..."
echo ""

# Start dev server in background if not running
if ! lsof -i:3000 > /dev/null 2>&1; then
    echo "⚠️  Dev server not running on port 3000"
    echo "Please run 'npm run dev' in another terminal first"
    exit 1
fi

echo "📡 Calling POST /api/refresh..."
echo ""

if [ -z "$REFRESH_SECRET" ]; then
    echo "⚠️  REFRESH_SECRET is not set: export the same value as the dev server's .env"
    exit 1
fi

response=$(curl -s -X POST http://localhost:3000/api/refresh \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $REFRESH_SECRET" \
    -w "\n%{http_code}")

# Extract response body and status code
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

echo "Response Code: $http_code"
echo ""
echo "Response Body:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Success! Data refreshed"

    # Extract info from response
    champions=$(echo "$body" | jq -r '.data.championsCount' 2>/dev/null)
    patch=$(echo "$body" | jq -r '.data.patchVersion' 2>/dev/null)

    if [ -n "$champions" ] && [ "$champions" != "null" ]; then
        echo "📊 Champions: $champions"
        echo "🏷️  Patch: $patch"
    fi
else
    echo "❌ Failed with status $http_code"
fi

echo ""
echo "💡 You can now visit http://localhost:3000 to see the data"
