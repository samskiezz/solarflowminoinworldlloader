#!/usr/bin/env python3
"""
SolarFlow Installation Verification
Tests all components to ensure everything is working
"""

import sys
import subprocess
import importlib
import requests
import time
import json
from pathlib import Path

class InstallationVerifier:
    def __init__(self):
        self.results = []
        self.failed_tests = []
        
    def log_test(self, name, success, details=""):
        status = "✅ PASS" if success else "❌ FAIL"
        self.results.append(f"{status} {name}")
        if details:
            self.results.append(f"    {details}")
        if not success:
            self.failed_tests.append(name)
        print(f"{status} {name}")
        if details:
            print(f"    {details}")
    
    def test_python_environment(self):
        """Test Python and virtual environment"""
        print("\n🐍 Testing Python Environment")
        print("=" * 40)
        
        # Python version
        version = sys.version_info
        success = version.major == 3 and version.minor >= 9
        self.log_test(
            "Python Version", 
            success,
            f"Python {version.major}.{version.minor}.{version.micro} ({'OK' if success else 'Need 3.9+'})"
        )
        
        # Virtual environment
        in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
        self.log_test("Virtual Environment", in_venv, "Running in venv" if in_venv else "Not in virtual environment")
    
    def test_ml_libraries(self):
        """Test ML library installations"""
        print("\n🧠 Testing ML Libraries")
        print("=" * 40)
        
        libraries = [
            ("NumPy", "numpy"),
            ("Pandas", "pandas"),
            ("Matplotlib", "matplotlib"),
            ("Scikit-learn", "sklearn"),
            ("TensorFlow", "tensorflow"),
            ("PyTorch", "torch"),
            ("OpenCV", "cv2"),
            ("Transformers", "transformers"),
            ("NLTK", "nltk"),
            ("FastAPI", "fastapi"),
            ("Streamlit", "streamlit")
        ]
        
        installed_count = 0
        for name, import_name in libraries:
            try:
                module = importlib.import_module(import_name)
                version = getattr(module, '__version__', 'Unknown')
                self.log_test(f"{name}", True, f"v{version}")
                installed_count += 1
            except ImportError as e:
                self.log_test(f"{name}", False, f"Import failed: {e}")
        
        self.log_test(
            "ML Libraries Summary", 
            installed_count >= 8,
            f"{installed_count}/{len(libraries)} libraries installed"
        )
    
    def test_neural_cluster(self):
        """Test neural cluster repository installation"""
        print("\n🏗️ Testing Neural Cluster")
        print("=" * 40)
        
        cluster_dir = Path("neural_cluster_200")
        exists = cluster_dir.exists()
        self.log_test("Neural Cluster Directory", exists)
        
        if exists:
            repos = [d for d in cluster_dir.iterdir() if d.is_dir()]
            repo_count = len(repos)
            
            # Test some key repositories
            key_repos = ["pytorch", "tensorflow", "transformers", "opencv-python", "scikit-learn"]
            found_repos = [repo for repo in key_repos if (cluster_dir / repo).exists()]
            
            self.log_test(
                "Repository Count", 
                repo_count >= 50,
                f"{repo_count} repositories installed"
            )
            
            self.log_test(
                "Key Repositories",
                len(found_repos) >= 3,
                f"Found: {', '.join(found_repos)}"
            )
            
            # Calculate total size
            try:
                total_size = sum(
                    sum(f.stat().st_size for f in repo_dir.rglob('*') if f.is_file())
                    for repo_dir in repos[:10]  # Sample first 10 for speed
                )
                size_gb = total_size / (1024**3)
                self.log_test("Cluster Size", size_gb > 0.5, f"~{size_gb:.1f}GB estimated")
            except Exception as e:
                self.log_test("Cluster Size", False, f"Size calculation failed: {e}")
    
    def test_system_services(self):
        """Test system services"""
        print("\n🔧 Testing System Services")
        print("=" * 40)
        
        services = [
            ("nginx", "nginx"),
            ("postgresql", "postgresql"),
            ("redis-server", "redis-server"),
            ("supervisor", "supervisor")
        ]
        
        for service_name, systemctl_name in services:
            try:
                result = subprocess.run(
                    ["systemctl", "is-active", systemctl_name],
                    capture_output=True, text=True, timeout=5
                )
                active = result.stdout.strip() == "active"
                self.log_test(f"{service_name.title()}", active, "Active" if active else "Inactive/Missing")
            except Exception as e:
                self.log_test(f"{service_name.title()}", False, f"Check failed: {e}")
    
    def test_api_endpoints(self):
        """Test API endpoints"""
        print("\n🌐 Testing API Endpoints")
        print("=" * 40)
        
        base_url = "http://localhost:8000"
        
        endpoints = [
            ("/", "Root endpoint"),
            ("/system/health", "Health check"),
            ("/neural/status", "Neural status"),
            ("/neural/repositories", "Repository list"),
            ("/docs", "API documentation")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{base_url}{endpoint}", timeout=10)
                success = response.status_code == 200
                
                if success and endpoint == "/neural/status":
                    # Test neural status response
                    try:
                        data = response.json()
                        neural_active = data.get("neural_cluster_active", False)
                        repo_count = data.get("repositories", {}).get("installed", 0)
                        self.log_test(
                            "Neural Status Data",
                            neural_active and repo_count > 0,
                            f"Neural active: {neural_active}, Repos: {repo_count}"
                        )
                    except Exception as e:
                        self.log_test("Neural Status Data", False, f"JSON parse failed: {e}")
                
                self.log_test(
                    f"API {description}",
                    success,
                    f"HTTP {response.status_code}"
                )
            except requests.exceptions.RequestException as e:
                self.log_test(f"API {description}", False, f"Connection failed: {e}")
            except Exception as e:
                self.log_test(f"API {description}", False, f"Error: {e}")
    
    def test_database_connectivity(self):
        """Test database connections"""
        print("\n💾 Testing Database Connectivity")
        print("=" * 40)
        
        # PostgreSQL
        try:
            import psycopg2
            conn = psycopg2.connect(
                host="localhost",
                database="solarflow",
                user="solarflow",
                password="solarflow_password"
            )
            conn.close()
            self.log_test("PostgreSQL", True, "Connection successful")
        except ImportError:
            self.log_test("PostgreSQL", False, "psycopg2 not installed")
        except Exception as e:
            self.log_test("PostgreSQL", False, f"Connection failed: {e}")
        
        # Redis
        try:
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0)
            ping_result = r.ping()
            self.log_test("Redis", ping_result, "Connection successful")
        except ImportError:
            self.log_test("Redis", False, "redis package not installed")
        except Exception as e:
            self.log_test("Redis", False, f"Connection failed: {e}")
    
    def test_neural_optimization(self):
        """Test neural optimization functionality"""
        print("\n⚡ Testing Neural Optimization")
        print("=" * 40)
        
        try:
            # Start optimization task
            response = requests.post(
                "http://localhost:8000/neural/optimize",
                json={"target": "test"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                task_id = data.get("task_id")
                
                self.log_test("Optimization Start", True, f"Task ID: {task_id}")
                
                # Wait and check task status
                time.sleep(3)
                status_response = requests.get(f"http://localhost:8000/neural/tasks/{task_id}", timeout=10)
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    progress = status_data.get("progress", "0")
                    self.log_test("Task Progress", True, f"Progress: {progress}%")
                else:
                    self.log_test("Task Progress", False, "Status check failed")
            else:
                self.log_test("Optimization Start", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Neural Optimization", False, f"Error: {e}")
    
    def generate_report(self):
        """Generate final verification report"""
        print("\n📊 VERIFICATION REPORT")
        print("=" * 50)
        
        total_tests = len(self.results)
        failed_count = len(self.failed_tests)
        passed_count = total_tests - failed_count
        success_rate = (passed_count / total_tests) * 100 if total_tests > 0 else 0
        
        print(f"📈 Results: {passed_count}/{total_tests} tests passed ({success_rate:.1f}%)")
        print(f"✅ Passed: {passed_count}")
        print(f"❌ Failed: {failed_count}")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   • {test}")
        
        print(f"\n🎯 Overall Status: {'✅ OPERATIONAL' if success_rate >= 80 else '⚠️ NEEDS ATTENTION'}")
        
        # Save report
        report_data = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "total_tests": total_tests,
            "passed": passed_count,
            "failed": failed_count,
            "success_rate": success_rate,
            "failed_tests": self.failed_tests,
            "status": "operational" if success_rate >= 80 else "needs_attention"
        }
        
        with open("verification_report.json", "w") as f:
            json.dump(report_data, f, indent=2)
        
        print(f"\n📄 Report saved to: verification_report.json")
        
        return success_rate >= 80

def main():
    print("🔍 SolarFlow Neural Cluster Verification")
    print("=" * 50)
    print("This script verifies the complete installation")
    print()
    
    verifier = InstallationVerifier()
    
    # Run all tests
    verifier.test_python_environment()
    verifier.test_ml_libraries()
    verifier.test_neural_cluster()
    verifier.test_system_services()
    verifier.test_database_connectivity()
    verifier.test_api_endpoints()
    verifier.test_neural_optimization()
    
    # Generate final report
    success = verifier.generate_report()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()