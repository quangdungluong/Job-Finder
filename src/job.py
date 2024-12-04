from dataclasses import dataclass


@dataclass
class Job:
    title: str = ""
    company: str = ""
    location: str = ""
    link: str = ""
    description: str = ""
    summarize_job_description: str = ""
    recruiter_link: str = ""

    def set_job_description(self, description):
        self.description = description
