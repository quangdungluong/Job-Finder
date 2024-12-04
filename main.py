from pathlib import Path

import yaml
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager

from src.authenticator import LinkedInAuthenticator
from src.job_manager import JobManager
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
    def validate_config(config_yaml_path: Path) -> dict:
        parameters = ConfigValidator.validate_yaml_file(config_yaml_path)
        required_keys = {
            "positions": list,
        }

        for key, expected_type in required_keys.items():
            if key not in parameters:
                raise ConfigError(
                    f"Missing or invalid key '{key}' in config file {config_yaml_path}"
                )
            elif not isinstance(parameters[key], expected_type):
                raise ConfigError(
                    f"Invalid type for key '{key}' in config file {config_yaml_path}. Expected {expected_type}."
                )

        # Validate positions and locations as lists of strings
        if not all(isinstance(pos, str) for pos in parameters["positions"]):
            raise ConfigError(
                f"'positions' must be a list of strings in config file {config_yaml_path}"
            )

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
        parameters = ConfigValidator.validate_config(config_file)
        print(parameters)
        browser = init_browser()
        login_component = LinkedInAuthenticator(driver=browser)
        # Start login
        login_component.start()
        job_manager = JobManager(browser)
        job_manager.set_parameters(parameters)
        job_manager.collecting_data()
        job_manager.retrieve_job_description()
    except Exception as e:
        print(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    main()
