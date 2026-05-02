#!/usr/bin/env python
"""
初始化管理员用户脚本
"""

from app.database import SessionLocal, Base, engine
from app.models import User
from passlib.context import CryptContext
import sys

# 创建表
Base.metadata.create_all(bind=engine)

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin_user():
    """创建管理员用户"""
    db = SessionLocal()

    # 检查是否已存在管理员
    existing_admin = db.query(User).filter(User.role == "admin").first()
    if existing_admin:
        print(f"管理员用户已存在: {existing_admin.username}")
        return

    # 创建管理员用户
    admin_username = "admin"
    admin_email = "admin@example.com"
    admin_password = "Admin123!@#"

    # 检查用户名是否已存在
    if db.query(User).filter(User.username == admin_username).first():
        print(f"用户名 {admin_username} 已存在")
        return

    # 创建用户
    hashed_password = pwd_context.hash(admin_password)
    admin_user = User(
        username=admin_username,
        email=admin_email,
        hashed_password=hashed_password,
        role="admin",
        is_active=1
    )

    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    print(f"管理员用户创建成功！")
    print(f"用户名: {admin_username}")
    print(f"邮箱: {admin_email}")
    print(f"密码: {admin_password}")
    print(f"请立即修改默认密码！")

if __name__ == "__main__":
    create_admin_user()