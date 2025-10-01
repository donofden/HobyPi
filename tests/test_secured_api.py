#!/usr/bin/env python3
import requests
import sys
import argparse

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    
    base_url = f"http://{args.host}:{args.port}"
    print("🎯 HobyPi API Security Test Suite")
    print("=" * 50)
    
    # Test admin login
    print(f"\n🔐 Testing login for user: admin")
    response = requests.post(f"{base_url}/auth/login", 
                           headers={"Content-Type": "application/json"},
                           json={"identifier": "admin", "password": "letmein"})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful! Scopes: {data['scope']}")
    else:
        print(f"❌ Login failed: {response.status_code}")
    
    # Test viewer login  
    print(f"\n🔐 Testing login for user: viewer")
    response = requests.post(f"{base_url}/auth/login",
                           headers={"Content-Type": "application/json"}, 
                           json={"identifier": "viewer", "password": "letmein"})
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful! Scopes: {data['scope']}")
    else:
        print(f"❌ Login failed: {response.status_code}")
    
    print(f"\n🎉 Test suite completed!")

if __name__ == "__main__":
    main()
