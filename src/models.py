import os

from dotenv import load_dotenv
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

load_dotenv(override=True)
Base = declarative_base()


class JobSource(Base):
    __tablename__ = "job_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False)

    jobs = relationship("JobListing", back_populates="source")

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("job_sources.id"), nullable=False)
    external_id = Column(String(255), nullable=False)
    title = Column(String(255))
    company = Column(String(255))
    location = Column(String(255))
    description = Column(Text)
    translated_description = Column(Text, nullable=True)
    salary = Column(String(255))
    deadline = Column(String(255))
    url = Column(String(500), nullable=False, unique=True)
    crawled_at = Column(Date(), nullable=True, default=func.current_date())
    is_expired = Column(Boolean, nullable=True, default=False)

    source = relationship("JobSource", back_populates="jobs")

    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="uq_source_external_id"),
    )


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    job_listing_id = Column(Integer, ForeignKey("job_listings.id"), nullable=False)

    job = relationship("JobListing")

    __table_args__ = (UniqueConstraint("job_listing_id", name="uq_favorite_job"),)


# SQLite Database Connection
engine = create_engine(os.getenv("DB_URL"))
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()
