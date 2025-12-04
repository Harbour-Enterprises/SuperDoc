"""
SuperDoc SDK for Python

Quick usage (notebooks & scripts):
    from superdoc_sdk import superdoc

    html = superdoc.to_html("doc.docx")
    markdown = superdoc.to_markdown("doc.docx")
    superdoc.insert_and_save("doc.docx", "<p>Hello!</p>", "output.docx")

Full API (sync):
    from superdoc_sdk import SuperdocClient

    with SuperdocClient().get_editor("doc.docx") as editor:
        print(editor.get_json())
        editor.insert_content("<p>Hello!</p>")
        editor.export_docx("output.docx")

Full API (async):
    from superdoc_sdk import SuperdocAsyncClient

    async with SuperdocAsyncClient() as client:
        async with await client.get_editor("doc.docx") as editor:
            print(await editor.get_json())
            await editor.insert_content("<p>Hello!</p>")
            await editor.export_docx("output.docx")

The SDK automatically starts and manages the Node.js runtime.
For async support, install with: pip install superdoc-sdk[async]
"""

import atexit
import base64
import json
import socket
import subprocess
import threading
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Union, Optional, Any, TYPE_CHECKING

# Optional async support
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False

if TYPE_CHECKING:
    import aiohttp

# Module-level constants
SERVER_START_TIMEOUT = 30.0
SERVER_POLL_INTERVAL = 0.2
HEALTH_CHECK_TIMEOUT = 1
SHUTDOWN_TIMEOUT = 5
REQUEST_TIMEOUT = 60
MAX_RESTART_ATTEMPTS = 3
RESTART_DELAY = 1.0

__all__ = [
    # Convenience API
    "superdoc",
    # Full API
    "SuperdocClient",
    "SuperdocAsyncClient",
    "Editor",
    "AsyncEditor",
    "SuperdocError",
    "shutdown",
]


class SuperdocError(Exception):
    """Base exception for SuperDoc SDK errors"""
    pass


def _find_free_port() -> int:
    """Find an available port on localhost"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


class ServerProcessManager:
    """
    Thread-safe singleton manager for the Node.js server process.

    Handles server lifecycle including startup, health checks,
    auto-restart on crash, and graceful shutdown.
    """

    _instance: Optional["ServerProcessManager"] = None
    _instance_lock = threading.Lock()

    def __new__(cls) -> "ServerProcessManager":
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._lock = threading.Lock()
        self._process: Optional[subprocess.Popen] = None
        self._port: Optional[int] = None
        self._endpoint: Optional[str] = None
        self._restart_count = 0
        self._shutting_down = False
        self._initialized = True

    def _find_service_dir(self) -> Path:
        """Find the service directory"""
        # When installed via pip, service is bundled with the package
        pkg_dir = Path(__file__).parent

        # Check for bundled service first (pip install)
        bundled_service = pkg_dir / "service"
        if bundled_service.exists():
            return bundled_service

        # Fall back to development layout
        service_dir = pkg_dir.parent.parent / "src" / "service"
        if service_dir.exists():
            return service_dir

        raise SuperdocError(
            "Service directory not found. "
            "Make sure the SDK is properly installed."
        )

    def _find_server_script(self) -> Path:
        """Find the server entry point"""
        service_dir = self._find_service_dir()

        # Check for built TypeScript (dist/index.js)
        dist_entry = service_dir / "dist" / "index.js"
        if dist_entry.exists():
            return dist_entry

        # Fall back to legacy server.mjs (for backwards compatibility)
        legacy_server = service_dir / "server.mjs"
        if legacy_server.exists():
            return legacy_server

        raise SuperdocError(
            f"Server script not found. Run 'npm run build' in {service_dir}. "
            "Make sure the SDK is properly installed."
        )

    def _check_npm_installed(self) -> bool:
        """Check if npm dependencies are installed and built"""
        service_dir = self._find_service_dir()
        node_modules = service_dir / "node_modules"

        # Check for node_modules
        if not node_modules.exists():
            return False

        # Check for built dist (TypeScript service)
        dist_dir = service_dir / "dist"
        if dist_dir.exists() and (dist_dir / "index.js").exists():
            return True

        # Fall back to legacy check
        return (node_modules / "@superdoc-dev").exists()

    def _build_service(self) -> None:
        """Build the TypeScript service"""
        service_dir = self._find_service_dir()

        # Check if this is a TypeScript service
        if not (service_dir / "tsconfig.json").exists():
            return  # Legacy JS service, no build needed

        print("Building service (first run only)...")

        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=service_dir,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise SuperdocError(
                f"Failed to build service:\n{result.stderr}\n"
                "Make sure TypeScript is installed."
            )

        print("Build complete\n")

    def _install_npm_deps(self) -> None:
        """Install npm dependencies and build"""
        service_dir = self._find_service_dir()
        print("Installing Node.js dependencies (first run only)...")

        result = subprocess.run(
            ["npm", "install"],
            cwd=service_dir,
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise SuperdocError(
                f"Failed to install npm dependencies:\n{result.stderr}\n"
                "Make sure Node.js and npm are installed."
            )

        print("Dependencies installed\n")

        # Build TypeScript service if needed
        self._build_service()

    def _do_health_check(self, endpoint: str) -> bool:
        """Perform a health check ping"""
        try:
            req = urllib.request.Request(
                endpoint,
                data=json.dumps({"method": "ping", "params": {}}).encode(),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=HEALTH_CHECK_TIMEOUT) as resp:
                result = json.loads(resp.read())
                return result.get("result", {}).get("pong", False)
        except Exception:
            return False

    def _start_process(self, port: int) -> subprocess.Popen:
        """Start the Node.js server subprocess"""
        server_path = self._find_server_script()
        service_dir = self._find_service_dir()

        # Install deps if needed
        if not self._check_npm_installed():
            self._install_npm_deps()

        print("Starting SuperDoc runtime...")

        process = subprocess.Popen(
            ["node", str(server_path), str(port)],
            cwd=service_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        return process

    def _wait_for_ready(self, process: subprocess.Popen, port: int, timeout: float) -> bool:
        """Wait for server to be ready"""
        endpoint = f"http://localhost:{port}"
        start_time = time.time()

        while time.time() - start_time < timeout:
            if self._do_health_check(endpoint):
                print("Runtime ready\n")
                return True

            # Check if process died
            if process.poll() is not None:
                output = process.stdout.read() if process.stdout else ""
                raise SuperdocError(f"Server process died:\n{output}")

            time.sleep(SERVER_POLL_INTERVAL)

        return False

    def ensure_running(self) -> str:
        """
        Ensure the server is running and return its endpoint.

        Thread-safe. Auto-restarts if server crashed.

        Returns:
            Server endpoint URL (e.g., "http://localhost:12345")

        Raises:
            SuperdocError: If server fails to start
        """
        with self._lock:
            # Already running and healthy?
            if self._process is not None and self._process.poll() is None:
                if self._do_health_check(self._endpoint):
                    return self._endpoint
                # Process alive but not responding - kill and restart
                self._stop_process()

            # Process died - try to restart
            if self._process is not None and self._process.poll() is not None:
                if self._shutting_down:
                    raise SuperdocError("Server is shutting down")

                self._restart_count += 1
                if self._restart_count > MAX_RESTART_ATTEMPTS:
                    raise SuperdocError(
                        f"Server crashed {MAX_RESTART_ATTEMPTS} times. "
                        "Check Node.js installation and server logs."
                    )

                print(f"Server crashed, restarting (attempt {self._restart_count})...")
                time.sleep(RESTART_DELAY)

            # Start fresh
            port = _find_free_port()
            self._process = self._start_process(port)
            self._port = port
            self._endpoint = f"http://localhost:{port}"

            if not self._wait_for_ready(self._process, port, SERVER_START_TIMEOUT):
                self._stop_process()
                raise SuperdocError(f"Server failed to start within {SERVER_START_TIMEOUT}s")

            # Reset restart count on successful start
            self._restart_count = 0

            return self._endpoint

    def _stop_process(self) -> None:
        """Stop the server process (internal, no lock)"""
        if self._process is not None:
            try:
                self._process.terminate()
                self._process.wait(timeout=SHUTDOWN_TIMEOUT)
            except Exception:
                try:
                    self._process.kill()
                except Exception:
                    pass
            self._process = None
            self._port = None
            self._endpoint = None

    def stop(self) -> None:
        """
        Stop the server process.

        Thread-safe. Safe to call multiple times.
        """
        with self._lock:
            self._shutting_down = True
            self._stop_process()

    def is_running(self) -> bool:
        """Check if server is currently running"""
        with self._lock:
            return (
                self._process is not None
                and self._process.poll() is None
                and self._endpoint is not None
                and self._do_health_check(self._endpoint)
            )

    @property
    def endpoint(self) -> Optional[str]:
        """Get the current server endpoint, or None if not running"""
        with self._lock:
            return self._endpoint


# Global manager instance
_manager: Optional[ServerProcessManager] = None
_manager_lock = threading.Lock()


def _get_manager() -> ServerProcessManager:
    """Get or create the global server manager"""
    global _manager
    with _manager_lock:
        if _manager is None:
            _manager = ServerProcessManager()
        return _manager


def shutdown() -> None:
    """
    Shutdown the SuperDoc runtime.

    Stops the Node.js server process. Safe to call multiple times.
    After shutdown, creating new editors will restart the runtime.
    """
    manager = _get_manager()
    manager.stop()


# Register cleanup on exit
atexit.register(shutdown)


class Editor:
    """
    Editor instance for working with a DOCX document.

    Provides methods to read, modify, and export documents.
    Use as a context manager to ensure proper cleanup.

    Get an editor via SuperdocClient().get_editor(docx).
    """

    def __init__(self, client: "SuperdocClient", session_id: str):
        self._client = client
        self._session_id = session_id
        self._destroyed = False

    def get_json(self) -> dict:
        """
        Get document as ProseMirror JSON.

        Raises:
            SuperdocError: If the operation fails
        """
        return self._client._call("getJSON", sessionId=self._session_id)

    def get_html(self) -> str:
        """
        Get document as HTML.

        Raises:
            SuperdocError: If the operation fails
        """
        return self._client._call("getHTML", sessionId=self._session_id)

    def get_markdown(self) -> str:
        """
        Get document as Markdown.

        Raises:
            SuperdocError: If the operation fails
        """
        return self._client._call("getMarkdown", sessionId=self._session_id)

    def get_metadata(self) -> dict:
        """
        Get document metadata.

        Raises:
            SuperdocError: If the operation fails
        """
        return self._client._call("getMetadata", sessionId=self._session_id)

    def insert_content(self, content: Union[str, dict]) -> None:
        """
        Insert content into the document.

        Args:
            content: HTML string or ProseMirror JSON dict

        Raises:
            SuperdocError: If the operation fails
        """
        self._client._call("insertContent", sessionId=self._session_id, content=content)

    def export_docx(self, path: Optional[Union[str, Path]] = None) -> bytes:
        """
        Export document as DOCX.

        Args:
            path: Optional path to save the file. If not provided, returns bytes only.

        Returns:
            DOCX file as bytes

        Raises:
            SuperdocError: If the operation fails
        """
        result = self._client._call("exportDocx", sessionId=self._session_id)
        docx_bytes = base64.b64decode(result["docx"])

        if path:
            Path(path).write_bytes(docx_bytes)

        return docx_bytes

    def close(self) -> None:
        """
        Close the current document without destroying the editor.
        Editor returns to 'idle' state and can open a new document.

        Raises:
            SuperdocError: If the operation fails
        """
        self._client._call("close", sessionId=self._session_id)

    def open(self, docx: Union[str, Path, bytes]) -> None:
        """
        Open a new document in this editor instance.
        If a document is already open, it will be closed first.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Raises:
            SuperdocError: If the operation fails
        """
        if isinstance(docx, (str, Path)):
            docx_bytes = Path(docx).read_bytes()
        else:
            docx_bytes = docx

        docx_b64 = base64.b64encode(docx_bytes).decode("ascii")
        self._client._call("open", sessionId=self._session_id, docx=docx_b64)

    def get_lifecycle(self) -> str:
        """
        Get the current lifecycle state of the editor.

        Returns:
            One of: 'idle', 'opening', 'ready', 'closing', 'destroyed'

        Raises:
            SuperdocError: If the operation fails
        """
        result = self._client._call("getLifecycle", sessionId=self._session_id)
        return result["lifecycle"]

    def destroy(self) -> None:
        """Destroy the editor and release resources."""
        if not self._destroyed:
            try:
                self._client._call("destroy", sessionId=self._session_id)
            except Exception:
                pass  # Server may already be down
            self._destroyed = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.destroy()
        return False


class SuperdocClient:
    """
    Synchronous client for the SuperDoc SDK.

    The runtime starts automatically on first use and is shared
    across all client instances.

    Usage:
        with SuperdocClient().get_editor("doc.docx") as editor:
            html = editor.get_html()

    To explicitly stop the runtime:
        from superdoc_sdk import shutdown
        shutdown()
    """

    def __init__(self):
        """Initialize the client."""
        self._manager = _get_manager()
        self._endpoint: Optional[str] = None

    def _ensure_runtime(self) -> None:
        """Ensure the runtime is started"""
        self._endpoint = self._manager.ensure_running()

    def _call(self, method: str, **params) -> Any:
        """Make a synchronous API call"""
        if self._endpoint is None:
            self._ensure_runtime()

        data = json.dumps({"method": method, "params": params}).encode("utf-8")

        req = urllib.request.Request(
            self._endpoint,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )

        try:
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
                result = json.loads(response.read().decode("utf-8"))

                if "error" in result:
                    raise SuperdocError(result["error"])

                return result.get("result")

        except urllib.error.URLError as e:
            # Server may have crashed - clear endpoint to trigger restart
            self._endpoint = None
            raise SuperdocError(f"Connection failed: {e}")

    def ping(self) -> bool:
        """Check if the runtime is available."""
        try:
            result = self._call("ping")
            return result.get("pong", False)
        except Exception:
            return False

    def get_editor(self, docx: Union[str, Path, bytes]) -> Editor:
        """
        Get an editor for a DOCX document.

        Starts the runtime on first call if not already running.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            Editor instance

        Raises:
            SuperdocError: If the operation fails
        """
        self._ensure_runtime()

        if isinstance(docx, (str, Path)):
            docx_bytes = Path(docx).read_bytes()
        else:
            docx_bytes = docx

        docx_b64 = base64.b64encode(docx_bytes).decode("ascii")
        result = self._call("loadDocx", docx=docx_b64)

        return Editor(self, result["sessionId"])

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


# =============================================================================
# Async API
# =============================================================================

class AsyncEditor:
    """
    Async editor instance for working with a DOCX document.

    Provides async methods to read, modify, and export documents.
    Use as an async context manager to ensure proper cleanup.

    Get an editor via: await SuperdocAsyncClient().get_editor(docx)
    """

    def __init__(self, client: "SuperdocAsyncClient", session_id: str):
        self._client = client
        self._session_id = session_id
        self._destroyed = False

    async def get_json(self) -> dict:
        """
        Get document as ProseMirror JSON.

        Raises:
            SuperdocError: If the operation fails
        """
        return await self._client._call("getJSON", sessionId=self._session_id)

    async def get_html(self) -> str:
        """
        Get document as HTML.

        Raises:
            SuperdocError: If the operation fails
        """
        return await self._client._call("getHTML", sessionId=self._session_id)

    async def get_markdown(self) -> str:
        """
        Get document as Markdown.

        Raises:
            SuperdocError: If the operation fails
        """
        return await self._client._call("getMarkdown", sessionId=self._session_id)

    async def get_metadata(self) -> dict:
        """
        Get document metadata.

        Raises:
            SuperdocError: If the operation fails
        """
        return await self._client._call("getMetadata", sessionId=self._session_id)

    async def insert_content(self, content: Union[str, dict]) -> None:
        """
        Insert content into the document.

        Args:
            content: HTML string or ProseMirror JSON dict

        Raises:
            SuperdocError: If the operation fails
        """
        await self._client._call("insertContent", sessionId=self._session_id, content=content)

    async def export_docx(self, path: Optional[Union[str, Path]] = None) -> bytes:
        """
        Export document as DOCX.

        Args:
            path: Optional path to save the file. If not provided, returns bytes only.

        Returns:
            DOCX file as bytes

        Raises:
            SuperdocError: If the operation fails
        """
        result = await self._client._call("exportDocx", sessionId=self._session_id)
        docx_bytes = base64.b64decode(result["docx"])

        if path:
            Path(path).write_bytes(docx_bytes)

        return docx_bytes

    async def close(self) -> None:
        """
        Close the current document without destroying the editor.
        Editor returns to 'idle' state and can open a new document.

        Raises:
            SuperdocError: If the operation fails
        """
        await self._client._call("close", sessionId=self._session_id)

    async def open(self, docx: Union[str, Path, bytes]) -> None:
        """
        Open a new document in this editor instance.
        If a document is already open, it will be closed first.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Raises:
            SuperdocError: If the operation fails
        """
        if isinstance(docx, (str, Path)):
            docx_bytes = Path(docx).read_bytes()
        else:
            docx_bytes = docx

        docx_b64 = base64.b64encode(docx_bytes).decode("ascii")
        await self._client._call("open", sessionId=self._session_id, docx=docx_b64)

    async def get_lifecycle(self) -> str:
        """
        Get the current lifecycle state of the editor.

        Returns:
            One of: 'idle', 'opening', 'ready', 'closing', 'destroyed'

        Raises:
            SuperdocError: If the operation fails
        """
        result = await self._client._call("getLifecycle", sessionId=self._session_id)
        return result["lifecycle"]

    async def destroy(self) -> None:
        """Destroy the editor and release resources."""
        if not self._destroyed:
            try:
                await self._client._call("destroy", sessionId=self._session_id)
            except Exception:
                pass  # Server may already be down
            self._destroyed = True

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.destroy()
        return False


class SuperdocAsyncClient:
    """
    Async client for the SuperDoc SDK.

    Use this client in async contexts (FastAPI, aiohttp, etc.).
    The runtime starts automatically on first use and is shared
    across all client instances.

    Requires aiohttp: pip install superdoc-sdk[async]

    Usage:
        async with SuperdocAsyncClient() as client:
            async with await client.get_editor("doc.docx") as editor:
                html = await editor.get_html()

    To explicitly stop the runtime:
        from superdoc_sdk import shutdown
        shutdown()
    """

    def __init__(self):
        """Initialize the async client."""
        if not AIOHTTP_AVAILABLE:
            raise ImportError(
                "aiohttp is required for async support. "
                "Install with: pip install superdoc-sdk[async]"
            )

        self._manager = _get_manager()
        self._endpoint: Optional[str] = None
        self._session: Optional["aiohttp.ClientSession"] = None

    def _ensure_runtime(self) -> None:
        """Ensure the runtime is started (sync, but fast if already running)"""
        self._endpoint = self._manager.ensure_running()

    async def _get_session(self) -> "aiohttp.ClientSession":
        """Get or create the aiohttp session"""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT)
            )
        return self._session

    async def _call(self, method: str, **params) -> Any:
        """Make an async API call"""
        if self._endpoint is None:
            self._ensure_runtime()

        session = await self._get_session()
        data = {"method": method, "params": params}

        try:
            async with session.post(
                self._endpoint,
                json=data,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()

                if "error" in result:
                    raise SuperdocError(result["error"])

                return result.get("result")

        except aiohttp.ClientError as e:
            # Server may have crashed - clear endpoint to trigger restart
            self._endpoint = None
            raise SuperdocError(f"Connection failed: {e}")

    async def ping(self) -> bool:
        """Check if the runtime is available."""
        try:
            result = await self._call("ping")
            return result.get("pong", False)
        except Exception:
            return False

    async def get_editor(self, docx: Union[str, Path, bytes]) -> AsyncEditor:
        """
        Get an async editor for a DOCX document.

        Starts the runtime on first call if not already running.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            AsyncEditor instance

        Raises:
            SuperdocError: If the operation fails
        """
        self._ensure_runtime()

        if isinstance(docx, (str, Path)):
            docx_bytes = Path(docx).read_bytes()
        else:
            docx_bytes = docx

        docx_b64 = base64.b64encode(docx_bytes).decode("ascii")
        result = await self._call("loadDocx", docx=docx_b64)

        return AsyncEditor(self, result["sessionId"])

    async def close(self) -> None:
        """Close the async client and release resources."""
        if self._session is not None and not self._session.closed:
            await self._session.close()
            self._session = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()
        return False


# =============================================================================
# Convenience API (Notebook-friendly)
# =============================================================================

class _SuperdocConvenience:
    """
    Convenience wrapper for simple one-liner operations.

    This is designed for Jupyter notebooks and quick scripts where you don't
    want to manage editor lifecycle manually.

    Usage:
        from superdoc_sdk import superdoc

        # Simple one-liners
        html = superdoc.to_html("doc.docx")
        markdown = superdoc.to_markdown("doc.docx")
        json_data = superdoc.to_json("doc.docx")
        metadata = superdoc.get_metadata("doc.docx")

        # Modify and save
        superdoc.insert_and_save("doc.docx", "<p>Hello!</p>", "output.docx")

        # Or get bytes without saving
        docx_bytes = superdoc.insert("doc.docx", "<p>Hello!</p>")
    """

    def __init__(self):
        self._client: Optional[SuperdocClient] = None

    def _get_client(self) -> SuperdocClient:
        """Get or create the shared client instance."""
        if self._client is None:
            self._client = SuperdocClient()
        return self._client

    def to_html(self, docx: Union[str, Path, bytes]) -> str:
        """
        Convert DOCX to HTML.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            HTML string
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            return editor.get_html()

    def to_markdown(self, docx: Union[str, Path, bytes]) -> str:
        """
        Convert DOCX to Markdown.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            Markdown string
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            return editor.get_markdown()

    def to_json(self, docx: Union[str, Path, bytes]) -> dict:
        """
        Convert DOCX to ProseMirror JSON.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            ProseMirror JSON dict
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            return editor.get_json()

    def get_metadata(self, docx: Union[str, Path, bytes]) -> dict:
        """
        Get document metadata.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content

        Returns:
            Metadata dict
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            return editor.get_metadata()

    def insert(
        self,
        docx: Union[str, Path, bytes],
        content: Union[str, dict],
    ) -> bytes:
        """
        Insert content into a DOCX and return the modified document.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content
            content: HTML string or ProseMirror JSON dict to insert

        Returns:
            Modified DOCX as bytes
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            editor.insert_content(content)
            return editor.export_docx()

    def insert_and_save(
        self,
        docx: Union[str, Path, bytes],
        content: Union[str, dict],
        output_path: Union[str, Path],
    ) -> None:
        """
        Insert content into a DOCX and save to a file.

        Args:
            docx: Path to DOCX file, or bytes of DOCX content
            content: HTML string or ProseMirror JSON dict to insert
            output_path: Path to save the modified DOCX
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            editor.insert_content(content)
            editor.export_docx(output_path)

    def export(
        self,
        docx: Union[str, Path, bytes],
        output_path: Optional[Union[str, Path]] = None,
    ) -> bytes:
        """
        Load a DOCX and export it (useful for round-trip validation).

        Args:
            docx: Path to DOCX file, or bytes of DOCX content
            output_path: Optional path to save the DOCX

        Returns:
            DOCX as bytes
        """
        client = self._get_client()
        with client.get_editor(docx) as editor:
            return editor.export_docx(output_path)


# Module-level convenience instance
superdoc = _SuperdocConvenience()
