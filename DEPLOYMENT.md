# 🚀 Deployment Guide for Ubuntu

This guide will help you deploy the Prediction Market Application on an Ubuntu machine using Docker.

## 📋 Prerequisites

- Ubuntu 18.04 or later
- Docker installed
- Docker Compose installed
- Git (optional, for cloning the repository)

## 🔧 Installation Steps

### 1. Install Docker (if not already installed)

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# Add your user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

### 2. Install Docker Compose

```bash
# Download Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 3. Clone or Download the Application

```bash
# If using Git
git clone <repository-url>
cd PREDICTION_MARKET_POC

# Or download and extract the files manually
```

### 4. Configure Environment Variables

Edit the `.env` file with your API keys:

```bash
nano .env
```

```env
# API Keys (replace with your actual keys)
GUARDIAN_API_KEY=your_guardian_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Environment
NODE_ENV=production
PORT=3001
```

### 5. Deploy the Application

#### Option A: Using the deployment script (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

#### Option B: Manual deployment

```bash
# Build and start the application
docker-compose up --build -d

# Check if it's running
docker-compose ps
```

## 🌐 Accessing the Application

Once deployed, you can access the application at:

- **Web Interface**: http://localhost:3001
- **API Endpoint**: http://localhost:3001/api/markets
- **Scrape Endpoint**: http://localhost:3001/api/scrape

## 📊 Useful Commands

```bash
# View application logs
docker-compose logs -f

# Stop the application
docker-compose down

# Restart the application
docker-compose restart

# Update the application
./deploy.sh

# Check container status
docker-compose ps

# Access container shell
docker-compose exec prediction-market-app bash
```

## 🔍 Troubleshooting

### Application won't start

```bash
# Check logs
docker-compose logs

# Check if port 3001 is available
sudo netstat -tlnp | grep :3001

# Restart Docker service
sudo systemctl restart docker
```

### Permission issues

```bash
# Add user to docker group (if not done already)
sudo usermod -aG docker $USER

# Log out and log back in, or run:
newgrp docker
```

### Memory issues with Puppeteer

The application uses Puppeteer for web scraping. If you encounter memory issues:

```bash
# Increase Docker memory limit
# Edit docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 2G
```

## 🔒 Security Considerations

- The application runs as a non-root user inside the container
- API keys are stored in environment variables
- The application is isolated in a Docker container
- Consider using a reverse proxy (nginx) for production deployments

## 📈 Production Deployment

For production deployment, consider:

1. **Reverse Proxy**: Use nginx or Apache as a reverse proxy
2. **SSL/TLS**: Configure HTTPS certificates
3. **Monitoring**: Set up application monitoring
4. **Backup**: Regular backups of the data files
5. **Updates**: Regular security updates

## 🆘 Support

If you encounter any issues:

1. Check the application logs: `docker-compose logs -f`
2. Verify Docker and Docker Compose are properly installed
3. Ensure all required ports are available
4. Check that API keys are correctly configured 