import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    BackgroundTasks,
    Query
)
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from sqlalchemy import or_, func
import pandas as pd
from fastapi.responses import StreamingResponse

from ..database import get_db
from ..models import ExportTask, Company, ImportTask
from ..security import get_current_user, get_admin_user

router = APIRouter(prefix="/api/v1/export", tags=["export"])

# 请求和响应模型
class ExportFilters(BaseModel):
    city: Optional[List[str]] = None
    industry: Optional[List[str]] = None
    import_id: Optional[str] = None
    keyword: Optional[str] = None

class ExportRequest(BaseModel):
    format: str = Field("excel", description="导出格式: excel, csv, json")
    filters: ExportFilters
    include_raw_data: bool = Field(False, description="是否包含原始数据")

class ExportTaskResponse(BaseModel):
    export_id: str
    status: str  # pending, processing, completed, failed
    file_name: str
    file_size: Optional[int] = None
    download_url: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True

@router.post("/", response_model=ExportTaskResponse)
async def create_export(
    export: ExportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """创建导出任务"""
    # 验证导出格式
    if export.format not in ["excel", "csv", "json"]:
        raise HTTPException(status_code=400, detail="不支持的导出格式")

    # 创建导出任务记录
    export_id = str(uuid.uuid4())
    export_task = ExportTask(
        id=export_id,
        user_id=current_user.id,
        format=export.format,
        filters=export.filters.model_dump(),
        file_name=f"export_{export_id}.{export.format}",
        status="pending"
    )
    db.add(export_task)
    db.commit()
    db.refresh(export_task)

    # 添加到后台任务
    background_tasks.add_task(process_export_task, export_id)

    return ExportTaskResponse.model_validate(export_task)

@router.get("/", response_model=dict)
def list_exports(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="按状态筛选"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """查询用户的导出任务列表"""
    query = db.query(ExportTask)

    # 权限控制：普通用户只能查看自己的导出任务
    if current_user.role != "admin":
        query = query.filter(ExportTask.user_id == current_user.id)

    if status:
        query = query.filter(ExportTask.status == status)

    total = query.count()
    items = (
        query.order_by(ExportTask.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "ok": True,
        "data": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": [ExportTaskResponse.model_validate(item) for item in items]
        }
    }

@router.get("/{export_id}", response_model=ExportTaskResponse)
def get_export_status(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取导出任务状态"""
    export = db.query(ExportTask).filter(ExportTask.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="导出任务不存在")

    # 权限检查
    if current_user.role != "admin" and export.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此导出任务")

    return ExportTaskResponse.model_validate(export)

@router.get("/{export_id}/download")
def download_export(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """下载导出文件"""
    export = db.query(ExportTask).filter(ExportTask.id == export_id).first()
    if not export:
        raise HTTPException(status_code=404, detail="导出任务不存在")

    # 权限检查
    if current_user.role != "admin" and export.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权下载此文件")

    if export.status != "completed":
        raise HTTPException(status_code=400, detail="导出尚未完成")

    if not os.path.exists(export.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    # 返回文件流
    def iterfile():
        with open(export.file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        iterfile(),
        media_type=get_media_type(export.format),
        headers={
            "Content-Disposition": f'attachment; filename="{export.file_name}"',
            "Content-Length": str(export.file_size)
        }
    )

# 后台任务处理函数
async def process_export_task(export_id: str):
    """处理导出任务的后台函数"""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        export = db.query(ExportTask).filter(ExportTask.id == export_id).first()
        if not export:
            return

        # 更新状态为处理中
        export.status = "processing"
        db.commit()

        # 执行导出逻辑
        companies = get_filtered_companies(db, export.filters, export.user_id)

        if export.format == "excel":
            file_path = export_to_excel(companies, export)
        elif export.format == "csv":
            file_path = export_to_csv(companies, export)
        else:  # json
            file_path = export_to_json(companies, export)

        # 更新状态为完成
        export.status = "completed"
        export.file_path = file_path
        export.file_size = os.path.getsize(file_path)
        export.completed_at = datetime.utcnow()
        db.commit()

    except Exception as e:
        # 更新状态为失败
        export.status = "failed"
        export.error_message = str(e)
        export.completed_at = datetime.utcnow()
        db.commit()
    finally:
        db.close()

def get_filtered_companies(db: Session, filters: dict, user_id: int) -> List[Company]:
    """根据过滤器获取公司数据"""
    query = db.query(Company)

    # 权限检查：用户只能导出自己有权限的数据
    user_imports = db.query(ImportTask.id).filter(ImportTask.user_id == user_id).all()
    user_import_ids = [imp[0] for imp in user_imports]

    query = query.filter(Company.import_id.in_(user_import_ids))

    if filters.get("city"):
        query = query.filter(Company.city.in_(filters["city"]))

    if filters.get("industry"):
        query = query.filter(Company.industry.in_(filters["industry"]))

    if filters.get("import_id"):
        query = query.filter(Company.import_id == filters["import_id"])

    if filters.get("keyword"):
        keyword = filters["keyword"]
        query = query.filter(
            or_(
                Company.name.like(f"%{keyword}%"),
                Company.city.like(f"%{keyword}%"),
                Company.industry.like(f"%{keyword}%"),
                Company.address.like(f"%{keyword}%")
            )
        )

    return query.all()

def export_to_excel(companies: List[Company], export: ExportTask) -> str:
    """导出为Excel格式"""
    data = []
    for company in companies:
        row = {
            "ID": company.id,
            "企业名称": company.name,
            "城市": company.city,
            "行业": company.industry,
            "地址": company.address,
            "标签": ", ".join(company.tags) if company.tags else "",
            "导入批次": company.import_id,
            "源数据行号": company.source_row,
            "创建时间": company.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "更新时间": company.updated_at.strftime("%Y-%m-%d %H:%M:%S")
        }

        if export.include_raw_data:
            row["原始数据"] = str(company.raw_data)

        data.append(row)

    df = pd.DataFrame(data)

    # 创建输出文件
    output_dir = "exports"
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{export.id}.xlsx")

    with pd.ExcelWriter(file_path, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name="Sheet1", index=False)

    return file_path

def export_to_csv(companies: List[Company], export: ExportTask) -> str:
    """导出为CSV格式"""
    data = []
    for company in companies:
        row = {
            "id": company.id,
            "name": company.name,
            "city": company.city,
            "industry": company.industry,
            "address": company.address,
            "tags": company.tags,
            "import_id": company.import_id,
            "source_row": company.source_row,
            "created_at": company.created_at.isoformat(),
            "updated_at": company.updated_at.isoformat()
        }

        if export.include_raw_data:
            row["raw_data"] = company.raw_data

        data.append(row)

    df = pd.DataFrame(data)

    output_dir = "exports"
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{export.id}.csv")

    df.to_csv(file_path, index=False, encoding='utf-8-sig')

    return file_path

def export_to_json(companies: List[Company], export: ExportTask) -> str:
    """导出为JSON格式"""
    data = []
    for company in companies:
        item = {
            "id": company.id,
            "name": company.name,
            "city": company.city,
            "industry": company.industry,
            "address": company.address,
            "tags": company.tags,
            "import_id": company.import_id,
            "source_row": company.source_row,
            "created_at": company.created_at.isoformat(),
            "updated_at": company.updated_at.isoformat()
        }

        if export.include_raw_data:
            item["raw_data"] = company.raw_data

        data.append(item)

    output_dir = "exports"
    os.makedirs(output_dir, exist_ok=True)
    file_path = os.path.join(output_dir, f"{export.id}.json")

    import json
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return file_path

def get_media_type(format: str) -> str:
    """获取文件格式的MIME类型"""
    media_types = {
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "csv": "text/csv; charset=utf-8",
        "json": "application/json; charset=utf-8"
    }
    return media_types.get(format, "application/octet-stream")