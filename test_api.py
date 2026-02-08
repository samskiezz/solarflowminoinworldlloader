#!/usr/bin/env python3
"""
Test script for SolarFlow Neural Production API
"""

import requests
import json
import time

def test_api_endpoint(url, description):
    """Test a single API endpoint"""
    try:
        print(f"🧪 Testing {description}...")
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success - {description}")
            if 'neural' in data:
                print(f"   📊 Neural status: {data['neural']['active']}")
            elif 'repositories' in data:
                print(f"   📁 Repositories: {data.get('count', 0)}")
            elif 'standards' in data:
                print(f"   📋 Standards: {data.get('count', 0)}")
            return True
        else:
            print(f"   ❌ Failed - {description} (Status: {response.status_code})")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"   🔌 Connection failed - {description} (Server not running?)")
        return False
    except Exception as e:
        print(f"   ❌ Error - {description}: {e}")
        return False

def main():
    """Test all API endpoints"""
    base_url = "http://localhost:3000"
    
    endpoints = [
        ("/", "Root endpoint"),
        ("/api/neural/status", "Neural status"),
        ("/api/neural/optimization", "Optimization metrics"),
        ("/api/neural/repositories", "Repository status"),
        ("/api/standards", "AS/NZS standards"),
        ("/api/cer/products", "CER products"),
        ("/api/health", "Health check")
    ]
    
    print("🔬 SolarFlow Neural API Test Suite")
    print("==================================")
    print(f"Testing server at: {base_url}")
    print()
    
    passed = 0
    total = len(endpoints)
    
    for endpoint, description in endpoints:
        url = base_url + endpoint
        if test_api_endpoint(url, description):
            passed += 1
        time.sleep(0.5)  # Small delay between tests
    
    print()
    print(f"📊 Test Results: {passed}/{total} endpoints passed")
    
    if passed == total:
        print("🎉 All tests passed! Neural API is fully functional.")
    elif passed > 0:
        print("⚠️  Some tests passed. Check server logs for details.")
    else:
        print("❌ All tests failed. Server may not be running.")
        print("💡 Try running: ./start_server.sh")

if __name__ == "__main__":
    main()