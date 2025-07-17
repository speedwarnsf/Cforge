# Google OAuth Setup Guide

## Step 1: Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/
2. Select your project: `chrome-horizon-464119-i4`

## Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
3. Choose **Desktop application** as the application type
4. Name it: `Concept Forge OAuth`
5. Click **Create**

## Step 3: Get Your Credentials
After creating, you'll see:
- **Client ID**: Something like `123456789-abcdef.apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abcdef123456`

## Step 4: Run the Script
Copy your credentials and run:
```bash
CLIENT_ID='your_client_id_here' CLIENT_SECRET='your_client_secret_here' npx tsx oauth-interactive.ts
```

## Step 5: Authorize Access
1. The script will show you a URL
2. Open the URL in your browser
3. Sign in and authorize access
4. Copy the authorization code

## Step 6: Create Test Document
Run the final command with your authorization code:
```bash
AUTH_CODE='your_auth_code' CLIENT_ID='your_client_id' CLIENT_SECRET='your_client_secret' npx tsx oauth-test.ts
```

This will create a test document and give you the URL.