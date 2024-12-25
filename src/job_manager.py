import json
import time
import traceback
import urllib
import urllib.parse
from itertools import product
from pathlib import Path
from typing import Dict, List
from urllib.parse import urlparse

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from tqdm import tqdm

from src.job import Job
from src.logger import logger
from src.models import JobListing, session
from src.regex_utils import generate_regex_patterns_for_blacklisting
from src.utils import scroll_slow


class JobManager:
    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver

    def set_parameters(self, parameters: Dict):
        logger.info("Setting parameters")
        self.positions: List = parameters.get("positions", [])
        self.locations: List = parameters.get("locations", [])
        self.title_blacklist: List = parameters.get("title_blacklist", [])
        self.base_search_url = self.get_base_search_url(parameters)

        self.title_blacklist_patterns = generate_regex_patterns_for_blacklisting(
            self.title_blacklist
        )

    def get_base_search_url(self, parameters: Dict):
        url_parts = []
        # Sort by date
        url_parts.append("sortBy=DD")
        date_mapping = {
            "all_time": "",
            "month": "&f_TPR=r2592000",
            "week": "&f_TPR=r604800",
            "24_hours": "&f_TPR=r86400",
        }
        date_param = next(
            (v for k, v in date_mapping.items() if parameters.get("date", {}).get(k)),
            "",
        )
        base_url = "&".join(url_parts)
        full_url = f"?{base_url}{date_param}"
        return full_url

    def retrieve_job_description(self):
        job_records = session.query(JobListing).filter_by(description="").all()
        for job_record in tqdm(job_records):
            job = Job(link=job_record.url)
            job_description = self._get_job_description(job)
            try:
                job_record.description = job_description
                session.commit()
            except Exception as e:
                logger.error(e)
                session.rollback()

    def collecting_data(self):
        searches = list(product(self.positions, self.locations))
        job_list: List[Job] = []
        for position, location in searches:
            try:
                location_url = "&location=" + location
                job_page_number = -1
                while True:
                    job_page_number += 1
                    self.next_job_page(position, location_url, job_page_number)
                    logger.info("Starting the collecting process for this page.")
                    time.sleep(2)
                    job_list.extend(self.read_jobs(is_scroll=True))
            except Exception as e:
                logger.error(e)
                pass

        logger.info(f"Number of extracted jobs: {len(job_list)}")
        for job in tqdm(job_list):
            self.save_job_to_db(job, description=False)

    def get_job_id(self, job_link: str):
        parsed_url = urlparse(job_link)
        path_segments = parsed_url.path.split("/")
        if "jobs" in path_segments and "view" in path_segments:
            job_id = path_segments[path_segments.index("view") + 1]
            return job_id
        return ""

    def save_job_to_db(self, job: Job, description: bool = False):
        try:
            if job.link == "":
                return

            linkedin_job_id = self.get_job_id(job.link)
            existing_job = (
                session.query(JobListing)
                .filter_by(linkedin_job_id=linkedin_job_id)
                .first()
            )
            if existing_job:
                return

            if description:
                job_description = self._get_job_description(job)
                job.set_job_description(job_description)

            job_listing = JobListing(
                linkedin_job_id=linkedin_job_id,
                title=job.title,
                description=job.description,
                location=job.location,
                company=job.company,
                url=job.link,
            )
            session.add(job_listing)
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error saving job: {e}")
        except Exception as e:
            self.write_to_file(job, "failed")
            return

    def next_job_page(self, position, location, job_page):
        encoded_position = urllib.parse.quote(position)
        url = f"https://www.linkedin.com/jobs/search/{self.base_search_url}&keywords={encoded_position}{location}&start={job_page*25}"
        logger.info(f"Current Job Page: {url}")
        self.driver.get(url)

    def read_jobs(self, is_scroll=False):
        try:
            no_jobs_element = self.driver.find_element(
                By.CLASS_NAME, "jobs-search-two-pane__no-results-banner--expand"
            )
            if "No matching jobs found" in no_jobs_element.text:
                raise Exception("No more jobs on this page")
        except NoSuchElementException:
            pass

        # XPath query to find the div tag with class jobs-search-results-list__pagination
        pagination_xpath_query = (
            "//div[contains(@class, 'jobs-search-results-list__pagination')]"
        )
        jobs_pagination = self.driver.find_element(By.XPATH, pagination_xpath_query)
        jobs_container_scrollableElement = jobs_pagination.find_element(By.XPATH, "..")

        if is_scroll:
            scroll_slow(self.driver, jobs_container_scrollableElement)
            # Disable scroll reverse for faster read jobs
            # scroll_slow(
            #     self.driver, jobs_container_scrollableElement, step=300, reverse=True
            # )

        jobs_container = self.driver.find_element(
            By.CLASS_NAME, "scaffold-layout__list "
        )
        job_list_elements = jobs_container.find_elements(
            By.XPATH,
            ".//li[contains(@class, 'scaffold-layout__list-item') and contains(@class, 'ember-view')]",
        )
        if not job_list_elements:
            raise Exception("No job class elements found on page.")
        logger.info(f"Number of job in this page: {len(job_list_elements)}")

        job_list = [
            self.extract_job_information_from_tile(job_element)
            for job_element in job_list_elements
        ]
        return job_list

    def extract_job_information_from_tile(self, job_tile: WebElement):
        job = Job()
        try:
            job.title = (
                job_tile.find_element(
                    By.XPATH,
                    ".//div[contains(@class, 'artdeco-entity-lockup__title')]//span",
                )
                .find_element(By.TAG_NAME, "strong")
                .text
            )
            logger.info(job.title)
        except NoSuchElementException:
            logger.warning("Job title is missing.")

        try:
            job.link = (
                job_tile.find_element(
                    By.XPATH,
                    ".//div[contains(@class, 'artdeco-entity-lockup__title')]",
                )
                .find_element(
                    By.XPATH, ".//a[contains(@class, 'job-card-list__title--link')]"
                )
                .get_attribute("href")
                .split("?")[0]
            )
            logger.info(job.link)
        except NoSuchElementException:
            logger.warning("Job link is missing.")

        try:
            job.company = job_tile.find_element(
                By.XPATH,
                ".//div[contains(@class, 'artdeco-entity-lockup__subtitle')]//span",
            ).text
            logger.info(job.company)
        except NoSuchElementException:
            logger.warning("Job company is missing.")

        try:
            job.location = job_tile.find_element(
                By.XPATH,
                ".//div[contains(@class, 'artdeco-entity-lockup__caption')]//span",
            ).text
            logger.info(job.location)
        except NoSuchElementException:
            logger.warning("Job location is missing")

        return job

    def _get_job_description(self, job: Job) -> str:
        try:
            self.driver.get(job.link)
        except Exception as e:
            logger.error(e)
            raise

        try:
            try:
                see_more_button = self.driver.find_element(
                    By.XPATH, '//button[@aria-label="Click to see more description"]'
                )
                actions = ActionChains(self.driver)
                actions.move_to_element(see_more_button).click().perform()
                time.sleep(2)
            except NoSuchElementException:
                logger.warning("See more button not found, skipping.")
                return

            try:
                description = self.driver.find_element(
                    By.CLASS_NAME, "jobs-description-content__text--stretch"
                ).get_property("innerText")
            except NoSuchElementException:
                description = self.driver.find_element(
                    By.CLASS_NAME, "job-details-about-the-job-module__description"
                ).get_property("innerText")
            return description
        except NoSuchElementException:
            tb_str = traceback.format_exc()
            raise Exception(f"Job Description not found:\nTraceback:\n{tb_str}")
        except Exception:
            tb_str = traceback.format_exc()
            # raise Exception(f"Error getting Job Description:\nTraceback:\b{tb_str}")
            logger.error(f"Error getting Job Description:\nTraceback:\b{tb_str}")
            pass

    def write_to_file(self, job: Job, file_name: str):
        data = {
            "company": job.company,
            "job_title": job.title,
            "link": job.link,
            "job_recruiter": job.recruiter_link,
            "job_location": job.location,
            "job_description": job.description,
        }
        file_path = Path(f"./assets/{file_name}.json")
        if not file_path.exists():
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump([data], f, indent=4)
        else:
            with open(file_path, "r+", encoding="utf-8") as f:
                try:
                    existing_data = json.load(f)
                except json.JSONDecodeError:
                    existing_data = []
                existing_data.append(data)
                f.seek(0)
                json.dump(existing_data, f, indent=4)
                f.truncate()
