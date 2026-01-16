# Vercel Deployment Configuration

**Application**: The C Forge (Concept Forge)
**Framework**: React + Express (Full-stack)
**Target Domain**: www.thecforge.com

---

## 📋 Vercel Configuration

### **Files Created:**

1. **`vercel.json`** - Main configuration
2. **`.vercelignore`** - Excludes unnecessary files
3. **`deploy-vercel.sh`** - Deployment script

---

## ⚙️ Configuration Details

### **Build Settings** (in `vercel.json`)

```json
{
  "version": 2,
  "name": "thecforge",
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist/public",
  "installCommand": "npm install"
}
```

### **Routes Configuration**

```json
"routes": [
  {
    "src": "/api/(.*)",
    "dest": "/server/index.ts"
  },
  {
    "src": "/(.*)",
    "dest": "/client/index.html"
  }
]
```

- API requests go to Express backend
- All other requests serve React frontend

---

## 🌍 Environment Variables Required

Set these in Vercel Dashboard > Settings > Environment Variables:

| Variable | Value | Where to Get |
|----------|-------|--------------|
| `OPENAI_API_KEY` | `sk-proj-...` | https://platform.openai.com/api-keys |
| `SUPABASE_URL` | `https://vqkoxfenyjomillmxawh.supabase.co` | Already configured |
| `SUPABASE_ANON_KEY` | Long JWT token | Already configured |
| `DATABASE_URL` | `postgresql://postgres:...` | Supabase Dashboard > Database |
| `NODE_ENV` | `production` | Set manually |

---

## 🚀 Deployment Methods

### **Method 1: Vercel Dashboard** (Recommended)

1. Go to https://vercel.com/new
2. Import Git Repository
3. Select: `speedwarnsf/Cforge`
4. Choose branch: `deploy-thecforge-com`
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`
6. Add environment variables (see above)
7. Click "Deploy"

### **Method 2: Vercel CLI**

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# When prompted, set environment variables
```

### **Method 3: GitHub Integration** (Auto-deploy)

1. Connect Vercel to GitHub
2. Import repository
3. Every push to `deploy-thecforge-com` auto-deploys
4. Preview deployments for all branches

---

## 🌐 Domain Configuration

### **Step 1: Add Domain in Vercel**

1. Go to Project Settings > Domains
2. Add: `www.thecforge.com`
3. Vercel provides DNS settings

### **Step 2: Update GoDaddy DNS**

Add CNAME record:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 600 (or default)
```

Optionally, redirect apex domain:
```
Type: A
Name: @
Value: 76.76.21.21
```

### **Step 3: Wait for Propagation**

- DNS changes take 5-60 minutes
- Check status in Vercel dashboard
- Test with: https://www.whatsmydns.net

---

## 📦 Build Output

### **Frontend** (`dist/public/`)
- `index.html` - 4.78 KB
- `assets/index.js` - 614 KB (minified)
- `assets/index.css` - 112 KB
- `assets/clean_anvil_video.mp4` - 5.3 MB
- Icons and images

### **Backend** (`dist/index.js`)
- Bundled server: 402 KB
- All routes included
- All utilities bundled

---

## 🔧 Optimization Settings

### **Already Configured:**

✅ **Code Splitting**: Automatic via Vite
✅ **Asset Optimization**: Images and videos optimized
✅ **Compression**: Gzip enabled
✅ **Caching**: Static assets cached
✅ **Region**: US East (iad1) for optimal performance

### **Bundle Size:**
- Total frontend: ~615 KB (minified)
- Total backend: ~403 KB (minified)
- Assets: ~5.4 MB (video + images)

---

## 📊 Vercel Free Tier Limits

✅ **Bandwidth**: 100 GB/month (plenty for beta)
✅ **Build Time**: 6,000 minutes/month
✅ **Serverless Functions**: 100 GB-hours/month
✅ **Deployments**: Unlimited
✅ **Team Members**: 1 (you)

**Estimated Usage** (for beta):
- 1,000 page views = ~1 GB bandwidth
- 100 concept generations = ~1 GB
- **Total**: Well under free tier limits

---

## 🔒 Security Configuration

### **Environment Variables:**
- ✅ Never exposed in client code
- ✅ Only accessible in serverless functions
- ✅ Encrypted at rest

### **HTTPS:**
- ✅ Automatic SSL certificate
- ✅ Force HTTPS redirect
- ✅ HSTS enabled

### **Headers:**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" }
      ]
    }
  ]
}
```

---

## 📈 Monitoring & Analytics

### **Vercel Dashboard Provides:**
- ✅ Real-time deployment logs
- ✅ Function execution logs
- ✅ Performance analytics
- ✅ Error tracking
- ✅ Build history

### **Additional Monitoring:**
- OpenAI usage: https://platform.openai.com/usage
- Supabase metrics: Supabase Dashboard
- Domain health: Vercel Analytics (optional add-on)

---

## 🆘 Common Issues & Solutions

### **Issue: Build fails**
**Check:**
- Environment variables are set
- Node version is 20.x
- Build command is correct

**Solution:**
```bash
# Test locally first
npm run build

# If successful, commit and push
git push
```

### **Issue: API routes not working**
**Check:**
- Environment variables in Vercel
- `vercel.json` routes configuration
- Server logs in Vercel dashboard

### **Issue: Domain not connecting**
**Check:**
- DNS propagation (wait 10-60 min)
- CNAME record is correct
- SSL certificate is issued

### **Issue: Slow performance**
**Solutions:**
- Enable Vercel Edge Network (free)
- Optimize images further
- Implement caching headers

---

## 🔄 Redeployment

### **To update the site:**

```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push

# Vercel auto-deploys (if connected)
# Or manually deploy:
vercel --prod
```

### **Rollback:**

1. Go to Vercel Dashboard
2. Deployments tab
3. Find previous working deployment
4. Click "Promote to Production"

---

## 📞 Quick Commands

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel remove [deployment-url]
```

---

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] `.env` file created locally (for testing)
- [ ] Environment variables ready for Vercel
- [ ] Build passes locally: `npm run build`
- [ ] Git repo is up to date
- [ ] Branch `deploy-thecforge-com` is pushed
- [ ] Vercel account created
- [ ] Domain ownership verified

After deploying:

- [ ] Test login screen
- [ ] Test concept generation
- [ ] Verify domain works
- [ ] Check SSL certificate
- [ ] Monitor initial usage

---

## 🎯 Expected Deployment Time

- **Initial Setup**: 5 minutes
- **Build Time**: 2-3 minutes
- **DNS Propagation**: 10-60 minutes
- **Total**: ~15-70 minutes (mostly waiting for DNS)

---

## 📚 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vite Docs**: https://vitejs.dev/guide
- **Express on Vercel**: https://vercel.com/guides/using-express-with-vercel
- **Custom Domains**: https://vercel.com/docs/concepts/projects/domains

---

**Configuration Status**: ✅ Complete and tested
**Ready for Deployment**: YES
**Next Step**: See `WHEN_YOU_RETURN.md` for deployment instructions
