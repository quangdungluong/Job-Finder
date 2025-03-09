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


class ITViecJobManager:
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
            .filter(JobSource.name == "ITViec")
            .filter(or_(JobListing.description == "", JobListing.description.is_(None)))
            .all()
        )
        for job_record in tqdm(job_records):
            job = Job(link=job_record.url)
            self._get_job_description(job)
            try:
                job_record.description = job.description
                session.commit()
            except Exception as e:
                logger.error(e)
                session.rollback()

    def collecting_data(self):
        job_list: List[Job] = []
        for position in self.positions:
            try:
                job_page_number = 0
                is_last_page = False
                while not is_last_page:
                    job_page_number += 1
                    next_job_page_url = self.next_job_page(position, job_page_number)
                    job_sub_list, is_last_page = self.read_jobs(next_job_page_url)
                    job_list.extend(job_sub_list)
            except Exception as e:
                logger.error(e)
                pass

        logger.info(f"Number of extracted jobs: {len(job_list)}")

        # Insert into db
        job_source = session.query(JobSource).filter_by(name="ITViec").first()
        if not job_source:
            job_source = JobSource(name="ITViec")
            try:
                session.add(job_source)
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error when creating job source ITViec.")

        for job in tqdm(job_list):
            self.save_job_to_db(job, job_source)

    def save_job_to_db(self, job: Job, job_source: JobSource):
        try:
            itviec_job_id = job.job_key
            existing_job = (
                session.query(JobListing).filter_by(external_id=itviec_job_id).first()
            )
            if existing_job:
                logger.info(f"existing: {itviec_job_id} - {job.link}")
                return

            job_listing = JobListing(
                source_id=job_source.id,
                external_id=itviec_job_id,
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
        return f"https://itviec.com/it-jobs/{encoded_position}?page={job_page}"

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

        # Find paginate search jobs
        is_last_page = True
        paginate_search_jobs = page_soup.find(
            "div", class_=lambda x: x and "pagination-search-jobs" in x
        )
        if paginate_search_jobs:
            page_next = paginate_search_jobs.find("div", class_="page next")
            if page_next:
                is_last_page = False

        jobs = page_soup.find_all("div", class_=lambda x: x and "job-card" in x)
        job_list: List[Job] = []
        for job_element in jobs:
            job = Job()
            job.title = job_element.find("h3", class_="imt-3").text.strip()
            job.link = job_element.find("h3", class_="imt-3").get("data-url")
            job.company = job_element.find(
                "a", class_="text-rich-grey", target="_blank"
            ).text.strip()
            job.job_key = job_element.get("data-job-key")
            location_divs = job_element.find_all(
                "div", class_="d-flex align-items-center text-dark-grey imt-1"
            )
            for div in location_divs:
                if div.find("use", href=lambda x: x and "map-pin" in x):
                    job.location = div.find("span").text.strip()
            job_list.append(job)

        return job_list, is_last_page

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
        job_content_section = job_soup.find(
            "section", class_=lambda x: x and "job-content" in x
        )
        job.description = job_content_section.text.strip()
