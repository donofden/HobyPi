#!/usr/bin/env python3
"""
HobyPi API Testing Script

Simple command-line tool to test the HobyPi API endpoints.
Can be run standalone or called from the Makefile.

Usage:
    python3 test_hobypi_api.py [--host HOST] [--port PORT] [--full]
"""
import argparse
import requests
import json
import sys
from typing import Optional

def test_endpoint(method: str, url: str, data: Optional[dict] = None, 
                 headers: Optional[dict] = None, description: str = ""):
    """Test an API endpoint and display results."""
    print(f"\n{'='*60}")
    print(f"TEST: {description}")
    print(f"{'='*60}")
    print(f"{method} {url}")
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        else:
            print(f"Unsupported method: {method}")
            return None
            
        print(f"Status: {response.status_code}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            print("Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"Response (non-JSON): {response.text[:500]}")
            
        return response
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def main():
    parser = argparse.ArgumentParser(description="Test HobyPi API endpoints")
    parser.add_argument("--host", default="localhost", help="API host")
    parser.add_argument("--port", default="8000", help="API port")
    parser.add_argument("--full", action="store_true", help="Run full test suite including auth")
    
    args = parser.parse_args()
    base_url = f"http://{args.host}:{args.port}"
    
    print("🚀 HobyPi API Test Suite")
    print(f"Testing API at: {base_url}")
    
    # Basic endpoints
    test_endpoint("GET", f"{base_url}/", description="Root endpoint health check")
    test_endpoint("GET", f"{base_url}/system/health", description="System health check")
    test_endpoint("GET", f"{base_url}/system/temp", description="CPU temperature")
    test_endpoint("GET", f"{base_url}/system/metrics?top_n=3", description="System metrics")
    
    if args.full:
        print(f"\n{'='*60}")
        print("🔐 AUTHENTICATION TESTS")
        print(f"{'='*60}")
        
        # Test authentication flow
        login_data = {"identifier": "admin", "password": "letmein"}
        login_response = test_endpoint(
            "POST", 
            f"{base_url}/auth/login", 
            data=login_data,
            description="Login with default admin user"
        )
        
        if login_response and login_response.status_code == 200:
            try:
                token_data = login_response.json()
                token = token_data.get("access_token")
                
                if token:
                    headers = {"Authorization": f"Bearer {token}"}
                    
                    test_endpoint(
                        "GET", 
                        f"{base_url}/auth/me", 
                        headers=headers,
                        description="Get current user profile"
                    )
                    
                    test_endpoint(
                        "GET", 
                        f"{base_url}/users", 
                        headers=headers,
                        description="List all users"
                    )
                else:
                    print("❌ No access token in login response")
            except json.JSONDecodeError:
                print("❌ Invalid JSON in login response")
        else:
            print("❌ Login failed - skipping authenticated tests")
    
    print(f"\n{'='*60}")
    print("✅ Test suite completed!")
    print(f"{'='*60}")
    
    if not args.full:
        print("\n💡 Tip: Use --full flag to test authentication endpoints")
    
    print(f"\n📚 Resources:")
    print(f"  • API Docs: {base_url}/docs")
    print(f"  • ReDoc: {base_url}/redoc")
    print(f"  • Run full tests: python3 {sys.argv[0]} --full")

if __name__ == "__main__":
    main()