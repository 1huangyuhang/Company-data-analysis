from __future__ import annotations

import uuid
from datetime import date, datetime
from io import BytesIO
from typing import Dict, Tuple

import pandas as pd
from sqlalchemy.orm import Session

from ..models import Company, ImportTask


STANDARD_FIELD_CANDIDATES = {
    "name": ["企业名称", "公司名称", "name", "主体名称"],
    "city": ["城市", "city", "所在地市", "所属城市"],
    "industry": ["行业", "主营行业", "industry"],
    "address": ["地址", "注册地址", "address"],
}


def _normalize_col(col: str) -> str:
    return str(col).strip().lower()


def infer_mapping(columns: list[str]) -> Dict[str, str]:
    mapping: Dict[str, str] = {}
    normalized = {_normalize_col(c): c for c in columns}

    for target, aliases in STANDARD_FIELD_CANDIDATES.items():
        for alias in aliases:
            alias_norm = _normalize_col(alias)
            if alias_norm in normalized:
                mapping[normalized[alias_norm]] = target
                break
    return mapping


def _to_json_safe(value):
    if pd.isna(value):
        return None
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    # numpy scalar support
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            pass
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="ignore")
    return value


def import_excel_bytes(db: Session, filename: str, content: bytes, user_id: int) -> Tuple[str, int]:
    import_id = f"imp_{uuid.uuid4().hex[:10]}"
    task = ImportTask(id=import_id, user_id=user_id, file_name=filename, status="processing")
    db.add(task)
    db.commit()

    total_rows = 0
    success_rows = 0
    failed_rows = 0
    error_messages = []

    try:
        xls = pd.ExcelFile(BytesIO(content))
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(xls, sheet_name=sheet_name)
            if df.empty:
                continue

            cols = [str(c) for c in df.columns]
            mapping = infer_mapping(cols)
            task.field_mapping = mapping

            for idx, row in df.iterrows():
                total_rows += 1
                raw = {str(k): _to_json_safe(v) for k, v in row.to_dict().items()}
                try:
                    c = Company(
                        name=str(raw.get(next((k for k, v in mapping.items() if v == "name"), ""), "") or ""),
                        city=str(raw.get(next((k for k, v in mapping.items() if v == "city"), ""), "") or ""),
                        industry=str(raw.get(next((k for k, v in mapping.items() if v == "industry"), ""), "") or ""),
                        address=str(raw.get(next((k for k, v in mapping.items() if v == "address"), ""), "") or ""),
                        tags=[],
                        raw_data=raw,
                        import_id=import_id,
                        source_row=idx + 2,
                    )
                    if not c.name:
                        c.name = "未知企业"
                    db.add(c)
                    success_rows += 1
                except Exception as exc:  # pragma: no cover
                    failed_rows += 1
                    error_messages.append(f"{sheet_name}#{idx+2}: {exc}")
            db.commit()

        task.status = "success" if failed_rows == 0 else "partial"
        task.total_rows = total_rows
        task.success_rows = success_rows
        task.failed_rows = failed_rows
        task.error_log = "\n".join(error_messages[:1000]) if error_messages else None
        task.finished_at = datetime.utcnow()
        db.commit()
    except Exception as exc:
        db.rollback()
        task.status = "failed"
        task.error_log = str(exc)
        task.finished_at = datetime.utcnow()
        db.commit()
        raise

    return import_id, total_rows
