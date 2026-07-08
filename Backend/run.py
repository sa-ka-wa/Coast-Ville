# Backend/run.py
from App import create_app
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from App.Services.SchedulerService import SchedulerService
import atexit
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = create_app()


def start_scheduler():
    """Start the background scheduler"""
    scheduler = BackgroundScheduler()

    # 1. Monthly rent generation on the 1st at 6:00 AM
    scheduler.add_job(
        func=SchedulerService.run_monthly_tasks,
        trigger=CronTrigger(day=1, hour=6, minute=0),
        id='monthly_tasks',
        name='Run monthly tasks on the 1st',
        replace_existing=True
    )
    logger.info("📅 Monthly rent generation scheduled for the 1st at 6:00 AM")

    # 2. Rent overdue check daily at 8:00 AM (after the 5th)
    scheduler.add_job(
        func=SchedulerService.check_overdue_payments,
        trigger=CronTrigger(hour=8, minute=0),
        id='overdue_check',
        name='Check overdue payments daily',
        replace_existing=True
    )
    logger.info("📱 Rent overdue check scheduled for daily at 8:00 AM")

    # 3. Send reading reminder to caretakers on the 23rd at 8:00 AM
    scheduler.add_job(
        func=SchedulerService.send_reading_reminders_to_caretakers,
        trigger=CronTrigger(day=23, hour=8, minute=0),
        id='reading_reminders',
        name='Send reading reminders to caretakers on the 23rd',
        replace_existing=True
    )
    logger.info("💧 Reading reminders to caretakers scheduled for the 23rd at 8:00 AM")

    # 4. Generate water bills on the 25th at 6:00 PM (after readings taken)
    scheduler.add_job(
        func=SchedulerService.generate_monthly_water_bills,
        trigger=CronTrigger(day=25, hour=18, minute=0),
        id='water_bills',
        name='Generate water bills on the 25th',
        replace_existing=True
    )
    logger.info("💧 Water bill generation scheduled for the 25th at 6:00 PM")

    # 5. Generate estimated bills on the 30th at 6:00 PM
    scheduler.add_job(
        func=SchedulerService.generate_estimated_water_bills,
        trigger=CronTrigger(day=30, hour=18, minute=0),
        id='estimated_bills',
        name='Generate estimated water bills on the 30th',
        replace_existing=True
    )
    logger.info("📊 Estimated water bills scheduled for the 30th at 6:00 PM")

    # Start the scheduler
    scheduler.start()
    logger.info("✅ Scheduler started successfully!")

    # Shut down scheduler when exiting
    atexit.register(lambda: scheduler.shutdown())

    return scheduler


# Start scheduler
scheduler = start_scheduler()

if __name__ == '__main__':
    app.run(debug=True, port=5555, host='0.0.0.0')