#!/bin/bash

###############################################################################
# Hosting Portal - Update & Deploy Script for Debian
# Usage: ./deploy.sh [--backup] [--logs]
# 
# This script:
# - Pulls latest images
# - Updates docker-compose services
# - Preserves database
# - Creates backups (optional)
# - Logs all changes
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/opt/hosting-portal"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_FILE="${PROJECT_DIR}/deployment.log"
COMPOSE_FILE="${PROJECT_DIR}/docker-compose.yml"
DB_FILE="${PROJECT_DIR}/backend/data/hosting.db"

# Flags
BACKUP=false
SHOW_LOGS=false
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backup)
            BACKUP=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--backup] [--logs] [--verbose]"
            exit 1
            ;;
    esac
done

###############################################################################
# Functions
###############################################################################

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "$LOG_FILE"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  $1"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_requirements() {
    print_header "Checking Requirements"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    print_success "Docker installed: $(docker --version)"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    print_success "Docker Compose installed: $(docker-compose --version)"
    
    # Check project directory
    if [ ! -d "$PROJECT_DIR" ]; then
        print_error "Project directory not found: $PROJECT_DIR"
        exit 1
    fi
    print_success "Project directory exists: $PROJECT_DIR"
    
    # Check docker-compose.yml
    if [ ! -f "$COMPOSE_FILE" ]; then
        print_error "docker-compose.yml not found: $COMPOSE_FILE"
        exit 1
    fi
    print_success "docker-compose.yml found"
}

create_backup() {
    if [ "$BACKUP" = false ]; then
        return
    fi
    
    print_header "Creating Backup"
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if [ -f "$DB_FILE" ]; then
        local backup_name="hosting.db.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$DB_FILE" "${BACKUP_DIR}/${backup_name}"
        print_success "Database backup created: $backup_name"
        log "INFO" "Database backup created: $backup_name"
    else
        print_warning "Database file not found, skipping database backup"
    fi
    
    # Backup docker-compose.yml
    cp "$COMPOSE_FILE" "${BACKUP_DIR}/docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "docker-compose.yml backed up"
    
    # Keep only last 10 backups
    cd "$BACKUP_DIR"
    ls -t | tail -n +11 | xargs -r rm
    print_success "Cleanup: Keeping only last 10 backups"
    cd "$PROJECT_DIR"
}

pull_images() {
    print_header "Pulling Latest Images"
    
    cd "$PROJECT_DIR"
    
    log "INFO" "Starting image pull..."
    
    # Pull all images
    docker-compose pull
    
    if [ $? -eq 0 ]; then
        print_success "Images pulled successfully"
        log "INFO" "Images pulled successfully"
    else
        print_error "Failed to pull images"
        log "ERROR" "Failed to pull images"
        exit 1
    fi
}

stop_services() {
    print_header "Stopping Services"
    
    cd "$PROJECT_DIR"
    
    log "INFO" "Stopping docker-compose services..."
    docker-compose down
    
    print_success "Services stopped"
    log "INFO" "Services stopped"
    
    # Wait a bit for graceful shutdown
    sleep 2
}

start_services() {
    print_header "Starting Services"
    
    cd "$PROJECT_DIR"
    
    log "INFO" "Starting docker-compose services..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        print_success "Services started"
        log "INFO" "Services started successfully"
    else
        print_error "Failed to start services"
        log "ERROR" "Failed to start services"
        exit 1
    fi
}

wait_for_health() {
    print_header "Waiting for Services to be Healthy"
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "healthy"; then
            print_success "Services are healthy"
            log "INFO" "Services are healthy"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_warning "Services may not be fully healthy yet, continuing..."
    log "WARNING" "Services may not be fully healthy after timeout"
}

verify_deployment() {
    print_header "Verifying Deployment"
    
    cd "$PROJECT_DIR"
    
    # Check if containers are running
    local running=$(docker-compose ps | grep -c "Up" || true)
    
    if [ $running -ge 2 ]; then
        print_success "All containers are running"
        log "INFO" "All containers are running"
    else
        print_warning "Some containers may not be running"
        log "WARNING" "Some containers may not be running"
    fi
    
    # Test API health
    if curl -s http://localhost:3001/api/health | grep -q "ok"; then
        print_success "Backend API is healthy"
        log "INFO" "Backend API is healthy"
    else
        print_warning "Could not verify backend API health"
        log "WARNING" "Could not verify backend API health"
    fi
}

show_status() {
    print_header "Current Status"
    
    cd "$PROJECT_DIR"
    
    echo -e "${BLUE}Docker-Compose Services:${NC}"
    docker-compose ps
    
    echo ""
    echo -e "${BLUE}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"
    
    echo ""
    echo -e "${BLUE}Recent Logs (last 20 lines):${NC}"
    docker-compose logs --tail=20
}

show_deployment_log() {
    if [ "$SHOW_LOGS" = true ] && [ -f "$LOG_FILE" ]; then
        print_header "Deployment Log"
        cat "$LOG_FILE"
    fi
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header "Hosting Portal - Update & Deploy Script"
    
    log "INFO" "=== Deployment Started ==="
    log "INFO" "Project Directory: $PROJECT_DIR"
    log "INFO" "Backup Mode: $BACKUP"
    
    # Step 1: Check requirements
    check_requirements
    
    # Step 2: Create backup (optional)
    if [ "$BACKUP" = true ]; then
        create_backup
    fi
    
    # Step 3: Pull latest images
    pull_images
    
    # Step 4: Stop current services
    stop_services
    
    # Step 5: Start new services
    start_services
    
    # Step 6: Wait for services to be healthy
    wait_for_health
    
    # Step 7: Verify deployment
    verify_deployment
    
    # Step 8: Show status
    show_status
    
    # Step 9: Show deployment log if requested
    show_deployment_log
    
    print_header "Deployment Completed Successfully!"
    
    log "INFO" "=== Deployment Completed ==="
    
    echo ""
    echo -e "${GREEN}Next steps:${NC}"
    echo "  1. Access the portal: http://localhost:3000"
    echo "  2. Check logs: docker-compose logs -f"
    echo "  3. View deployment log: $LOG_FILE"
    echo ""
}

# Run main function
main
