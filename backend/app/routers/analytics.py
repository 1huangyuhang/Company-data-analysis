from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query
)
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, extract
from pydantic import BaseModel, Field
from collections import defaultdict

from ..database import get_db
from ..models import Company, ImportTask
from ..security import get_current_user

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])

# 请求和响应模型
class DateRange(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class AnalyticsFilters(BaseModel):
    import_id: Optional[str] = None
    city: Optional[List[str]] = None
    industry: Optional[List[str]] = None
    date_range: Optional[DateRange] = None

class SummaryStats(BaseModel):
    total_companies: int
    total_imports: int
    avg_companies_per_import: float
    most_common_city: Optional[str] = None
    most_common_industry: Optional[str] = None

class DistributionItem(BaseModel):
    name: str
    count: int
    percentage: float

class TimeSeriesItem(BaseModel):
    date: str
    count: int

@router.get("/summary")
def get_summary_analytics(
    import_id: Optional[str] = Query(None),
    city: Optional[List[str]] = Query(None),
    industry: Optional[List[str]] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取汇总统计分析"""

    # 基础查询 - 用户只能查看自己有权限的数据
    user_imports = db.query(ImportTask.id).filter(ImportTask.user_id == current_user.id).all()
    user_import_ids = [imp[0] for imp in user_imports]

    company_query = db.query(Company).filter(Company.import_id.in_(user_import_ids))
    import_query = db.query(ImportTask).filter(ImportTask.user_id == current_user.id)

    # 应用过滤器
    if import_id:
        if import_id not in user_import_ids and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权访问此导入批次")
        company_query = company_query.filter(Company.import_id == import_id)

    if city:
        company_query = company_query.filter(Company.city.in_(city))

    if industry:
        company_query = company_query.filter(Company.industry.in_(industry))

    if start_date:
        company_query = company_query.filter(Company.created_at >= start_date)
        import_query = import_query.filter(ImportTask.created_at >= start_date)

    if end_date:
        company_query = company_query.filter(Company.created_at <= end_date)
        import_query = import_query.filter(ImportTask.created_at <= end_date)

    # 计算汇总统计
    total_companies = company_query.count()
    total_imports = import_query.count()
    avg_companies_per_import = total_companies / total_imports if total_imports > 0 else 0

    # 最常见的城市
    most_common_city = (
        company_query.with_entities(Company.city, func.count(Company.id))
        .filter(Company.city.isnot(None))
        .group_by(Company.city)
        .order_by(func.count(Company.id).desc())
        .first()
    )

    # 最常见的行业
    most_common_industry = (
        company_query.with_entities(Company.industry, func.count(Company.id))
        .filter(Company.industry.isnot(None))
        .group_by(Company.industry)
        .order_by(func.count(Company.id).desc())
        .first()
    )

    return {
        "ok": True,
        "data": {
            "summary": {
                "total_companies": total_companies,
                "total_imports": total_imports,
                "avg_companies_per_import": round(avg_companies_per_import, 2),
                "most_common_city": most_common_city[0] if most_common_city else None,
                "most_common_industry": most_common_industry[0] if most_common_industry else None
            }
        }
    }

@router.get("/distributions")
def get_distribution_analytics(
    top_n: int = Query(10, ge=1, le=100),
    import_id: Optional[str] = Query(None),
    city: Optional[List[str]] = Query(None),
    industry: Optional[List[str]] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取分布统计分析"""

    # 基础查询 - 权限控制
    user_imports = db.query(ImportTask.id).filter(ImportTask.user_id == current_user.id).all()
    user_import_ids = [imp[0] for imp in user_imports]

    query = db.query(Company).filter(Company.import_id.in_(user_import_ids))

    # 应用过滤器
    if import_id:
        if import_id not in user_import_ids and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权访问此导入批次")
        query = query.filter(Company.import_id == import_id)

    if city:
        query = query.filter(Company.city.in_(city))

    if industry:
        query = query.filter(Company.industry.in_(industry))

    if start_date:
        query = query.filter(Company.created_at >= start_date)

    if end_date:
        query = query.filter(Company.created_at <= end_date)

    total_count = query.count()

    # 城市分布
    city_distribution = (
        query.with_entities(Company.city, func.count(Company.id))
        .filter(Company.city.isnot(None))
        .group_by(Company.city)
        .order_by(func.count(Company.id).desc())
        .limit(top_n)
        .all()
    )

    # 行业分布
    industry_distribution = (
        query.with_entities(Company.industry, func.count(Company.id))
        .filter(Company.industry.isnot(None))
        .group_by(Company.industry)
        .order_by(func.count(Company.id).desc())
        .limit(top_n)
        .all()
    )

    return {
        "ok": True,
        "data": {
            "city_distribution": [
                {
                    "name": city,
                    "count": count,
                    "percentage": round(count / total_count * 100, 2) if total_count > 0 else 0
                }
                for city, count in city_distribution
            ],
            "industry_distribution": [
                {
                    "name": industry,
                    "count": count,
                    "percentage": round(count / total_count * 100, 2) if total_count > 0 else 0
                }
                for industry, count in industry_distribution
            ],
            "total_count": total_count
        }
    }

@router.get("/time-series")
def get_time_series_analytics(
    interval: str = Query("day", description="时间间隔: day, week, month"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    import_id: Optional[str] = Query(None),
    city: Optional[List[str]] = Query(None),
    industry: Optional[List[str]] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取时间序列分析"""

    # 基础查询 - 权限控制
    user_imports = db.query(ImportTask.id).filter(ImportTask.user_id == current_user.id).all()
    user_import_ids = [imp[0] for imp in user_imports]

    query = db.query(Company).filter(Company.import_id.in_(user_import_ids))

    # 应用过滤器
    if import_id:
        if import_id not in user_import_ids and current_user.role != "admin":
            raise HTTPException(status_code=403, detail="无权访问此导入批次")
        query = query.filter(Company.import_id == import_id)

    if city:
        query = query.filter(Company.city.in_(city))

    if industry:
        query = query.filter(Company.industry.in_(industry))

    if start_date:
        query = query.filter(Company.created_at >= start_date)
    if end_date:
        query = query.filter(Company.created_at <= end_date)

    # 根据时间间隔分组
    if interval == "week":
        # 按周分组
        time_series = (
            query.with_entities(
                func.date_trunc('week', Company.created_at).label('week'),
                func.count(Company.id)
            )
            .group_by('week')
            .order_by('week')
            .all()
        )
        result = [
            {
                "date": row[0].strftime("%Y-W%U"),
                "count": row[1]
            }
            for row in time_series
        ]

    elif interval == "month":
        # 按月分组
        time_series = (
            query.with_entities(
                func.date_trunc('month', Company.created_at).label('month'),
                func.count(Company.id)
            )
            .group_by('month')
            .order_by('month')
            .all()
        )
        result = [
            {
                "date": row[0].strftime("%Y-%m"),
                "count": row[1]
            }
            for row in time_series
        ]

    else:  # day
        # 按天分组
        time_series = (
            query.with_entities(
                func.date(Company.created_at).label('date'),
                func.count(Company.id)
            )
            .group_by('date')
            .order_by('date')
            .all()
        )
        result = [
            {
                "date": row[0].strftime("%Y-%m-%d"),
                "count": row[1]
            }
            for row in time_series
        ]

    return {
        "ok": True,
        "data": {
            "time_series": result,
            "interval": interval
        }
    }

@router.get("/import-stats")
def get_import_statistics(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", description="排序字段: created_at, total_rows, success_rows"),
    sort_order: str = Query("desc", description="排序方式: asc, desc"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """获取导入统计"""

    # 权限控制
    if current_user.role == "admin":
        query = db.query(ImportTask)
    else:
        query = db.query(ImportTask).filter(ImportTask.user_id == current_user.id)

    total = query.count()

    # 排序
    order_column = getattr(ImportTask, sort_by, ImportTask.created_at)
    if sort_order == "desc":
        order_column = order_column.desc()
    else:
        order_column = order_column.asc()

    items = (
        query.order_by(order_column)
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
            "items": [
                {
                    "import_id": item.id,
                    "file_name": item.file_name,
                    "status": item.status,
                    "total_rows": item.total_rows,
                    "success_rows": item.success_rows,
                    "failed_rows": item.failed_rows,
                    "success_rate": round(item.success_rows / item.total_rows * 100, 2) if item.total_rows > 0 else 0,
                    "created_at": item.created_at,
                    "finished_at": item.finished_at
                }
                for item in items
            ]
        }
    }