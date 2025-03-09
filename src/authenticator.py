import getpass
import time
from abc import ABC, abstractmethod

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.wait import WebDriverWait

from src.logger import logger


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

    @abstractmethod
    def handle_login(self):
        pass

    def prompt_for_credentials(self):
        try:
            check_interval = 4
            while True:
                current_window = self.driver.current_window_handle
                self.driver.switch_to.window(current_window)
                if self.is_logged_in:
                    logger.info("Login successful, redirected to feed page")
                    break
                else:
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_all_elements_located((By.ID, "password"))
                    )

                time.sleep(check_interval)

        except TimeoutException:
            logger.error("Login form not found. Aborting login.")

    @abstractmethod
    def handle_security_checks(self):
        pass

    @abstractmethod
    def enter_credentials(self):
        pass

    @abstractmethod
    def submit_login_form(self):
        pass

    def start(self):
        self.driver.get(self.home_url)
        if self.is_logged_in:
            logger.info("Skip login process.")
            return
        else:
            logger.info("Proceeding with login")
            self.handle_login()


class LinkedInAuthenticator(Authenticator):
    @property
    def home_url(self):
        return "https://www.linkedin.com"

    def set_secrets(self, email, password):
        self.email = email
        self.password = password

    def navigate_to_login(self):
        return self.driver.get("https://www.linkedin.com/login")

    def handle_login(self):
        try:
            self.navigate_to_login()
            if len(self.email) and len(self.password):
                self.enter_credentials()
                self.submit_login_form()
            else:
                self.prompt_for_credentials()
        except Exception as e:
            logger.error(e)
        self.handle_security_checks()

    def complete_checkpoint_challenge(self):
        verification_code = getpass.getpass("Please input the verification code:")
        verification_code_field = self.driver.find_element(
            By.ID, "input__email_verification_pin"
        )
        verification_code_field.send_keys(verification_code)
        submit_button = self.driver.find_element(By.XPATH, '//button[@type="submit"]')
        submit_button.click()

    def handle_security_checks(self):
        try:
            WebDriverWait(self.driver, 10).until(
                EC.url_contains("https://www.linkedin.com/checkpoint/challenge")
            )
            logger.info("Security checkpoint detected. Please complete the challenge.")
            self.complete_checkpoint_challenge()
        except TimeoutException:
            logger.info("Security checkpoint not found")

        try:
            WebDriverWait(self.driver, 300).until(
                EC.url_contains("https://www.linkedin.com/feed")
            )
        except TimeoutException:
            logger.error("Please try again later.")

    def enter_credentials(self):
        """Enter the user's email and password into the login form."""
        try:
            email_field = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "username"))
            )
            email_field.send_keys(self.email)
            password_field = self.driver.find_element(By.ID, "password")
            password_field.send_keys(self.password)
        except TimeoutException:
            logger.error("Login form not found. Aborting login.")

    def submit_login_form(self):
        """Submit the LinkedIn login form."""
        try:
            login_button = self.driver.find_element(
                By.XPATH, '//button[@type="submit"]'
            )
            login_button.click()
        except NoSuchElementException:
            logger.error("Login button not found. Please verify the page structure.")

    @property
    def is_logged_in(self):
        keywords = ["feed"]
        return (
            any(item in self.driver.current_url for item in keywords)
            and "linkedin.com" in self.driver.current_url
        )

    def __init__(self, driver):
        super().__init__(driver)
        self.email = ""
        self.password = ""
