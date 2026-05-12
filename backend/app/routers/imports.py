from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ImportTask
from ..services import import_service
from ..security import get_current_user

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.get("/history")
def list_import_history(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """当前用户的历史导入任务（管理员可查看全部），按创建时间倒序。"""
    q = db.query(ImportTask)
    if current_user.get("role") != "admin":
        q = q.filter(ImportTask.user_id == current_user["id"])
    rows = q.order_by(ImportTask.created_at.desc()).limit(limit).all()
    items = []
    for t in rows:
        items.append(
            {
                "import_id": t.id,
                "file_name": t.file_name,
                "status": t.status,
                "total_rows": t.total_rows,
                "success_rows": t.success_rows,
                "failed_rows": t.failed_rows,
                "created_at": t.created_at.isoformat() if t.created_at else None,
                "finished_at": t.finished_at.isoformat() if t.finished_at else None,
            }
        )
    return {"ok": True, "data": {"items": items}}


@router.post("/excel")
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only xlsx/xls files are supported.")

    content = await file.read()

    # 由服务层创建 ImportTask 并写入 user_id，供后续 by-import 等接口做权限校验
    try:
        result_import_id, total_rows = import_service.import_excel_bytes(
            db, file.filename, content, user_id=current_user.id
        )
        return {"ok": True, "data": {"import_id": result_import_id, "status": "processing", "total_rows": total_rows}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@router.get("/{import_id}/status")
def import_status(
    import_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    task = db.query(ImportTask).filter(ImportTask.id == import_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Import task not found.")

    # 权限检查：用户只能查看自己的导入任务，管理员可以查看所有
    if task.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="无权访问此导入任务")

    return {
        "ok": True,
        "data": {
            "import_id": task.id,
            "status": task.status,
            "total_rows": task.total_rows,
            "success_rows": task.success_rows,
            "failed_rows": task.failed_rows,
            "field_mapping": task.field_mapping or {},
            "error_log": task.error_log,
        },
    }
