#!/bin/bash

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql -c "CREATE DATABASE investment_dashboard;"
sudo -u postgres psql -c "CREATE USER dashboard_user WITH PASSWORD 'your_password_here';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE investment_dashboard TO dashboard_user;"

# Install project dependencies
npm install

# Build the project
npm run build

# Start the application with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list and configure to start on system startup
pm2 save
pm2 startup 