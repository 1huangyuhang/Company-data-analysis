from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from ..database import get_db
from ..models import User
from ..schemas import UserResponse, ApiOk
from ..security import pwd_context, create_access_token, get_current_user, get_admin_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


@router.post("/login", response_model=ApiOk)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    user = db.query(User).filter(User.username == login_data.username).first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    if not pwd_context.verify(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误"
        )

    access_token = create_access_token(user.id, user.role)

    return ApiOk(data={
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(user)
    })


@router.post("/register", response_model=ApiOk)
def register(user_data: RegisterRequest, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查用户名和邮箱是否已存在
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )

    # 创建新用户
    hashed_password = pwd_context.hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 生成 token
    access_token = create_access_token(new_user.id, new_user.role)

    return ApiOk(data={
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.model_validate(new_user)
    })


@router.post("/logout", response_model=ApiOk)
def logout(current_user: User = Depends(get_current_user)):
    """用户登出"""
    # JWT 无状态，前端删除 token 即可
    return ApiOk(data={"message": "登出成功"})


@router.get("/me", response_model=ApiOk)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return ApiOk(data=UserResponse.model_validate(current_user))


@router.get("/users", response_model=ApiOk)
def list_users(
    page: int = 1,
    page_size: int = 20,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """列出所有用户（仅管理员）"""
    query = db.query(User)
    total = query.count()
    users = (
        query.order_by(User.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return ApiOk(data={
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [UserResponse.model_validate(user) for user in users]
    })


@router.post("/users", response_model=ApiOk)
def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """创建用户（仅管理员）"""
    # 检查用户名和邮箱是否已存在
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名已存在"
        )

    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="邮箱已被注册"
        )

    # 创建新用户
    hashed_password = pwd_context.hash(user_data.password)
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return ApiOk(data=UserResponse.model_validate(new_user))


@router.put("/users/{user_id}/status", response_model=ApiOk)
def update_user_status(
    user_id: int,
    is_active: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """更新用户状态（仅管理员）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="用户不存在"
        )

    user.is_active = is_active
    db.commit()

    return ApiOk(data={"message": "用户状态更新成功"})