#!/bin/bash

###############################################################################
# Hosting Portal - Setup Automated Updates
# Run this once to configure automatic updates via cron
###############################################################################

PROJECT_DIR="/opt/hosting-portal"
DEPLOY_SCRIPT="${PROJECT_DIR}/deploy.sh"
CRON_LOG="/var/log/hosting-portal-update.log"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Hosting Portal - Setup Automated Updates                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if deploy.sh exists
if [ ! -f "$DEPLOY_SCRIPT" ]; then
    echo "✗ Error: deploy.sh not found at $DEPLOY_SCRIPT"
    echo "  Make sure you're in the hosting-portal directory"
    exit 1
fi

# Make deploy.sh executable
chmod +x "$DEPLOY_SCRIPT"
echo "✓ Made deploy.sh executable"

# Create log file
touch "$CRON_LOG"
chmod 666 "$CRON_LOG"
echo "✓ Created log file: $CRON_LOG"

# Show current cron jobs
echo ""
echo "Current cron jobs:"
crontab -l 2>/dev/null | grep -i "hosting\|deploy" || echo "  (none found)"

# Ask for update schedule
echo ""
echo "Select update schedule:"
echo "  1) Daily at 2:00 AM"
echo "  2) Daily at 3:00 AM"
echo "  3) Weekly (Sunday 2:00 AM)"
echo "  4) Twice daily (2:00 AM and 2:00 PM)"
echo "  5) Manual only (no cron)"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 2 * * *"
        SCHEDULE_DESC="Daily at 2:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 3 * * *"
        SCHEDULE_DESC="Daily at 3:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 2 * * 0"
        SCHEDULE_DESC="Weekly (Sunday 2:00 AM)"
        ;;
    4)
        CRON_SCHEDULE="0 2,14 * * *"
        SCHEDULE_DESC="Twice daily (2:00 AM and 2:00 PM)"
        ;;
    5)
        echo ""
        echo "✓ Cron job not configured (manual updates only)"
        echo ""
        echo "To manually update, run:"
        echo "  cd $PROJECT_DIR"
        echo "  ./deploy.sh --backup"
        exit 0
        ;;
    *)
        echo "✗ Invalid choice"
        exit 1
        ;;
esac

# Ask for backup option
echo ""
read -p "Create backup before each update? (y/n): " backup_choice
if [[ $backup_choice == "y" || $backup_choice == "Y" ]]; then
    BACKUP_FLAG="--backup"
else
    BACKUP_FLAG=""
fi

# Create cron job
CRON_COMMAND="$CRON_SCHEDULE cd $PROJECT_DIR && ./deploy.sh $BACKUP_FLAG >> $CRON_LOG 2>&1"

# Get existing crontab
TEMP_CRON=$(mktemp)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Add new cron job
echo "$CRON_COMMAND" >> "$TEMP_CRON"

# Install updated crontab
crontab "$TEMP_CRON"
rm "$TEMP_CRON"

echo ""
echo "✓ Cron job configured successfully!"
echo "  Schedule: $SCHEDULE_DESC"
echo "  Command: $DEPLOY_SCRIPT $BACKUP_FLAG"
echo "  Logs: $CRON_LOG"
echo ""
echo "To view cron jobs:"
echo "  crontab -l"
echo ""
echo "To view update logs:"
echo "  tail -f $CRON_LOG"
echo ""
echo "To remove cron job:"
echo "  crontab -e  (and delete the hosting-portal line)"
echo ""
