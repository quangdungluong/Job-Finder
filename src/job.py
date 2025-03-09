from dataclasses import dataclass
from typing import Optional


@dataclass
class Job:
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    link: Optional[str] = None
    description: Optional[str] = None
    recruiter_link: Optional[str] = None
    salary: Optional[str] = None
    deadline: Optional[str] = None

    def set_job_description(self, description):
        self.description = description
