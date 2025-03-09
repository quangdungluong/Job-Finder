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

Base = declarative_base()


class JobSource(Base):
    __tablename__ = "job_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, unique=True, nullable=False)

    jobs = relationship("JobListing", back_populates="source")


class JobListing(Base):
    __tablename__ = "job_listings"

    id = Column(Integer, primary_key=True)
    source_id = Column(Integer, ForeignKey("job_sources.id"), nullable=False)
    external_id = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    location = Column(String(255))
    description = Column(Text)
    salary = Column(String(255))
    deadline = Column(String(255))
    url = Column(String(500), nullable=False, unique=True)
    crawled_at = Column(Date(), nullable=True, default=func.current_date())
    is_expired = Column(Boolean, nullable=True, default=False)

    source = relationship("JobSource", back_populates="jobs")

    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="uq_source_external_id"),
    )


# SQLite Database Connection
engine = create_engine("sqlite:///assets/database.db")
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()
