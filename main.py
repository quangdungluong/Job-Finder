from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from src.authenticator import LinkedInAuthenticator
from src.job_manager import JobManager
from src.utils import chrome_browser_options


def init_browser() -> webdriver.Chrome:
    try:
        options = chrome_browser_options()
        service = ChromeService(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize chrome browser: {e}")


if __name__ == "__main__":
    browser = init_browser()
    login_component = LinkedInAuthenticator(driver=browser)
    # Start login
    login_component.start()
    job_manager = JobManager(browser)
    a = job_manager.collecting_data()
