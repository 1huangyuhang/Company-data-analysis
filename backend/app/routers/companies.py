from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Company, ImportTask
from ..schemas import CompanyUpdateRequest, SearchRequest
from ..security import get_current_user

router = APIRouter(prefix="/api/v1/companies", tags=["companies"])


@router.post("/search")
def search_companies(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    page = max(payload.page, 1)
    page_size = min(max(payload.page_size, 1), 200)

    query = db.query(Company)

    if payload.filters.city:
        query = query.filter(Company.city.in_(payload.filters.city))
    if payload.filters.industry:
        query = query.filter(Company.industry.in_(payload.filters.industry))
    if payload.filters.import_id and payload.filters.import_id.strip():
        # 权限检查：用户只能查询自己有权限的导入批次
        import_id = payload.filters.import_id.strip()
        if current_user.role != "admin":
            import_task = db.query(ImportTask).filter(
                ImportTask.id == import_id,
                ImportTask.user_id == current_user.id
            ).first()
            if not import_task:
                raise HTTPException(status_code=403, detail="无权访问此导入批次")
        query = query.filter(Company.import_id == import_id)

    keyword = payload.keyword.strip()
    if keyword:
        if payload.match_mode == "exact":
            query = query.filter(or_(Company.name == keyword, Company.industry == keyword, Company.city == keyword))
        else:
            like_kw = f"%{keyword}%"
            query = query.filter(
                or_(
                    Company.name.like(like_kw),
                    Company.city.like(like_kw),
                    Company.industry.like(like_kw),
                    Company.address.like(like_kw),
                )
            )

    total = query.count()
    items = (
        query.order_by(Company.updated_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    data = [
        {
            "id": i.id,
            "name": i.name,
            "city": i.city,
            "industry": i.industry,
            "address": i.address,
            "tags": i.tags or [],
            "raw_data": i.raw_data or {},
            "import_id": i.import_id,
            "source_row": i.source_row,
        }
        for i in items
    ]
    return {
        "ok": True,
        "data": {"total": total, "page": page, "page_size": page_size, "items": data},
    }


@router.get("/by-import/{import_id}")
def list_companies_by_import(
    import_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # 权限检查：用户只能查询自己有权限的导入批次
    if current_user.role != "admin":
        import_task = db.query(ImportTask).filter(
            ImportTask.id == import_id,
            ImportTask.user_id == current_user.id
        ).first()
        if not import_task:
            raise HTTPException(status_code=403, detail="无权访问此导入批次")

    query = db.query(Company).filter(Company.import_id == import_id)
    total = query.count()
    items = (
        query.order_by(Company.source_row.asc(), Company.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    data = [
        {
            "id": i.id,
            "name": i.name,
            "city": i.city,
            "industry": i.industry,
            "address": i.address,
            "tags": i.tags or [],
            "raw_data": i.raw_data or {},
            "import_id": i.import_id,
            "source_row": i.source_row,
        }
        for i in items
    ]
    return {
        "ok": True,
        "data": {"total": total, "page": page, "page_size": page_size, "items": data},
    }


@router.put("/{company_id}")
def update_company(
    company_id: int,
    payload: CompanyUpdateRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    # 权限检查：用户只能更新自己有权限的导入批次的企业
    if current_user.role != "admin":
        import_task = db.query(ImportTask).filter(
            ImportTask.id == company.import_id,
            ImportTask.user_id == current_user.id
        ).first()
        if not import_task:
            raise HTTPException(status_code=403, detail="无权更新此企业信息")

    if payload.name is not None:
        company.name = payload.name.strip() or "未知企业"
    if payload.city is not None:
        company.city = payload.city
    if payload.industry is not None:
        company.industry = payload.industry
    if payload.address is not None:
        company.address = payload.address
    if payload.tags is not None:
        company.tags = payload.tags
    if payload.raw_data is not None:
        company.raw_data = payload.raw_data

    db.commit()
    db.refresh(company)

    return {
        "ok": True,
        "data": {
            "id": company.id,
            "name": company.name,
            "city": company.city,
            "industry": company.industry,
            "address": company.address,
            "tags": company.tags or [],
            "raw_data": company.raw_data or {},
            "import_id": company.import_id,
            "source_row": company.source_row,
        },
    }


@router.get("/detail/{company_id}")
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    # 权限检查：用户只能查看自己有权限的导入批次的企业
    if current_user.role != "admin":
        import_task = db.query(ImportTask).filter(
            ImportTask.id == company.import_id,
            ImportTask.user_id == current_user.id
        ).first()
        if not import_task:
            raise HTTPException(status_code=403, detail="无权查看此企业信息")
    return {
        "ok": True,
        "data": {
            "id": company.id,
            "name": company.name,
            "city": company.city,
            "industry": company.industry,
            "address": company.address,
            "tags": company.tags or [],
            "raw_data": company.raw_data or {},
            "import_id": company.import_id,
            "source_row": company.source_row,
        },
    }


@router.get("/by-import/{import_id}/all")
def list_companies_by_import_all(
    import_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # 权限检查：用户只能查询自己有权限的导入批次
    if current_user.role != "admin":
        import_task = db.query(ImportTask).filter(
            ImportTask.id == import_id,
            ImportTask.user_id == current_user.id
        ).first()
        if not import_task:
            raise HTTPException(status_code=403, detail="无权访问此导入批次")

    items = (
        db.query(Company)
        .filter(Company.import_id == import_id)
        .order_by(Company.source_row.asc(), Company.id.asc())
        .all()
    )
    data = [
        {
            "id": i.id,
            "name": i.name,
            "city": i.city,
            "industry": i.industry,
            "address": i.address,
            "tags": i.tags or [],
            "raw_data": i.raw_data or {},
            "import_id": i.import_id,
            "source_row": i.source_row,
        }
        for i in items
    ]
    return {"ok": True, "data": {"total": len(data), "items": data}}
