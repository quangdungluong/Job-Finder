import random
import re
import time
import urllib
import urllib.parse
from datetime import date
from typing import Dict, List

import cloudscraper
from bs4 import BeautifulSoup
from sqlalchemy import or_
from tqdm import tqdm

from src.job import Job
from src.logger import logger
from src.models import JobListing, JobSource, session
from src.regex_utils import generate_regex_patterns_for_blacklisting


class TopCVJobManager:
    def __init__(self, scraper: cloudscraper.CloudScraper):
        self.scraper = scraper

    def set_parameters(self, parameters: Dict):
        logger.info("Setting parameters")
        self.positions: List = parameters.get("positions", [])
        self.locations: List = parameters.get("locations", [])
        self.title_blacklist: List = parameters.get("title_blacklist", [])
        self.company_blacklist: List = parameters.get("company_blacklist", [])

        self.title_blacklist_patterns = generate_regex_patterns_for_blacklisting(
            self.title_blacklist
        )
        self.company_blacklist_patterns = generate_regex_patterns_for_blacklisting(
            self.company_blacklist
        )

    def retrieve_job_details(self):
        job_records = (
            session.query(JobListing)
            .join(JobSource)
            .filter(JobSource.name == "TopCV")
            .filter(or_(JobListing.description == "", JobListing.description.is_(None)))
            .all()
        )
        for job_record in tqdm(job_records):
            job = Job(link=job_record.url)
            self._get_job_description(job)
            try:
                job_record.company = job.company
                job_record.description = job.description
                job_record.title = job.title
                job_record.location = job.location
                session.commit()
            except Exception as e:
                logger.error(e)
                session.rollback()

    def collecting_data(self):
        job_list: List[Job] = []
        for position in self.positions:
            try:
                job_page_number = 0
                last_page = 20
                while job_page_number <= last_page:
                    job_page_number += 1
                    next_job_page_url = self.next_job_page(position, job_page_number)
                    job_sub_list, last_page = self.read_jobs(next_job_page_url)
                    job_list.extend(job_sub_list)
            except Exception as e:
                logger.error(e)
                pass

        logger.info(f"Number of extracted jobs: {len(job_list)}")

        # Insert into db
        job_source = session.query(JobSource).filter_by(name="TopCV").first()
        if not job_source:
            job_source = JobSource(name="TopCV")
            try:
                session.add(job_source)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error when creating job source TopCV.")

        for job in tqdm(job_list):
            self.save_job_to_db(job, job_source)

    def save_job_to_db(self, job: Job, job_source: JobSource):
        try:
            topcv_job_id = job.link.split("/")[-1].split(".html")[0]
            existing_job = (
                session.query(JobListing).filter_by(external_id=topcv_job_id).first()
            )
            if existing_job:
                logger.info(f"existing: {topcv_job_id} - {job.link}")
                return

            job_listing = JobListing(
                source_id=job_source.id,
                external_id=topcv_job_id,
                title=job.title,
                company=job.company,
                location=job.location,
                description=job.description,
                url=job.link,
                crawled_at=date.today(),
                is_expired=False,
            )
            session.add(job_listing)
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error saving job: {e}")
        except Exception as e:
            logger.error(e)
            return

    def next_job_page(self, position, job_page):
        encoded_position = urllib.parse.quote(re.sub(r"\s+", "-", position.strip()))
        return f"https://www.topcv.vn/tim-viec-lam-{encoded_position}?page={job_page}&sba=1"

    def read_jobs(self, page_url):
        logger.info(page_url)
        time.sleep(random.uniform(7, 10))
        page_response = self.scraper.get(page_url)
        retry_cnt = 5
        while page_response.status_code == 429 and retry_cnt:
            logger.info(f"Retrying...")
            time.sleep(random.uniform(7, 10))
            page_response = self.scraper.get(page_url)
            retry_cnt -= 1
        if page_response.status_code != 200:
            logger.error(f"Error: {page_response.status_code}")
            return
        page_soup = BeautifulSoup(page_response.text, "lxml")
        html_lists = page_soup.find("div", class_="job-list-search-result")
        jobs = html_lists.find_all("div", class_="job-item-search-result")
        paginate_text = page_soup.find("span", id="job-listing-paginate-text")
        if paginate_text:
            last_page = int(paginate_text.text.strip().split("/")[1].split()[0])
        else:
            last_page = 1
        job_list: List[Job] = []
        for job in jobs:
            job_link = job.find("h3", class_="title").find("a").get("href")
            job_list.append(Job(link=job_link))
        return job_list, last_page

    def _get_job_description(self, job: Job):
        time.sleep(random.uniform(7, 10))
        job_response = self.scraper.get(job.link)
        retry_cnt = 5
        while job_response.status_code == 429 and retry_cnt:
            logger.info("Retrying..")
            time.sleep(random.uniform(7, 10))
            job_response = self.scraper.get(job.link)
            retry_cnt -= 1
        if job_response.status_code != 200:
            logger.error(f"Error: {job_response.status_code}")
            return
        job_soup = BeautifulSoup(job_response.text, "lxml")
        job_data = job_soup.find("div", class_="job-detail__body")

        try:
            job.title = (
                job_data.find("h1", class_="job-detail__info--title").get_text().strip()
            )
        except AttributeError:
            logger.warning("Job title is missing")

        try:
            job.company = (
                job_data.find("div", class_="job-detail__company--information")
                .find("h2", class_="company-name-label")
                .find("a")
                .get_text()
                .strip()
            )
        except AttributeError:
            logger.warning("Job company is missing")

        try:
            info_sections = job_data.find_all(
                "div", class_="job-detail__info--section-content"
            )
            for section in info_sections:
                title = (
                    section.find(
                        "div", class_="job-detail__info--section-content-title"
                    )
                    .get_text()
                    .strip()
                )
                value = (
                    section.find(
                        "div", class_="job-detail__info--section-content-value"
                    )
                    .get_text()
                    .strip()
                )
                if title and value and "địa điểm" in title.lower():
                    job.location = value
                    break
        except AttributeError:
            logger.warning("Job location is missing")

        try:
            # Parse job description
            job_description_section = job_data.find("div", "job-description").find_all(
                "h3"
            )
            job_description_section_text = [
                item.text.strip() for item in job_description_section
            ]
            job_description_content = job_data.find("div", "job-description").find_all(
                "div", class_="job-description__item"
            )
            # job_description_content_text = [
            #     item.text.strip().replace("\u00a0", "").replace("\u200b", "") + " "
            #     for item in job_description_content
            # ]
            job_description_content_text = []
            for item in job_description_content:
                paragraphs = item.text.split("\n\n")
                formated_paragraphs = [
                    para.strip().replace("\u00a0", "").replace("\u200b", "")
                    for para in paragraphs
                ]
                job_description_content_text.append("\n\n".join(formated_paragraphs))
            job.description = "\n".join(job_description_content_text)
        except AttributeError:
            logger.warning("Job description is missing")
