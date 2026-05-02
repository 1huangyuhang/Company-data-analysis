#!/usr/bin/env python
"""
测试 API 接口
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import pytest

from app.main import app
from app.database import Base, get_db
from app.models import User
from app.schemas import UserResponse
from passlib.context import CryptContext

# 测试数据库
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# 创建测试数据库表
Base.metadata.create_all(bind=engine)

# 创建测试用户
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = TestingSessionLocal()
test_user = User(
    username="testuser",
    email="test@example.com",
    hashed_password=pwd_context.hash("testpassword"),
    role="user",
    is_active=1
)
db.add(test_user)
db.commit()
db.close()

def test_login_success():
    """测试成功登录"""
    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "testpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert "access_token" in data["data"]
    assert data["data"]["token_type"] == "bearer"
    print("✅ 登录测试通过")

def test_login_invalid_credentials():
    """测试无效凭证登录"""
    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    data = response.json()
    assert data["ok"] == False
    print("✅ 无效凭证测试通过")

def test_protected_route_without_auth():
    """测试无认证访问受保护路由"""
    response = client.get("/api/v1/companies/by-import/test123")
    assert response.status_code == 401
    print("✅ 无认证访问测试通过")

def test_auth_routes():
    """测试认证相关路由"""
    # 测试获取当前用户（未登录）
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

    # 登录
    response = client.post("/api/v1/auth/login", json={
        "username": "testuser",
        "password": "testpassword"
    })
    token = response.json()["data"]["access_token"]

    # 测试获取当前用户（已登录）
    response = client.get("/api/v1/auth/me", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["ok"] == True
    assert data["data"]["username"] == "testuser"

    # 测试登出
    response = client.post("/api/v1/auth/logout", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200

    print("✅ 认证路由测试通过")

if __name__ == "__main__":
    print("开始测试 API 接口...")
    print()

    try:
        test_login_success()
        test_login_invalid_credentials()
        test_protected_route_without_auth()
        test_auth_routes()

        print()
        print("🎉 所有测试通过！")

    except AssertionError as e:
        print(f"❌ 测试失败: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        # 清理测试数据库
        if os.path.exists("./test.db"):
            os.remove("./test.db")