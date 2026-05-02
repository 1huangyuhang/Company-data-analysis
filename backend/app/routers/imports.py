import uuid
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ImportTask
from ..services import import_service
from ..security import get_current_user

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/excel")
async def import_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only xlsx/xls files are supported.")

    content = await file.read()

    # 创建导入任务并关联用户
    import_id = str(uuid.uuid4())
    import_task = ImportTask(
        id=import_id,
        user_id=current_user.id,
        file_name=file.filename,
        status="processing",
        total_rows=0
    )
    db.add(import_task)
    db.commit()

    # 同步处理导入（临时方案，实际应该用Celery异步处理）
    try:
        result_import_id, total_rows = import_service.import_excel_bytes(db, file.filename, content)

        # 注意：import_excel_bytes 内部会创建新的 ImportTask 记录
        # 我们需要更新刚才创建的记录或删除重复记录
        # 这里简化处理：删除刚才创建的记录，让服务层创建的记录生效
        db.delete(import_task)
        db.commit()

        return {"ok": True, "data": {"import_id": result_import_id, "status": "processing", "total_rows": total_rows}}

    except Exception as e:
        import_task.status = "failed"
        import_task.error_log = str(e)
        db.commit()
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")

    return {"ok": True, "data": {"import_id": import_id, "status": "processing", "total_rows": 0}}


@router.get("/{import_id}/status")
def import_status(import_id: str, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
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
