import time
from abc import ABC, abstractmethod

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait


class Authenticator(ABC):
    @property
    def home_url(self):
        pass

    @abstractmethod
    def navigate_to_login(self):
        pass

    @property
    def is_logged_in(self):
        pass

    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver

    def handle_login(self):
        try:
            self.navigate_to_login()
            self.prompt_for_credentials()
        except Exception as e:
            print(e)
        self.handle_security_checks()

    def prompt_for_credentials(self):
        try:
            check_interval = 4
            while True:
                current_window = self.driver.current_window_handle
                self.driver.switch_to.window(current_window)
                if self.is_logged_in:
                    print("Login successful, redirected to feed page")
                    break
                else:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_all_elements_located((By.ID, "password"))
                    )

                time.sleep(check_interval)

        except TimeoutException:
            print("Login form not found. Aborting login.")

    @abstractmethod
    def handle_security_checks(self):
        pass

    def start(self):
        self.driver.get(self.home_url)
        if self.is_logged_in:
            print("Skip login process.")
            return
        else:
            print("Proceeding with login")
            self.handle_login()


class LinkedInAuthenticator(Authenticator):

    @property
    def home_url(self):
        return "https://www.linkedin.com"

    def navigate_to_login(self):
        return self.driver.get("https://www.linkedin.com/login")

    def handle_security_checks(self):
        try:
            WebDriverWait(self.driver, 10).until(
                EC.url_contains("https://www.linkedin.com/checkpoint/challengesV2")
            )
            WebDriverWait(self.driver, 30).until(
                EC.url_contains("https://linkedin.com/feed")
            )
        except TimeoutException:
            print("Please try again later.")

    @property
    def is_logged_in(self):
        keywords = ["feed"]
        return (
            any(item in self.driver.current_url for item in keywords)
            and "linkedin.com" in self.driver.current_url
        )

    def __init__(self, driver):
        super().__init__(driver)
