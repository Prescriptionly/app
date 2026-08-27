#!/bin/bash
set -e

# Color helpers
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Prescriptionly Deployment Script     ${NC}"
echo -e "${GREEN}========================================${NC}"

# Check for .env file
if [ ! -f .env ]; then
  if [ -f .env.production ]; then
    echo -e "${YELLOW}ℹ️  Copying .env.production to .env...${NC}"
    cp .env.production .env
  elif [ -f .env.example ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}⚠️  Please configure your DATABASE_URL and SESSION_SECRET in .env before running.${NC}"
  else
    echo -e "${RED}❌ No .env or .env.example found!${NC}"
    exit 1
  fi
fi

# Build and start the container with Docker Compose
echo -e "${GREEN}📦 Building and starting Prescriptionly container...${NC}"
docker compose up -d --build

echo -e "${GREEN}✅ Application deployed successfully!${NC}"
echo -e "👉 Container status:"
docker compose ps
