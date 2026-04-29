# MediConnect+ Deployment Guide

This guide will walk you through deploying your MediConnect+ telemedicine application to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup

Create a `.env` file in the `backend` directory with these variables:

```env
# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mediconnect?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_live_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_CURRENCY=INR

# Email OTP (for user verification)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Optional Features
ALLOW_UNPAID_APPOINTMENTS=false
ALLOW_UNPAID_PHARMACY_ORDERS=false
NODE_ENV=production
PORT=5000
```

### 2. Database Setup

1. **MongoDB Atlas (Recommended for Production)**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Get your connection string
   - Whitelist `0.0.0.0/0` for all IPs (or your server IP)

2. **Seed the Database**
   ```bash
   cd backend
   npm run seed
   ```

---

## 🚀 Deployment Options

### Option 1: Deploy to Render.com (Recommended - Free Tier)

#### Backend Deployment

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/mediconnect-plus.git
   git push -u origin main
   ```

2. **Deploy Backend on Render**
   - Go to https://render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: mediconnect-backend
     - **Root Directory**: backend
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Plan**: Free
   - Add Environment Variables (from the .env file above)
   - Click "Create Web Service"
   - Copy the backend URL (e.g., `https://mediconnect-backend.onrender.com`)

3. **Update Frontend API URL**
   - Create `.env` file in root directory:
     ```env
     VITE_API_URL=https://mediconnect-backend.onrender.com
     ```

#### Frontend Deployment

1. **Deploy on Vercel**
   ```bash
   npm install -g vercel
   vercel
   ```
   - Follow the prompts
   - Add environment variable: `VITE_API_URL` with your Render backend URL

2. **Or Deploy on Netlify**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

---

### Option 2: Deploy to Railway.app

1. **Go to https://railway.app**
2. **Click "New Project" → "Deploy from GitHub repo"**
3. **Select your repository**
4. **Configure Services**:
   - Add MongoDB plugin
   - Set backend root directory to `backend`
   - Add all environment variables
5. **Deploy Frontend**:
   - Add another service for frontend
   - Build command: `npm run build`
   - Output directory: `dist`

---

### Option 3: Deploy to AWS/Azure/DigitalOcean

#### Using Docker (Recommended)

1. **Create Dockerfile for Backend** (`backend/Dockerfile`):
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install --production
   COPY . .
   EXPOSE 5000
   CMD ["npm", "start"]
   ```

2. **Create Dockerfile for Frontend** (`Dockerfile`):
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

3. **Create docker-compose.yml**:
   ```yaml
   version: '3.8'
   services:
     backend:
       build: ./backend
       ports:
         - "5000:5000"
       env_file:
         - ./backend/.env
       depends_on:
         - mongo

     frontend:
       build: .
       ports:
         - "80:80"
       depends_on:
         - backend

     mongo:
       image: mongo:6
       ports:
         - "27017:27017"
       volumes:
         - mongo-data:/data/db

   volumes:
     mongo-data:
   ```

4. **Deploy**:
   ```bash
   docker-compose up -d
   ```

---

## 🔧 Post-Deployment Configuration

### 1. Razorpay Setup (For Real Payments)

1. **Create Razorpay Account**: https://dashboard.razorpay.com
2. **Generate API Keys**:
   - Go to Settings → API Keys
   - Generate Key ID and Key Secret
   - Add to your `.env` file
3. **Test Payments**:
   - Use Razorpay test cards: `4111 1111 1111 1111`
   - Any future expiry date, any CVV

### 2. Email OTP Setup

1. **Gmail App Password** (if using Gmail):
   - Go to Google Account → Security
   - Enable 2-Step Verification
   - Generate App Password
   - Use this password in `EMAIL_PASSWORD`

2. **Alternative Email Services**:
   - SendGrid, Mailgun, AWS SES
   - Update `EMAIL_SERVICE` and transporter config in `backend/src/utils/otp.js`

### 3. Database Migration

If you have existing data:
```bash
# Export from local MongoDB
mongodump --uri="mongodb://localhost:27017/mediconnect" --out=backup

# Import to MongoDB Atlas
mongorestore --uri="mongodb+srv://..." backup/
```

---

## 🧪 Testing After Deployment

### 1. Test User Registration with OTP
```bash
# Request OTP
curl -X POST https://your-backend-url/api/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify OTP
curl -X POST https://your-backend-url/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

### 2. Test Payment Flow
1. Register as patient
2. Find a doctor
3. Book appointment
4. Complete Razorpay test payment
5. Verify appointment appears in doctor dashboard

### 3. Test Video Consultation
1. Book a video appointment
2. Both patient and doctor join the call
3. Verify connection works

### 4. Test Profile Sync
1. Login as patient
2. Go to Settings
3. Update name, phone, DOB
4. Login as doctor
5. Verify patient data is updated

---

## 📊 Monitoring & Maintenance

### 1. Enable Logging
- Use services like Logtail, Datadog, or New Relic
- Add to `backend/src/index.js`:
  ```javascript
  import morgan from 'morgan';
  app.use(morgan('combined'));
  ```

### 2. Set Up Backups
- MongoDB Atlas has automatic backups
- Enable daily backups in Atlas dashboard

### 3. SSL Certificate
- Render/Vercel/Netlify provide free SSL
- For custom domains, use Let's Encrypt

### 4. Domain Setup
1. Buy domain from Namecheap/GoDaddy
2. Point to your deployment:
   - **Vercel**: Add domain in project settings
   - **Netlify**: Domain management → Add custom domain
   - **Render**: Settings → Custom domain

---

## 🔐 Security Checklist

- [x] JWT Secret is strong and unique
- [x] MongoDB has authentication enabled
- [x] Razorpay keys are from live mode (not test)
- [x] Email credentials are app-specific passwords
- [x] HTTPS is enabled (SSL certificate)
- [x] CORS is properly configured
- [x] Rate limiting is enabled (add express-rate-limit)
- [x] Input validation on all forms
- [x] OTP expires after 5 minutes
- [x] Passwords are hashed with bcrypt

---

## 🐛 Troubleshooting

### Issue: Appointments created without payment
**Solution**: Ensure `ALLOW_UNPAID_APPOINTMENTS=false` in `.env`

### Issue: Earnings showing 0
**Solution**: Run `npm run seed` to create sample data, or complete real paid appointments

### Issue: Profile not syncing
**Solution**: Check backend logs, ensure `/api/me/profile` endpoint is accessible

### Issue: OTP not sending
**Solution**: Check email credentials, or check backend console in development mode

### Issue: Video call not connecting
**Solution**: Ensure WebSocket signaling server is running and ports are open

---

## 📞 Support & Resources

- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **Render**: https://render.com/docs
- **Vercel**: https://vercel.com/docs
- **Razorpay**: https://razorpay.com/docs
- **Node.js Deployment**: https://nodejs.org/en/docs/guides

---

## 🎯 Production Launch Checklist

- [ ] All environment variables set
- [ ] Database seeded with initial data
- [ ] Razorpay live keys configured
- [ ] Email OTP working
- [ ] SSL certificate active
- [ ] Custom domain configured
- [ ] Tested all user flows (patient, doctor, admin)
- [ ] Payment gateway tested with real transaction
- [ ] Video calls working
- [ ] Profile sync working
- [ ] Dashboards showing correct data
- [ ] Error logging enabled
- [ ] Backups configured
- [ ] Performance tested
- [ ] Security audit completed

---

**Congratulations! Your MediConnect+ app is now production-ready and ready to sell to customers! 🎉**
