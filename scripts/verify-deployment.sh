#!/bin/bash

# BinarJoin Deployment Verification Script
# This script checks for hardcoded URLs and incorrect port configurations.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 Starting BinarJoin Deployment Verification...${NC}"
echo "--------------------------------------------------"

ISSUES_FOUND=0

check_pattern() {
    local pattern=$1
    local description=$2
    local exclude_pattern=$3
    
    echo -e "Checking for ${description}..."
    if [ -n "$exclude_pattern" ]; then
        MATCHES=$(grep -rE "$pattern" . --exclude-dir={node_modules,dist,.git,android} --exclude="verify-deployment.sh" | grep -vE "$exclude_pattern")
    else
        MATCHES=$(grep -rE "$pattern" . --exclude-dir={node_modules,dist,.git,android} --exclude="verify-deployment.sh")
    fi

    if [ -n "$MATCHES" ]; then
        echo -e "${RED}❌ Found potential issues:${NC}"
        echo "$MATCHES"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
        echo -e "${GREEN}✅ No issues found.${NC}"
    fi
    echo "--------------------------------------------------"
}

# 1. Check for hardcoded Replit domains
check_pattern "replit\.dev|repl\.co|sisko\.replit" "Hardcoded Replit domains"

# 2. Check for hardcoded localhost/127.0.0.1 with port 5000 in source files
check_pattern "localhost:5000|127\.0\.0\.1:5000" "Hardcoded local Replit ports"

# 3. Check for hardcoded IP addresses (except the production server if needed)
check_pattern "[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}" "Hardcoded IP addresses" "93\.127\.142\.144"

# 4. Check for hardcoded Port 5000 assignments in server code
check_pattern "PORT\s*=\s*5000" "Hardcoded PORT=5000"

# 5. Check if DOMAIN variable is correctly used in email service
echo -e "Checking email-service.ts logic..."
if grep -q "process.env.DOMAIN || 'app2.binarjoinanelytic.info'" server/services/email-service.ts; then
    echo -e "${GREEN}✅ Email service uses dynamic domain.${NC}"
else
    echo -e "${RED}❌ Email service might still have fallback issues.${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi
echo "--------------------------------------------------"

if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✨ Verification Complete: No critical issues found!${NC}"
    exit 0
else
    echo -e "${RED}⚠️ Verification Complete: Found $ISSUES_FOUND potential issues.${NC}"
    exit 1
fi
