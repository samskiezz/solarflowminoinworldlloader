#!/usr/bin/env python3
"""
Simple Neural API Server for Hostinger VPS
Real neural cluster status and management
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Initialize FastAPI
app = FastAPI(
    title="SolarFlow Neural Cluster API",
    description="Real neural cluster running on Hostinger VPS",
    version="2.2.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "SolarFlow Neural Cluster API - Hostinger VPS",
        "version": "2.2.0",
        "status": "operational",
        "server": "Hostinger VPS via OpenClaw",
        "neural_cluster": "active"
    }

@app.get("/neural/status")
async def neural_status():
    """Get current neural cluster status - REAL DATA"""
    try:
        cluster_dir = Path("neural_cluster_200")
        repositories = []
        total_size = 0.0
        
        if cluster_dir.exists():
            for repo_path in cluster_dir.iterdir():
                if repo_path.is_dir():
                    try:
                        size_mb = sum(f.stat().st_size for f in repo_path.rglob('*') if f.is_file()) / (1024 * 1024)
                        repositories.append({
                            "name": repo_path.name,
                            "size_mb": round(size_mb, 2),
                            "status": "installed",
                            "path": str(repo_path)
                        })
                        total_size += size_mb
                    except:
                        repositories.append({
                            "name": repo_path.name,
                            "status": "error",
                            "size_mb": 0
                        })
        
        # Test ML libraries that are actually installed
        ml_libraries = []
        test_imports = [
            ("numpy", "numpy"),
            ("pandas", "pandas"),
            ("matplotlib", "matplotlib"),
            ("scikit-learn", "sklearn"),
            ("requests", "requests"),
            ("fastapi", "fastapi"),
            ("transformers", "transformers"),
            ("torch", "torch"),
            ("tensorflow", "tensorflow"),
        ]
        
        for lib_name, import_name in test_imports:
            try:
                module = __import__(import_name)
                version = getattr(module, '__version__', 'Unknown')
                ml_libraries.append({
                    "name": lib_name,
                    "status": "installed",
                    "version": version
                })
            except ImportError:
                ml_libraries.append({
                    "name": lib_name,
                    "status": "not_installed"
                })
        
        return {
            "neural_cluster_active": True,
            "server_info": {
                "hostname": os.uname().nodename,
                "platform": f"{os.uname().sysname} {os.uname().release}",
                "python_version": sys.version.split()[0],
                "cpu_cores": os.cpu_count(),
                "working_directory": str(Path.cwd())
            },
            "repositories": {
                "installed": len(repositories),
                "total_size_gb": round(total_size / 1024, 2),
                "list": repositories[:20]  # First 20 for display
            },
            "ml_libraries": ml_libraries,
            "installation_summary": {
                "total_repositories": len(repositories),
                "successful_installs": len([r for r in repositories if r["status"] == "installed"]),
                "working_ml_libraries": len([l for l in ml_libraries if l["status"] == "installed"]),
                "cluster_operational": len(repositories) > 50 and len([l for l in ml_libraries if l["status"] == "installed"]) > 3
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Neural status error: {str(e)}", "neural_cluster_active": False}
        )

@app.get("/neural/repositories")
async def list_repositories():
    """List all installed repositories with details"""
    cluster_dir = Path("neural_cluster_200")
    if not cluster_dir.exists():
        return {"repositories": [], "total": 0}
    
    repositories = []
    for repo_path in cluster_dir.iterdir():
        if repo_path.is_dir():
            try:
                # Count Python files
                python_files = len(list(repo_path.rglob('*.py')))
                
                # Try to get repository description
                readme_files = list(repo_path.glob("README*"))
                description = "ML/AI Repository"
                if readme_files:
                    try:
                        with open(readme_files[0], 'r', encoding='utf-8', errors='ignore') as f:
                            lines = f.readlines()[:3]
                            description = ' '.join(lines).strip()[:150] + "..."
                    except:
                        pass
                
                repositories.append({
                    "name": repo_path.name,
                    "description": description,
                    "python_files": python_files,
                    "size_mb": round(sum(f.stat().st_size for f in repo_path.rglob('*') if f.is_file()) / (1024 * 1024), 2),
                    "last_modified": os.path.getmtime(repo_path)
                })
            except Exception as e:
                repositories.append({
                    "name": repo_path.name,
                    "description": f"Error accessing repository: {e}",
                    "python_files": 0,
                    "size_mb": 0
                })
    
    return {
        "repositories": sorted(repositories, key=lambda x: x["name"]),
        "total": len(repositories),
        "summary": {
            "total_python_files": sum(r["python_files"] for r in repositories),
            "total_size_gb": round(sum(r["size_mb"] for r in repositories) / 1024, 2)
        }
    }

@app.get("/neural/verify")
async def verify_installation():
    """Verify neural cluster installation"""
    cluster_dir = Path("neural_cluster_200")
    
    # Check key repositories
    key_repos = ["pytorch", "tensorflow", "transformers", "scikit-learn", "opencv-python", "fastapi"]
    found_repos = []
    for repo in key_repos:
        if (cluster_dir / repo).exists():
            found_repos.append(repo)
    
    # Check system resources
    import shutil
    disk_usage = shutil.disk_usage(".")
    
    verification = {
        "cluster_directory_exists": cluster_dir.exists(),
        "total_repositories": len(list(cluster_dir.iterdir())) if cluster_dir.exists() else 0,
        "key_repositories_found": found_repos,
        "system_resources": {
            "disk_free_gb": round(disk_usage.free / (1024**3), 2),
            "disk_total_gb": round(disk_usage.total / (1024**3), 2),
            "cpu_cores": os.cpu_count(),
            "python_version": sys.version.split()[0]
        },
        "installation_health": "healthy" if len(found_repos) >= 3 else "needs_attention"
    }
    
    return verification

@app.get("/system/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "neural_api": "operational",
            "neural_cluster": Path("neural_cluster_200").exists(),
            "file_system": "accessible",
            "python_environment": "functional"
        },
        "server": "Hostinger VPS via OpenClaw"
    }

if __name__ == "__main__":
    print("🧠 Starting SolarFlow Neural API on Hostinger VPS...")
    print("📊 Cluster status: http://localhost:8000/neural/status")
    print("🔍 Health check: http://localhost:8000/system/health") 
    print("📋 API docs: http://localhost:8000/docs")
    
    uvicorn.run(
        "simple_neural_api:app",
        host="0.0.0.0",
        port=8000,
        reload=False
    )