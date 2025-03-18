import os
from datetime import date
from typing import List, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from elasticsearch import Elasticsearch
from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import desc

from src.models import Favorite, JobListing, JobSource, Session

load_dotenv(override=True)

# Configure Gemini
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")


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


class FavoriteSchema(BaseModel):
    job_listing_id: int


class FavoriteResponse(BaseModel):
    id: int
    job_listing_id: int

    model_config = ConfigDict(from_attributes=True)


class TranslationRequest(BaseModel):
    job_id: int
    text: str


class TranslationResponse(BaseModel):
    translated_text: str


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


@app.get("/locations")
def get_locations(db=Depends(get_db)):
    locations = db.query(JobListing.location).distinct().all()
    return [loc[0] for loc in locations if loc[0]]  # Filter out None values


@app.get("/jobs")
def read_jobs(
    source: Optional[str] = None,
    search: Optional[str] = None,
    page: int = 1,
    per_page: int = 10,
    favorites: bool = False,
    locations: List[str] = Query(None),
    db=Depends(get_db),
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
                            "type": "best_fields",
                        }
                    },
                    "filter": [],
                }
            },
            "sort": [{"id": {"order": "desc"}}],
            "from": (page - 1) * per_page,
            "size": per_page,
        }
        if source:
            es_query["query"]["bool"]["filter"].append({"term": {"source": source}})
        if locations and len(locations) > 0:
            es_query["query"]["bool"]["filter"].append(
                {"terms": {"location": locations}}
            )
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
        if locations and len(locations) > 0:
            query = query.filter(JobListing.location.in_(locations))
        if favorites:
            favorite_job_ids = db.query(Favorite.job_listing_id).all()
            favorite_job_ids = [id[0] for id in favorite_job_ids]
            query = query.filter(JobListing.id.in_(favorite_job_ids))
        total = query.count()
        jobs = (
            query.order_by(desc(JobListing.id))
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
        )
        jobs_data = [JobListingSchema.model_validate(job) for job in jobs]
        return JobListingResponse(
            jobs=jobs_data, total=total, page=page, per_page=per_page
        )


# Favorites endpoints
@app.get("/favorites")
def get_favorites(db=Depends(get_db)):
    favorites = db.query(Favorite.job_listing_id).all()
    return [fav[0] for fav in favorites]


@app.post("/favorites")
def create_favorite(favorite: FavoriteSchema, db=Depends(get_db)):
    db_favorite = Favorite(job_listing_id=favorite.job_listing_id)
    db.add(db_favorite)
    try:
        db.commit()
        db.refresh(db_favorite)
        return FavoriteResponse.model_validate(db_favorite)
    except:
        db.rollback()
        return {"error": "Could not save favorite"}


@app.delete("/favorites/{job_id}")
def delete_favorite(job_id: int, db=Depends(get_db)):
    favorite = db.query(Favorite).filter(Favorite.job_listing_id == job_id).first()
    if favorite:
        db.delete(favorite)
        db.commit()
        return {"message": "Favorite deleted"}
    return {"error": "Favorite not found"}


@app.post("/translate")
async def translate_job_description(request: TranslationRequest, db=Depends(get_db)):
    # Check if translation already exists
    job = db.query(JobListing).filter(JobListing.id == request.job_id).first()
    if not job:
        return {"error": "Job not found"}

    if job.translated_description:
        return TranslationResponse(translated_text=job.translated_description)

    # Generate translation using Gemini
    prompt = f"Translate the following English text into Vietnamese while maintaining the intended formatting as closely as possible. Use **abc** for bold text and * abc for bundle formatting, but adapt flexibly if needed to ensure readability and natural presentation.:\n\n{request.text}"
    response = model.generate_content(prompt)
    translated_text = response.text

    # Save translation to database
    job.translated_description = translated_text
    db.commit()

    return TranslationResponse(translated_text=translated_text)
