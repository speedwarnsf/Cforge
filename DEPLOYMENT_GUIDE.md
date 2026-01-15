# The C Forge - Deployment Guide for www.thecforge.com

## 🚀 Quick Start Overview

This guide will help you deploy **The C Forge** (Concept Forge) to www.thecforge.com via GoDaddy hosting.

---

## ⚙️ Prerequisites

### Required Accounts
1. **Supabase Account** (Free tier available)
   - Sign up at https://supabase.com
   - You'll need this for the PostgreSQL database

2. **OpenAI Account** (Paid - requires API credits)
   - Sign up at https://platform.openai.com
   - You'll need API credits for GPT-4 usage

3. **GoDaddy Hosting** (Node.js hosting required)
   - You need a hosting plan that supports Node.js applications
   - Recommended: GoDaddy VPS or cPanel with Node.js support

---

## 📋 Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Choose organization and name your project (e.g., "thecforge-production")
4. Set a strong database password (save this!)
5. Choose a region close to your users
6. Wait for project to finish setting up (~2 minutes)

### 1.2 Run Database Migrations
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Create a new query
4. Run each of these SQL files **in order**:
   - `supabase-table-setup.sql`
   - `supabase-salvaged-fragments-table.sql`
   - `supabase-recombined-from-column.sql`
   - `supabase-retrieval-corpus-schema.sql`
   - `supabase-used-examples-table.sql`
   - `supabase-feedback-schema.sql`

### 1.3 Get Supabase Credentials
1. Go to Project Settings > API
2. Copy these values:
   - **Project URL** (e.g., https://xxxxx.supabase.co)
   - **Anon/Public Key**
3. Go to Project Settings > Database
4. Copy the **Connection String** (choose "URI" format)

---

## 🔑 Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it "thecforge-production"
4. Copy the API key (starts with `sk-proj-...`)
5. **IMPORTANT**: Save this key securely - you won't see it again!

---

## 💻 Step 3: Prepare Application for Deployment

### 3.1 Clone the Repository
```bash
git clone https://github.com/speedwarnsf/Cforge.git
cd Cforge
git checkout deploy-thecforge-com
```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Create Environment File
```bash
cp .env.example .env
```

### 3.4 Edit .env File
Open `.env` and fill in your actual values:

```env
NODE_ENV=production
PORT=5000

# Your OpenAI API Key
OPENAI_API_KEY=sk-proj-your-actual-key-here

# Your Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
DATABASE_URL=postgresql://postgres:your-password@db.your-project.supabase.co:5432/postgres
```

### 3.5 Build the Application
```bash
npm run build
```

This creates two things:
- `dist/public/` - Static frontend files
- `dist/index.js` - Compiled backend server

---

## 🌐 Step 4: Deploy to GoDaddy

### Option A: GoDaddy VPS (Recommended)

#### 4.1 SSH into Your VPS
```bash
ssh root@your-server-ip
```

#### 4.2 Install Node.js (if not installed)
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
```

#### 4.3 Upload Your Application
You can use SCP, FTP, or Git:

**Using Git (Recommended):**
```bash
cd /var/www
git clone https://github.com/speedwarnsf/Cforge.git
cd Cforge
git checkout deploy-thecforge-com
```

#### 4.4 Set Up Environment
```bash
# Create .env file
nano .env
# Paste your environment variables, save (Ctrl+X, Y, Enter)

# Install dependencies
npm install --production

# Build the application
npm run build
```

#### 4.5 Set Up PM2 (Process Manager)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
pm2 start dist/index.js --name "thecforge"

# Set PM2 to restart on system reboot
pm2 startup
pm2 save
```

#### 4.6 Configure Nginx Reverse Proxy
```bash
# Install Nginx
apt-get install nginx

# Create Nginx config
nano /etc/nginx/sites-available/thecforge.com
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name www.thecforge.com thecforge.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/thecforge.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 4.7 Set Up SSL (HTTPS)
```bash
# Install Certbot
apt-get install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d thecforge.com -d www.thecforge.com
```

### Option B: GoDaddy cPanel with Node.js

#### 4.1 Enable Node.js in cPanel
1. Log into cPanel
2. Find "Setup Node.js App"
3. Click "Create Application"
4. Set:
   - Node.js version: 20.x
   - Application mode: Production
   - Application root: thecforge
   - Application URL: thecforge.com
   - Application startup file: dist/index.js

#### 4.2 Upload Files
1. Use File Manager or FTP client
2. Upload entire project to `/home/yourusername/thecforge/`
3. Make sure to upload:
   - All files in `dist/`
   - `package.json`
   - `node_modules/` (or run npm install via SSH)

#### 4.3 Set Environment Variables
1. In Node.js App settings
2. Add environment variables:
   - `NODE_ENV=production`
   - `OPENAI_API_KEY=your-key`
   - `SUPABASE_URL=your-url`
   - `SUPABASE_ANON_KEY=your-key`
   - `DATABASE_URL=your-connection-string`

#### 4.4 Start Application
1. Click "Run NPM Install"
2. Click "Start App"

---

## 🔐 Step 5: Configure Beta Access

### Current Login Credentials
- **Username**: `beta-tester`
- **Password**: `beta-access-2026`

### To Change Credentials
Edit `client/src/components/PasswordGate.tsx`:

```typescript
const CORRECT_PASSWORD = 'your-new-password';
const CORRECT_USERNAME = 'your-new-username';
```

Then rebuild:
```bash
npm run build
```

---

## ✅ Step 6: Verify Deployment

1. Visit https://www.thecforge.com
2. You should see the branded login screen with "Public Beta Coming Soon"
3. Log in with beta credentials
4. Test concept generation:
   - Enter a brief (e.g., "Smart fitness tracker")
   - Select a concept lens
   - Click "Generate Concept"
   - Verify response from AI

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"
- Check your `DATABASE_URL` is correct
- Verify Supabase project is running
- Check firewall isn't blocking connections

### Issue: "OpenAI API Error"
- Verify your API key is correct
- Check you have credits in your OpenAI account
- Confirm API key has GPT-4 access

### Issue: "502 Bad Gateway"
- Check Node.js process is running: `pm2 status`
- Check logs: `pm2 logs thecforge`
- Restart: `pm2 restart thecforge`

### Issue: Login not working
- Clear browser localStorage
- Check browser console for errors
- Verify username/password match code

---

## 📊 Monitoring & Maintenance

### Check Application Status
```bash
pm2 status
pm2 logs thecforge
```

### Update Application
```bash
cd /var/www/Cforge
git pull origin deploy-thecforge-com
npm install
npm run build
pm2 restart thecforge
```

### Monitor Costs
- **OpenAI**: Check usage at https://platform.openai.com/usage
- **Supabase**: Check usage in project dashboard
- Average cost: ~$0.05-0.10 per concept generation

---

## 🎯 Next Steps

Once deployment is successful:

1. **Test thoroughly** with beta users
2. **Monitor API costs** closely
3. **Collect feedback** on concepts generated
4. **Plan public launch** when ready
5. **Update login screen** to remove "Beta" messaging

---

## 📞 Support

If you encounter issues:
1. Check application logs: `pm2 logs thecforge`
2. Check Supabase logs in dashboard
3. Review OpenAI API status page
4. Consult GoDaddy support for hosting issues

---

## 🔒 Security Notes

- **Never commit `.env` to git** (it's in .gitignore)
- **Keep API keys secret** - rotate if exposed
- **Use strong passwords** for beta access
- **Enable SSL/HTTPS** for production
- **Regularly update dependencies**: `npm audit`

---

**Deployment Branch**: `deploy-thecforge-com`
**Live Site**: www.thecforge.com
**Status**: Ready for deployment ✅
