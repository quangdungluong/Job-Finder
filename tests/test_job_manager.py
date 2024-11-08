import os
import sys

from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

sys.path.insert(0, os.getcwd())
from src.job import Job
from src.job_manager import JobManager
from src.utils import chrome_browser_options


def init_browser() -> webdriver.Chrome:
    try:
        options = chrome_browser_options()
        service = ChromeService(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize chrome browser: {e}")


def test_get_job_description():
    browser = init_browser()
    job_manager = JobManager(browser)
    job = Job(
        title="",
        company="",
        location="",
        link="https://www.linkedin.com/jobs/view/4046135314/",
    )
    description = job_manager._get_job_description(job)
    print(description)
    assert description != "", "Error"
