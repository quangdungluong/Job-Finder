from pathlib import Path

import yaml
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from src.authenticator import LinkedInAuthenticator
from src.job_manager import JobManager
from src.logger import logger
from src.utils import chrome_browser_options


class ConfigError(Exception):
    pass


class ConfigValidator:
    @staticmethod
    def validate_yaml_file(yaml_path: Path) -> dict:
        try:
            with open(yaml_path, "r") as stream:
                return yaml.safe_load(stream)
        except yaml.YAMLError as exc:
            raise ConfigError(f"Error reading file {yaml_path}: {exc}")
        except FileNotFoundError:
            raise ConfigError(f"File not found: {yaml_path}")

    @staticmethod
    def validate_secrets(secrets_yaml_path: Path) -> dict:
        secrets = ConfigValidator.validate_yaml_file(secrets_yaml_path)
        return secrets

    @staticmethod
    def validate_config(config_yaml_path: Path) -> dict:
        parameters = ConfigValidator.validate_yaml_file(config_yaml_path)
        required_keys = {
            "positions": list,
            "locations": list,
            "date": dict,
            "title_blacklist": list,
        }

        for key, expected_type in required_keys.items():
            if key not in parameters:
                if key in ["title_blacklist"]:
                    parameters[key] = []
                else:
                    raise ConfigError(
                        f"Missing or invalid key '{key}' in config file {config_yaml_path}"
                    )
            elif not isinstance(parameters[key], expected_type):
                if key in ["title_blacklist"] and parameters[key] is None:
                    parameters[key] = []
                raise ConfigError(
                    f"Invalid type for key '{key}' in config file {config_yaml_path}. Expected {expected_type}."
                )

        # Validate positions and locations as lists of strings
        if not all(isinstance(pos, str) for pos in parameters["positions"]):
            raise ConfigError(
                f"'positions' must be a list of strings in config file {config_yaml_path}"
            )
        if not all(isinstance(loc, str) for loc in parameters["locations"]):
            raise ConfigError(
                f"'locations' must be a list of strings in config file {config_yaml_path}"
            )

        # Validate date filters
        date_filters = ["all_time", "month", "week", "24_hours"]
        for date_filter in date_filters:
            if not isinstance(parameters["date"].get(date_filter), bool):
                raise ConfigError(
                    f"Date filter '{date_filter}' must be a boolean in config file {config_yaml_path}"
                )

        # Ensure blacklists are lists
        for blacklist in ["title_blacklist"]:
            if not isinstance(parameters.get(blacklist), list):
                raise ConfigError(
                    f"'{blacklist}' must be a list in config file {config_yaml_path}"
                )
            if parameters[blacklist] is None:
                parameters[blacklist] = []
        return parameters


def init_browser() -> webdriver.Chrome:
    try:
        options = chrome_browser_options()
        service = ChromeService(ChromeDriverManager().install())
        return webdriver.Chrome(service=service, options=options)
    except Exception as e:
        raise RuntimeError(f"Failed to initialize chrome browser: {e}")


def main():
    try:
        config_file = "./configs/work_preferences.yaml"
        secrets_file = "./configs/secrets.yaml"
        parameters = ConfigValidator.validate_config(config_file)
        secrets = ConfigValidator.validate_secrets(secrets_file)
        logger.info(parameters)
        # Init browser
        browser = init_browser()
        # Start login
        login_component = LinkedInAuthenticator(driver=browser)
        login_component.set_secrets(secrets["email"], secrets["password"])
        login_component.start()
        # Job manager
        job_manager = JobManager(browser)
        job_manager.set_parameters(parameters)
        job_manager.collecting_data()
        job_manager.retrieve_job_description()
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    main()
