# 📋 CREDENTIALS CHECKLIST

**Use this checklist to gather everything you need for deployment.**

---

## ✅ CREDENTIAL COLLECTION

### **1. OpenAI API Key**

- [ ] I have retrieved my OpenAI API key, OR
- [ ] I have created a new API key at https://platform.openai.com/api-keys

**My API Key** (paste here for reference):
```
sk-proj-________________________________
```

**Where to find it:**
- Login to: https://platform.openai.com
- Go to: API Keys
- Click: "+ Create new secret key"
- Name: "thecforge-production"
- Copy and save the key

---

### **2. Supabase Database Connection**

- [ ] I have my Supabase database password

**My Database Password**:
```
________________________________
```

**Where to find it:**
- Login to: https://supabase.com/dashboard
- Select project: `vqkoxfenyjomillmxawh`
- Go to: Settings > Database
- Find: Connection String (URI tab)
- Replace: `[YOUR-PASSWORD]` with your password
- If forgotten: Reset in Database Settings

**Complete DATABASE_URL** (paste here):
```
postgresql://postgres:YOUR_PASSWORD@db.vqkoxfenyjomillmxawh.supabase.co:5432/postgres
```

---

### **3. Supabase Project Details** (Already Have ✅)

These are already configured, just verify:

**Supabase URL**:
```
https://vqkoxfenyjomillmxawh.supabase.co
```

**Supabase Anon Key**:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxa294ZmVueWpvbWlsbG14YXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTY4NTAsImV4cCI6MjA2NjUzMjg1MH0.eF28qERZEnSTeVvWbswqrCo1_j4RBXMGaFx2tf8rrvc
```

---

## 🎯 COMPLETE ENVIRONMENT VARIABLES

Once you have all credentials, here's what to paste in Vercel:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-key-here

# Supabase Configuration
SUPABASE_URL=https://vqkoxfenyjomillmxawh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxa294ZmVueWpvbWlsbG14YXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTY4NTAsImV4cCI6MjA2NjUzMjg1MH0.eF28qERZEnSTeVvWbswqrCo1_j4RBXMGaFx2tf8rrvc
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.vqkoxfenyjomillmxawh.supabase.co:5432/postgres

# Application
NODE_ENV=production
```

---

## ✅ VERIFICATION

Before deploying, verify you have:

- [ ] OpenAI API key starts with `sk-proj-`
- [ ] Supabase URL starts with `https://vqkoxfenyjomillmxawh.supabase.co`
- [ ] Supabase Anon Key starts with `eyJhbGc...`
- [ ] DATABASE_URL contains your actual password (not `YOUR_PASSWORD`)
- [ ] All credentials are saved securely

---

## 🚀 READY TO DEPLOY?

Once all checkboxes are checked:
1. Go to WHEN_YOU_RETURN.md
2. Follow Step 2: Deploy to Vercel
3. Paste the environment variables above
4. Deploy!

---

## 🔒 SECURITY REMINDER

- ✅ Keep these credentials secure
- ✅ Never share them publicly
- ✅ Never commit them to git
- ✅ Use environment variables only
- ✅ Rotate keys periodically

---

**Status**: Credentials gathered? → Proceed to WHEN_YOU_RETURN.md Step 2
