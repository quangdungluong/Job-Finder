from sqlalchemy import Boolean, Column, Date, Integer, String, Text, create_engine, func
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()


class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True)
    linkedin_job_id = Column(String(255), unique=True)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    location = Column(String(255))
    company = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False, unique=True)
    scraped_date = Column(Date(), nullable=True, default=func.current_date())
    is_expired = Column(Boolean, nullable=True, default=False)


# SQLite Database Connection
engine = create_engine("sqlite:///assets/database.db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()
