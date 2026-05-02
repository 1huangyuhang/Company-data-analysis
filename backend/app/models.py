from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

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
    user_id = Column(Integer, ForeignKey("user.id"), index=True)  # 关联用户ID
    file_name = Column(String(255), nullable=False)
    status = Column(String(32), nullable=False, default="processing")
    total_rows = Column(Integer, nullable=False, default=0)
    success_rows = Column(Integer, nullable=False, default=0)
    failed_rows = Column(Integer, nullable=False, default=0)
    field_mapping = Column(JSON, nullable=False, default=dict)
    error_log = Column(Text)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    finished_at = Column(DateTime)

    # 用户关联
    user = relationship("User", back_populates="import_tasks")


class User(Base):
    __tablename__ = "user"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="user")  # user, admin
    is_active = Column(Integer, nullable=False, default=1)  # 1: active, 0: inactive

    # 用户拥有的导入任务
    import_tasks = relationship("ImportTask", back_populates="user")
    # 用户拥有的导出任务
    export_tasks = relationship("ExportTask", back_populates="user")

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class ExportTask(Base):
    __tablename__ = "export_task"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("user.id"), index=True)  # 关联用户ID
    format = Column(String(10), nullable=False)
    filters = Column(JSON, nullable=False)
    file_path = Column(String(255))
    status = Column(String(20), nullable=False, default="pending")  # pending, processing, completed, failed
    file_name = Column(String(255))
    file_size = Column(Integer, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    error_message = Column(Text)

    # 用户关联
    user = relationship("User", back_populates="export_tasks")
