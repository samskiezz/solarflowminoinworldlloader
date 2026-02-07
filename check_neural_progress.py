#!/usr/bin/env python3
"""
Check actual neural package installation progress
"""

import sys
import json
from pathlib import Path

# Packages we're installing
target_packages = [
    'numpy', 'scipy', 'pandas', 'matplotlib', 'plotly', 'seaborn',
    'scikit-learn', 'requests', 'beautifulsoup4', 'lxml', 'nltk',
    'textblob', 'fastapi', 'flask', 'jupyter', 'tqdm', 'rich',
    'psutil', 'sympy', 'networkx', 'opencv-python', 'streamlit',
    'gradio', 'dash', 'tensorflow', 'torch', 'transformers'
]

installed_packages = []
failed_packages = []

print("🧠 Checking Neural Cluster Installation Status...")
print(f"Target packages: {len(target_packages)}")

for pkg in target_packages:
    try:
        # Try different import variations
        import_names = [
            pkg.replace('-', '_'),
            pkg.replace('_', '-'),
            pkg.split('-')[0] if '-' in pkg else pkg
        ]
        
        installed = False
        for import_name in import_names:
            try:
                __import__(import_name)
                installed = True
                break
            except ImportError:
                continue
        
        if installed:
            installed_packages.append(pkg)
            print(f"✅ {pkg}")
        else:
            failed_packages.append(pkg)
            print(f"❌ {pkg}")
            
    except Exception as e:
        failed_packages.append(pkg)
        print(f"❌ {pkg} - Error: {e}")

print(f"\n📊 NEURAL STATUS:")
print(f"✅ Installed: {len(installed_packages)}/{len(target_packages)} ({len(installed_packages)/len(target_packages)*100:.1f}%)")
print(f"❌ Failed/Missing: {len(failed_packages)}")

if failed_packages:
    print(f"Missing: {', '.join(failed_packages[:10])}")

# Update status file
status = {
    "neural_cluster_status": "INSTALLING" if len(failed_packages) > 5 else "OPERATIONAL",
    "packages_installed": len(installed_packages),
    "total_packages": len(target_packages),
    "progress_percent": (len(installed_packages) / len(target_packages)) * 100,
    "installed_packages": installed_packages,
    "failed_packages": failed_packages,
    "installation_active": len(failed_packages) > 0,
    "neural_operational": len(installed_packages) >= 15
}

# Save to docs folder
docs_dir = Path("docs")
docs_dir.mkdir(exist_ok=True)

with open(docs_dir / "neural_installation_status.json", "w") as f:
    json.dump(status, f, indent=2)

print(f"✅ Status saved to docs/neural_installation_status.json")

# Show successful installations
if installed_packages:
    print(f"\n🎉 Successfully installed packages:")
    for pkg in installed_packages[:10]:
        print(f"  • {pkg}")
    if len(installed_packages) > 10:
        print(f"  • ... and {len(installed_packages) - 10} more")