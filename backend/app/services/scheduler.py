import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from .backup import create_backup
from ..database import SessionLocal
from ..models import SystemSetting

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = BackgroundScheduler()

def run_automated_backup():
    """
    The actual task that runs when the schedule is fired.
    """
    logger.info("Starting automated daily database backup...")
    try:
        filename = create_backup()
        logger.info(f"Automated backup completed successfully: {filename}")
    except Exception as e:
        logger.error(f"Automated backup failed: {e}")

def init_scheduler():
    """
    Starts the scheduler and registers the backup task based on the current database time setting.
    If no setting exists, defaults to 03:00 AM.
    """
    # Don't start twice
    if scheduler.running:
        return
        
    scheduler.start()
    update_backup_schedule() # Load the schedule from the DB

def update_backup_schedule(hour=None, minute=None, is_enabled=None):
    """
    Updates the APScheduler cron job based on DB settings or passed arguments.
    """
    job_id = "daily_db_backup"
    
    # Read from DB if not provided directly
    db = SessionLocal()
    try:
        if is_enabled is None:
            enabled_setting = db.query(SystemSetting).filter(SystemSetting.key == "backup_enabled").first()
            is_enabled = enabled_setting.value == "1" if enabled_setting else True
            
        if hour is None or minute is None:
            time_setting = db.query(SystemSetting).filter(SystemSetting.key == "backup_time").first()
            if time_setting and ":" in time_setting.value:
                h, m = time_setting.value.split(":")
                hour, minute = int(h), int(m)
            else:
                hour, minute = 3, 0 # Default 03:00 AM
    finally:
        db.close()

    # Remove existing job if it exists
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)

    # Schedule new job if enabled
    if is_enabled:
        scheduler.add_job(
            run_automated_backup,
            CronTrigger(hour=hour, minute=minute),
            id=job_id,
            replace_existing=True
        )
        logger.info(f"Scheduled database backup for {hour:02d}:{minute:02d}")
    else:
        logger.info("Database automated backups are disabled.")

