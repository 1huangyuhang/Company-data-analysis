from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text

from .database import Base


class Company(Base):
    __tablename__ = "company"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    city = Column(String(100), index=True)
    industry = Column(String(150), index=True)
    address = Column(String(255))
    tags = Column(JSON, nullable=False, default=list)
    raw_data = Column(JSON, nullable=False, default=dict)
    import_id = Column(String(64), index=True)
    source_row = Column(Integer)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ImportTask(Base):
    __tablename__ = "import_task"

    id = Column(String(64), primary_key=True, index=True)
    file_name = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="processing")
    total_rows = Column(Integer, nullable=False, default=0)
    success_rows = Column(Integer, nullable=False, default=0)
    failed_rows = Column(Integer, nullable=False, default=0)
    field_mapping = Column(JSON, nullable=False, default=dict)
    error_log = Column(Text)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at = Column(DateTime)
