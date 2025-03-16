import os
from datetime import date
from typing import List, Optional

from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict

from src.models import JobListing, JobSource, Session

load_dotenv(override=True)


# Pydantic Schemas
class JobSourceSchema(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class JobListingSchema(BaseModel):
    id: int
    source_id: int
    external_id: str
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    salary: Optional[str] = None
    deadline: Optional[str] = None
    url: str
    crawled_at: Optional[date] = None
    is_expired: Optional[bool] = None
    source: Optional[JobSourceSchema] = None

    model_config = ConfigDict(from_attributes=True)


class JobListingResponse(BaseModel):
    jobs: List[JobListingSchema]
    total: int
    page: int
    per_page: int


app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

es = Elasticsearch(os.getenv("ELASTICSEARCH_URL"))


def get_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


@app.get("/job-sources")
def read_job_sources(db=Depends(get_db)):
    sources = db.query(JobSource).all()
    return [source.to_dict() for source in sources]


@app.get("/jobs")
def read_jobs(
    source=None, search=None, page: int = 1, per_page: int = 10, db=Depends(get_db)
):
    index_name = "job_tester_listing"
    if search:
        es_query = {
            "query": {
                "bool": {
                    "must": {
                        "multi_match": {
                            "query": search,
                            "fields": ["title", "company", "location", "description"],
                        }
                    },
                    "filter": [],
                }
            },
            "from": (page - 1) * per_page,
            "size": per_page,
        }
        if source:
            es_query["query"]["bool"]["filter"].append({"term": {"source": source}})
        es_response = es.search(index=index_name, body=es_query)
        hits = es_response["hits"]["hits"]
        total = (
            es_response["hits"]["total"]["value"]
            if isinstance(es_response["hits"]["total"], dict)
            else es_response["hits"]["total"]
        )
        # Elasticsearch returns plain dictionaries
        raw_jobs = [hit["_source"] for hit in hits]
        jobs_data = []
        for job in raw_jobs:
            if job.get("source") and not isinstance(job["source"], dict):
                job["source"] = {"name": job["source"], "id": job["source_id"]}
            jobs_data.append(JobListingSchema.model_validate(job))
        return JobListingResponse(
            jobs=jobs_data, total=total, page=page, per_page=per_page
        )
    else:
        query = db.query(JobListing).join(JobSource)
        if source:
            query = query.filter(JobSource.name == source)
        total = query.count()
        jobs = query.offset((page - 1) * per_page).limit(per_page).all()
        jobs_data = [JobListingSchema.model_validate(job) for job in jobs]
        return JobListingResponse(
            jobs=jobs_data, total=total, page=page, per_page=per_page
        )
