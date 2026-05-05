# CleanSage weekly scan — Sunday 7:30AM IST (2:00 UTC)
# Place at: /etc/cron.d/cleansage
# Owner: root, mode: 644

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

0 2 * * 0 cleansage cd /home/cleansage/cleansage && venv/bin/python cron_scan.py >> logs/cron.log 2>&1
