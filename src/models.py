from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
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


# SQLite Database Connection
engine = create_engine("sqlite:///assets/database.db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()
