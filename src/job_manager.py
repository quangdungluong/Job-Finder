import json
import time
import traceback
import urllib
import urllib.parse
from pathlib import Path
from typing import Dict, List

from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webelement import WebElement
from tqdm import tqdm

from src.job import Job
from src.utils import scroll_slow
from src.models import session, JobListing
from urllib.parse import urlparse


class JobManager:
    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver

    def set_parameters(self, parameters: Dict):
        print("Setting parameters")
        self.positions: List = parameters.get("positions", [])

    def collecting_data(self):
        location = "Vietnam"
        job_list: List[Job] = []
        for position in self.positions:
            try:
                location_url = "&location=" + location
                job_page_number = -1
                while True:
                    job_page_number += 1
                    self.next_job_page(position, location_url, job_page_number)
                    print("Starting the collecting process for this page.")
                    time.sleep(2)
                    job_list.extend(self.read_jobs())
            except Exception as e:
                print(e)
                pass

        print(f"Number of extracted jobs: {len(job_list)}")
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
                print(f"Error saving job: {e}")
        except Exception as e:
            self.write_to_file(job, "failed")
            return

    def next_job_page(self, position, location, job_page):
        encoded_position = urllib.parse.quote(position)
        url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_position}{location}&start={job_page*25}"
        print(url)
        self.driver.get(url)

    def read_jobs(self):
        try:
            no_jobs_element = self.driver.find_element(
                By.CLASS_NAME, "jobs-search-two-pane__no-results-banner--expand"
            )
            if "No matching jobs found" in no_jobs_element.text:
                raise Exception("No more jobs on this page")
        except NoSuchElementException:
            pass

        job_container = self.driver.find_element(
            By.CLASS_NAME, "scaffold-layout__list-container"
        )
        job_container_scrollableElement = job_container.find_element(By.XPATH, "..")
        scroll_slow(self.driver, job_container_scrollableElement)
        scroll_slow(
            self.driver, job_container_scrollableElement, step=300, reverse=True
        )

        job_list_elements = job_container.find_elements(
            By.CSS_SELECTOR, "div[data-job-id]"
        )
        print(len(job_list_elements))
        if not job_list_elements:
            raise Exception("No job class elements found on page.")

        job_list = [
            Job(*self.extract_job_information_from_tile(job_element))
            for job_element in job_list_elements
        ]
        return job_list

    def extract_job_information_from_tile(self, job_tile: WebElement):
        job_title, company, job_location, link = "", "", "", ""
        try:
            job_title = (
                job_tile.find_element(By.CLASS_NAME, "job-card-list__title")
                .find_element(By.TAG_NAME, "strong")
                .text
            )

            link = (
                job_tile.find_element(By.CLASS_NAME, "job-card-list__title")
                .get_attribute("href")
                .split("?")[0]
            )

            company = job_tile.find_element(
                By.CLASS_NAME, "artdeco-entity-lockup__subtitle"
            ).text
        except NoSuchElementException:
            print("Some information is missing")
        try:
            job_location = job_tile.find_element(
                By.CLASS_NAME, "job-card-container__metadata-item"
            ).text
        except NoSuchElementException:
            print("Job location is missing")

        return job_title, company, job_location, link

    def _get_job_description(self, job: Job) -> str:
        try:
            self.driver.get(job.link)
        except Exception as e:
            print(e)
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
                print("See more button not found, skipping.")

            try:
                description = self.driver.find_element(
                    By.CLASS_NAME, "jobs-description-content__text"
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
            raise Exception(f"Error getting Job Description:\nTraceback:\b{tb_str}")

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
