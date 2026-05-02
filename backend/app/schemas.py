from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field, EmailStr


class ApiOk(BaseModel):
    ok: bool = True
    data: Dict[str, Any]


class ApiError(BaseModel):
    ok: bool = False
    error: Dict[str, Any]


class SearchFilters(BaseModel):
    city: List[str] = Field(default_factory=list)
    industry: List[str] = Field(default_factory=list)
    import_id: Optional[str] = None


class SearchRequest(BaseModel):
    keyword: str = ""
    match_mode: Literal["exact", "fuzzy"] = "fuzzy"
    filters: SearchFilters = Field(default_factory=SearchFilters)
    page: int = 1
    page_size: int = 20


class CompanyOut(BaseModel):
    id: int
    name: str
    city: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    raw_data: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        from_attributes = True


class CompanyUpdateRequest(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    tags: Optional[List[str]] = None
    raw_data: Optional[Dict[str, Any]] = None


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    is_active: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
