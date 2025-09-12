# Deployment Guide - Secret Guest MVP

This guide covers deployment options for the Secret Guest MVP application.

## Prerequisites

- Node.js 20.19+ or 22.12+
- Roboflow API key
- Git repository (GitHub, GitLab, etc.)

## Deployment Options

### 1. Vercel (Recommended)

Vercel provides the easiest deployment experience with automatic builds.

#### Steps:

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Click \"New Project\"
   - Import your Git repository

2. **Configure Build Settings**
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

3. **Set Environment Variables**
   ```
   VITE_ROBOFLOW_API_KEY=your_actual_api_key_here
   VITE_APP_NAME=Secret Guest MVP
   VITE_APP_VERSION=1.0.0
   ```

4. **Deploy**
   - Click \"Deploy\"
   - Your app will be available at `https://your-project.vercel.app`

#### Vercel Configuration (vercel.json)

The project includes a `vercel.json` file with optimal settings:

```json
{
  \"version\": 2,
  \"builds\": [
    {
      \"src\": \"package.json\",
      \"use\": \"@vercel/static-build\",
      \"config\": {
        \"distDir\": \"dist\"
      }
    }
  ],
  \"routes\": [
    {
      \"src\": \"/(.*)\",
      \"dest\": \"/index.html\"
    }
  ],
  \"headers\": [
    {
      \"source\": \"/(.*)\",
      \"headers\": [
        {
          \"key\": \"Cross-Origin-Embedder-Policy\",
          \"value\": \"require-corp\"
        },
        {
          \"key\": \"Cross-Origin-Opener-Policy\",
          \"value\": \"same-origin\"
        }
      ]
    }
  ]
}
```

### 2. Netlify

Netlify is another excellent option for static site hosting.

#### Steps:

1. **Connect Repository**
   - Go to [netlify.com](https://netlify.com)
   - Click \"New site from Git\"
   - Connect your repository

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Base directory: (leave empty)

3. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add the same variables as Vercel

4. **Deploy**
   - Click \"Deploy site\"
   - Your app will be available at `https://random-name.netlify.app`

#### Netlify Configuration (netlify.toml)

The project includes a `netlify.toml` file:

```toml
[build]
  publish = \"dist\"
  command = \"npm run build\"

[build.environment]
  NODE_VERSION = \"20\"

[[redirects]]
  from = \"/*\"
  to = \"/index.html\"
  status = 200

[[headers]]
  for = \"/*\"
  [headers.values]
    Cross-Origin-Embedder-Policy = \"require-corp\"
    Cross-Origin-Opener-Policy = \"same-origin\"
```

### 3. GitHub Pages

For simple deployments directly from GitHub.

#### Steps:

1. **Create GitHub Action**
   
   Create `.github/workflows/deploy.yml`:
   
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       
       steps:
       - name: Checkout
         uses: actions/checkout@v3
       
       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '20'
           cache: 'npm'
       
       - name: Install dependencies
         run: npm ci
       
       - name: Build
         run: npm run build
         env:
           VITE_ROBOFLOW_API_KEY: ${{ secrets.VITE_ROBOFLOW_API_KEY }}
       
       - name: Deploy
         uses: peaceiris/actions-gh-pages@v3
         with:
           github_token: ${{ secrets.GITHUB_TOKEN }}
           publish_dir: ./dist
   ```

2. **Configure Repository**
   - Go to repository Settings → Pages
   - Source: \"Deploy from a branch\"
   - Branch: `gh-pages` / `/ (root)`

3. **Set Secrets**
   - Go to repository Settings → Secrets and variables → Actions
   - Add `VITE_ROBOFLOW_API_KEY`

### 4. Manual Deployment

For custom hosting providers or your own server.

#### Steps:

1. **Build the Project**
   ```bash
   # Install dependencies
   npm install
   
   # Build for production
   npm run build
   ```

2. **Upload Files**
   - Upload the entire `dist/` folder to your web server
   - Ensure your server serves `index.html` for all routes (SPA routing)

3. **Configure Web Server**
   
   **Apache (.htaccess):**
   ```apache
   Options -MultiViews
   RewriteEngine On
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteRule ^ index.html [QSA,L]
   
   Header set Cross-Origin-Embedder-Policy \"require-corp\"
   Header set Cross-Origin-Opener-Policy \"same-origin\"
   ```
   
   **Nginx:**
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
     add_header Cross-Origin-Embedder-Policy \"require-corp\";
     add_header Cross-Origin-Opener-Policy \"same-origin\";
   }
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|----------|
| `VITE_ROBOFLOW_API_KEY` | Your Roboflow API key | `abc123...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|----------|
| `VITE_APP_NAME` | Application name | `Secret Guest MVP` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |
| `VITE_ENABLE_DEBUG` | Enable debug mode | `false` |
| `VITE_ROBOFLOW_BASE_URL` | Custom Roboflow URL | `https://detect.roboflow.com/` |

## Domain Configuration

### Custom Domain (Vercel)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

### Custom Domain (Netlify)

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS (automatic)

## Performance Optimization

### Build Optimization

The Vite configuration includes:
- Code splitting by vendor libraries
- Tree shaking for unused code
- Asset optimization
- Source map generation (disabled for production)

### CDN and Caching

Both Vercel and Netlify provide:
- Global CDN distribution
- Automatic asset caching
- Gzip/Brotli compression
- HTTP/2 support

## Security Considerations

### Headers

The deployment configuration includes security headers:
- `Cross-Origin-Embedder-Policy: require-corp`
- `Cross-Origin-Opener-Policy: same-origin`

These headers are required for ffmpeg.wasm to function properly.

### API Keys

- Never commit API keys to version control
- Use environment variables for all sensitive data
- Rotate API keys regularly
- Consider API key restrictions by domain

## Monitoring and Analytics

### Vercel Analytics

1. Enable Analytics in project settings
2. View performance metrics in dashboard
3. Monitor Core Web Vitals

### Netlify Analytics

1. Enable Analytics in site settings
2. View traffic and performance data
3. Monitor deployment success rates

### Custom Analytics

- Google Analytics 4
- Plausible Analytics
- Mixpanel for event tracking

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (requires 20.19+)
   - Verify all dependencies are installed
   - Check for TypeScript errors

2. **Environment Variables Not Working**
   - Ensure variables start with `VITE_`
   - Restart development server after changes
   - Check deployment platform variable settings

3. **Video Processing Issues**
   - Ensure COOP/COEP headers are set correctly
   - Check browser compatibility
   - Verify ffmpeg.wasm dependencies

4. **Routing Issues**
   - Ensure SPA fallback is configured
   - Check server configuration for client-side routing
   - Verify build output includes index.html

### Logs and Debugging

- **Vercel**: View logs in project dashboard
- **Netlify**: Check deploy logs and function logs
- **Browser**: Use developer tools console
- **Build**: Check CI/CD pipeline logs

## Continuous Deployment

Both Vercel and Netlify support automatic deployments:

1. **Production**: Deploys automatically on push to `main` branch
2. **Preview**: Deploys automatically for pull requests
3. **Environment**: Different environment variables per branch

### Branch Configuration

- `main` → Production deployment
- `develop` → Staging deployment (optional)
- Feature branches → Preview deployments

## Scaling Considerations

### Usage Limits

- **Vercel**: 100GB bandwidth/month (Hobby plan)
- **Netlify**: 100GB bandwidth/month (Free plan)
- **Roboflow**: Check API rate limits

### Performance Monitoring

- Monitor bundle size
- Track Core Web Vitals
- Monitor API response times
- Track error rates

## Support and Maintenance

### Regular Tasks

- Update dependencies monthly
- Monitor security advisories
- Review performance metrics
- Backup deployment configurations

### Version Management

- Use semantic versioning
- Tag releases in Git
- Maintain changelog
- Document breaking changes

For additional support, refer to the platform-specific documentation:
- [Vercel Documentation](https://vercel.com/docs)
- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Documentation](https://vitejs.dev/)