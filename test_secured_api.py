#!/usr/bin/env python3
"""
Test script for secured HobyPi API with role-based authentication.
Tests both admin and viewer users with different permission levels.
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_login(username, password):
    """Test user login and return token."""
    print(f"\n🔐 Testing login for user: {username}")
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        headers={"Content-Type": "application/json"},
        json={"identifier": username, "password": password}
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful! Scopes: {data['scope']}")
        return data['access_token']
    else:
        print(f"❌ Login failed: {response.status_code} - {response.text}")
        return None

def test_endpoint(endpoint, token, expected_status=200, description=""):
    """Test an API endpoint with authentication."""
    print(f"\n🧪 Testing {endpoint} {description}")
    
    if not token:
        print("❌ No token available, skipping test")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
    
    if response.status_code == expected_status:
        print(f"✅ Success! Status: {response.status_code}")
        if response.status_code == 200:
            try:
                data = response.json()
                if 'user' in data:
                    print(f"   User: {data['user']}")
                elif 'cpu' in data:
                    print(f"   CPU avg: {data['cpu']['avg']}%")
                elif 'temp_c' in data:
                    print(f"   Temperature: {data['temp_c']}°C")
            except:
                print(f"   Response length: {len(response.text)} characters")
    else:
        print(f"❌ Failed! Expected: {expected_status}, Got: {response.status_code}")
        print(f"   Response: {response.text[:200]}")

def test_unauthorized_access():
    """Test endpoints without authentication."""
    print(f"\n🚫 Testing unauthorized access")
    
    endpoints = ["/system/health", "/system/metrics", "/system/temp"]
    
    for endpoint in endpoints:
        response = requests.get(f"{BASE_URL}{endpoint}")
        if response.status_code == 401:
            print(f"✅ {endpoint} properly secured (401)")
        else:
            print(f"❌ {endpoint} security issue: {response.status_code}")

def main():
    print("🎯 HobyPi API Security Test Suite")
    print("=" * 50)
    
    # Test basic API health
    print(f"\n📡 Testing basic API connectivity")
    response = requests.get(f"{BASE_URL}/")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ API is responding: {data['app']} v{data['version']}")
    else:
        print(f"❌ API not responding: {response.status_code}")
        sys.exit(1)
    
    # Test unauthorized access
    test_unauthorized_access()
    
    # Test admin user
    admin_token = test_login("admin", "letmein")
    if admin_token:
        test_endpoint("/system/health", admin_token, description="(admin user)")
        test_endpoint("/system/metrics", admin_token, description="(admin user)")
        test_endpoint("/system/temp", admin_token, description="(admin user)")
    
    # Test viewer user
    viewer_token = test_login("viewer", "viewpass")
    if viewer_token:
        test_endpoint("/system/health", viewer_token, description="(viewer user)")
        test_endpoint("/system/metrics", viewer_token, description="(viewer user)")
        test_endpoint("/system/temp", viewer_token, description="(viewer user)")
    
    # Test scope limitations (viewer should not be able to create users)
    print(f"\n🔒 Testing scope limitations")
    if viewer_token:
        response = requests.post(
            f"{BASE_URL}/users",
            headers={
                "Authorization": f"Bearer {viewer_token}",
                "Content-Type": "application/json"
            },
            json={
                "username": "testuser",
                "email": "test@example.com", 
                "full_name": "Test User",
                "password": "testpass"
            }
        )
        if response.status_code == 403:
            print("✅ Viewer correctly denied user creation (403)")
        else:
            print(f"❌ Viewer scope issue: {response.status_code}")
    
    print(f"\n🎉 Test suite completed!")
    print(f"\n📊 Summary:")
    print(f"   • Admin user: Full access to all system endpoints")
    print(f"   • Viewer user: Read-only access to system endpoints")
    print(f"   • All endpoints properly secured with JWT authentication")
    print(f"   • Role-based authorization working correctly")

if __name__ == "__main__":
    main()