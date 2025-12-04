#!/usr/bin/env python3
"""
Build script for SuperDoc Python SDK wheel.

This script:
1. Builds the TypeScript service
2. Bundles the service (dist/ + node_modules/) into the Python package
3. Builds the wheel

Usage:
    python scripts/build_wheel.py

Requirements:
    - Node.js 18+
    - npm
    - Python build module: pip install build

Output:
    - dist/superdoc_sdk-*.whl
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

# Paths
SCRIPT_DIR = Path(__file__).parent
PYTHON_SDK_DIR = SCRIPT_DIR.parent
SERVICE_SRC_DIR = PYTHON_SDK_DIR.parent.parent / "src" / "service"
PACKAGE_DIR = PYTHON_SDK_DIR / "superdoc_sdk"
BUNDLED_SERVICE_DIR = PACKAGE_DIR / "service"


def run(cmd: list[str], cwd: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    """Run a command and print output."""
    print(f"  → {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if check and result.returncode != 0:
        print(f"Command failed with exit code {result.returncode}")
        sys.exit(1)
    return result


def clean():
    """Clean previous build artifacts."""
    print("\n🧹 Cleaning previous builds...")

    # Clean Python build artifacts
    for path in [
        PYTHON_SDK_DIR / "dist",
        PYTHON_SDK_DIR / "build",
        PYTHON_SDK_DIR / "superdoc_sdk.egg-info",
        BUNDLED_SERVICE_DIR,
    ]:
        if path.exists():
            print(f"  Removing {path}")
            shutil.rmtree(path)

    # Clean pycache
    for pycache in PYTHON_SDK_DIR.rglob("__pycache__"):
        shutil.rmtree(pycache)


def build_service():
    """Build the TypeScript service."""
    print("\n📦 Building TypeScript service...")

    if not SERVICE_SRC_DIR.exists():
        print(f"Error: Service directory not found at {SERVICE_SRC_DIR}")
        sys.exit(1)

    # Install npm dependencies
    print("  Installing npm dependencies...")
    run(["npm", "install"], cwd=SERVICE_SRC_DIR)

    # Build TypeScript
    print("  Compiling TypeScript...")
    run(["npm", "run", "build"], cwd=SERVICE_SRC_DIR)

    # Verify build output
    dist_dir = SERVICE_SRC_DIR / "dist"
    if not dist_dir.exists() or not (dist_dir / "index.js").exists():
        print("Error: TypeScript build failed - dist/index.js not found")
        sys.exit(1)

    print("  ✓ Service built successfully")


def bundle_service():
    """Bundle the service into the Python package."""
    print("\n📁 Bundling service into Python package...")

    # Create package directory structure
    PACKAGE_DIR.mkdir(exist_ok=True)
    BUNDLED_SERVICE_DIR.mkdir(exist_ok=True)

    # Copy dist/ (compiled TypeScript)
    src_dist = SERVICE_SRC_DIR / "dist"
    dst_dist = BUNDLED_SERVICE_DIR / "dist"
    print(f"  Copying {src_dist} → {dst_dist}")
    shutil.copytree(src_dist, dst_dist)

    # Copy node_modules/ (dependencies)
    src_modules = SERVICE_SRC_DIR / "node_modules"
    dst_modules = BUNDLED_SERVICE_DIR / "node_modules"
    print(f"  Copying {src_modules} → {dst_modules}")
    print("  (this may take a moment...)")
    shutil.copytree(src_modules, dst_modules, symlinks=True)

    # Copy package.json (needed for Node.js to resolve modules)
    src_pkg = SERVICE_SRC_DIR / "package.json"
    dst_pkg = BUNDLED_SERVICE_DIR / "package.json"
    print(f"  Copying {src_pkg} → {dst_pkg}")
    shutil.copy2(src_pkg, dst_pkg)

    # Calculate size
    total_size = sum(f.stat().st_size for f in BUNDLED_SERVICE_DIR.rglob("*") if f.is_file())
    print(f"  ✓ Bundled service size: {total_size / 1024 / 1024:.1f} MB")


def create_package_init():
    """Create __init__.py for the package."""
    print("\n📝 Creating package __init__.py...")

    init_file = PACKAGE_DIR / "__init__.py"
    init_content = '''"""
SuperDoc SDK for Python

Usage:
    from superdoc_sdk import SuperdocClient, SuperdocAsyncClient

    # Sync API
    with SuperdocClient().get_editor("doc.docx") as editor:
        html = editor.get_html()

    # Async API (requires aiohttp)
    async with SuperdocAsyncClient() as client:
        async with await client.get_editor("doc.docx") as editor:
            html = await editor.get_html()
"""

# Re-export from main module
from superdoc_sdk.superdoc_sdk import (
    SuperdocClient,
    SuperdocAsyncClient,
    Editor,
    AsyncEditor,
    SuperdocError,
    shutdown,
)

__all__ = [
    "SuperdocClient",
    "SuperdocAsyncClient",
    "Editor",
    "AsyncEditor",
    "SuperdocError",
    "shutdown",
]

__version__ = "0.2.0"
'''

    init_file.write_text(init_content)
    print(f"  Created {init_file}")


def copy_sdk_module():
    """Copy the main SDK module into the package."""
    print("\n📝 Copying SDK module...")

    src = PYTHON_SDK_DIR / "superdoc_sdk.py"
    dst = PACKAGE_DIR / "superdoc_sdk.py"

    print(f"  Copying {src} → {dst}")
    shutil.copy2(src, dst)


def create_py_typed():
    """Create py.typed marker for PEP 561."""
    print("\n📝 Creating py.typed marker...")

    py_typed = PACKAGE_DIR / "py.typed"
    py_typed.touch()
    print(f"  Created {py_typed}")


def build_wheel():
    """Build the Python wheel."""
    print("\n🔨 Building wheel...")

    # Check if build module is available
    try:
        import build
    except ImportError:
        print("  Installing build module...")
        run([sys.executable, "-m", "pip", "install", "build"])

    # Build wheel
    run([sys.executable, "-m", "build", "--wheel"], cwd=PYTHON_SDK_DIR)

    # Find the built wheel
    dist_dir = PYTHON_SDK_DIR / "dist"
    wheels = list(dist_dir.glob("*.whl"))

    if wheels:
        wheel = wheels[0]
        size = wheel.stat().st_size / 1024 / 1024
        print(f"\n✅ Built: {wheel.name} ({size:.1f} MB)")
    else:
        print("\n❌ No wheel found in dist/")
        sys.exit(1)


def main():
    print("=" * 60)
    print("SuperDoc Python SDK - Wheel Builder")
    print("=" * 60)

    # Verify we're in the right place
    if not (PYTHON_SDK_DIR / "pyproject.toml").exists():
        print(f"Error: pyproject.toml not found in {PYTHON_SDK_DIR}")
        sys.exit(1)

    clean()
    build_service()
    bundle_service()
    create_package_init()
    copy_sdk_module()
    create_py_typed()
    build_wheel()

    print("\n" + "=" * 60)
    print("Done! Wheel is ready in dist/")
    print("=" * 60)
    print("\nTo test locally:")
    print("  pip install dist/superdoc_sdk-*.whl")
    print("\nTo upload to PyPI:")
    print("  twine upload dist/*")


if __name__ == "__main__":
    main()
