from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import ImportTask
from ..services.import_service import import_excel_bytes

router = APIRouter(prefix="/api/v1/import", tags=["import"])


@router.post("/excel")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.lower().endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Only xlsx/xls files are supported.")

    content = await file.read()
    import_id, total_rows = import_excel_bytes(db, file.filename, content)
    return {"ok": True, "data": {"import_id": import_id, "status": "processing", "total_rows": total_rows}}


@router.get("/{import_id}/status")
def import_status(import_id: str, db: Session = Depends(get_db)):
    task = db.query(ImportTask).filter(ImportTask.id == import_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Import task not found.")
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
