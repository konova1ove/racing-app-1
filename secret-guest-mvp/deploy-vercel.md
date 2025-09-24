# Deploy to Vercel - FREE Hosting

## Option 1: Web Interface (Recommended)

1. **Go to** [https://vercel.com](https://vercel.com)
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import** your GitHub repository: `konova1ove/racing-app-1`
5. **Configure settings:**
   - Framework Preset: `Vite`
   - Root Directory: `secret-guest-mvp`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. **Add Environment Variables:**
   ```
   VITE_ROBOFLOW_API_KEY=your_actual_api_key_here
   VITE_APP_NAME=Secret Guest MVP
   VITE_APP_VERSION=1.0.0
   ```
7. **Click "Deploy"**

## Option 2: Vercel CLI

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd /Users/polzovatel/Development/secret-guest-mvp
vercel

# Follow the prompts:
# - Link to existing project? N
# - Project name: secret-guest-mvp
# - In which directory is your code located? ./
# - Want to override settings? N
```

## After Deployment

Your app will be available at: `https://your-project-name.vercel.app`

You can also configure a custom domain for free!