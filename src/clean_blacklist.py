import os
import sys

sys.path.insert(0, os.getcwd())
import re

from tqdm import tqdm

from main import ConfigValidator
from src.logger import logger
from src.models import JobListing, session


def is_title_blacklisted(job_title, title_blacklist_patterns):
    for pattern in title_blacklist_patterns:
        if re.search(rf"\b{re.escape(pattern)}\b", job_title, re.IGNORECASE):
            logger.info(f"Title: {job_title} matched pattern: '{pattern}'")
            return True
    return False


def is_company_blacklisted(company, company_blacklist_patterns):
    for pattern in company_blacklist_patterns:
        if re.search(rf"\b{re.escape(pattern)}\b", company, re.IGNORECASE):
            logger.info(f"Company: {company} matched pattern: '{pattern}'")
            return True
    return False


def clean_blacklist():
    try:
        config_file = "./configs/work_preferences.yaml"
        parameters = ConfigValidator.validate_config(config_file)
        logger.info(parameters)
        title_blacklist = parameters.get("title_blacklist", [])
        company_blacklist = parameters.get("company_blacklist", [])

        job_records = session.query(JobListing).all()
        logger.info(f"Number of jobs before cleaned: {len(job_records)}")
        for job_record in tqdm(job_records):
            if job_record.company is None or job_record.title is None:
                continue
            if not is_title_blacklisted(
                job_record.title, title_blacklist
            ) and not is_company_blacklisted(job_record.company, company_blacklist):
                continue
            logger.info(f"Deleting job: {job_record.title} at {job_record.company}")
            session.delete(job_record)
            try:
                session.commit()
            except Exception as e:
                session.rollback()
                logger.error(f"Error deleting job: {e}")
        job_records = session.query(JobListing).all()
        logger.info(f"Number of jobs after cleaned: {len(job_records)}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}")


if __name__ == "__main__":
    clean_blacklist()
