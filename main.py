import re
import time
from datetime import datetime

import cloudscraper
import schedule
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from src.authenticator import LinkedInAuthenticator
from src.config_validator import ConfigValidator
from src.itviec_job_manager import ITViecJobManager
from src.job_manager import JobManager
from src.logger import logger
from src.topcv_job_manager import TopCVJobManager
from src.utils import chrome_browser_options


def init_browser() -> webdriver.Chrome:
    try:
        options = chrome_browser_options()
        service = ChromeService(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize chrome browser: {e}")


def run_job_crawler():
    try:
        logger.info(f"Starting job crawler at {datetime.now()}")
        config_file = "./configs/work_preferences.yaml"
        secrets_file = "./configs/secrets.yaml"
        parameters = ConfigValidator.validate_config(config_file)
        secrets = ConfigValidator.validate_secrets(secrets_file)
        logger.info(parameters)

        if "LinkedIn" in parameters["job_sources"]:
            # Init browser
            browser = init_browser()
            try:
                # Start login
                login_component = LinkedInAuthenticator(driver=browser)
                login_component.set_secrets(secrets["email"], secrets["password"])
                login_component.start()
                # Job manager
                job_manager = JobManager(browser)
                job_manager.set_parameters(parameters)
                job_manager.collecting_data()
                job_manager.retrieve_job_description()
            finally:
                browser.quit()

        if "ITViec" in parameters["job_sources"]:
            scraper = cloudscraper.create_scraper()
            job_manager = ITViecJobManager(scraper)
            job_manager.set_parameters(parameters)
            job_manager.collecting_data()
            job_manager.retrieve_job_details()

        if "TopCV" in parameters["job_sources"]:
            scraper = cloudscraper.create_scraper()
            job_manager = TopCVJobManager(scraper)
            job_manager.set_parameters(parameters)
            job_manager.collecting_data()
            job_manager.retrieve_job_details()

    except Exception as e:
        error_message = f"An unexpected error occurred: {e}"
        logger.error(error_message)


def schedule_job_crawler():
    # Schedule the job to run every 24 hours
    schedule.every(24).hours.do(run_job_crawler)

    # Run the job immediately when starting
    run_job_crawler()

    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    schedule_job_crawler()
