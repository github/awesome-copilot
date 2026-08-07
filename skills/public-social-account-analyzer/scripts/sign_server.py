"""FastAPI signing service for 4 social-media platforms.

Provides a unified HTTP surface to compute platform-specific request
signatures (headers/cookies) used when scraping public social-media
endpoints. Each signer is lazy-loaded on first use so cold start is
fast and missing optional dependencies only surface when the platform
is actually exercised.

Supported platforms and signature drift cycles (from internal research):
    - ``xhs``     -> Xiaohongshu ``X-s`` / ``X-t``   (drift 30-60 days)
    - ``douyin``  -> Douyin     ``X-Bogus`` / ``a-bogus`` (drift 30-60 days)
    - ``bili``    -> Bilibili   ``w_rid`` / ``wbi`` (drift ~90 days)
    - ``weibo``   -> Weibo      ``X-Request-Id`` / WSSE / ``sp`` cookie (drift 30-60 days)

Run:
    python sign_server.py
        # starts uvicorn on 0.0.0.0:8000

Endpoints:
    GET  /health   -> liveness probe
    POST /sign     -> sign a single request, returns signed headers
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import subprocess
import sys
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any, Callable, ClassVar, Dict, Mapping, Optional

try:
    from fastapi import FastAPI, HTTPException
    from pydantic import BaseModel, Field
except ImportError as exc:  # pragma: no cover - import guard for nicer error
    raise SystemExit(
        "FastAPI and pydantic are required. Install with: "
        "`pip install fastapi uvicorn pydantic`"
    ) from exc

try:
    import uvicorn
except ImportError:  # pragma: no cover
    uvicorn = None  # type: ignore[assignment]

logger = logging.getLogger("sign_server")
logging.basicConfig(
    level=os.getenv("SIGN_SERVER_LOG_LEVEL", "INFO"),
    format="%(asctime)s [%(levelname)s] %(name)s :: %(message)s",
)


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------


class SignRequest(BaseModel):
    """Schema for incoming ``POST /sign`` requests."""

    platform: str = Field(
        ...,
        description=(
            "Lower-case platform identifier: one of 'xhs', 'douyin', 'bili', 'weibo'."
        ),
        examples=["xhs"],
    )
    url: str = Field(..., description="Absolute or path-only URL being signed.")
    params: Dict[str, Any] = Field(
        default_factory=dict,
        description="Query string parameters (object form) that will be signed.",
    )
    headers: Dict[str, str] = Field(
        default_factory=dict,
        description="Caller-provided headers (UA, cookie, etc.). Used as input and "
        "merged with the signed headers in the response.",
    )
    method: str = Field(
        default="GET",
        description="HTTP method for the upstream request (defaults to GET).",
    )
    body: Optional[Mapping[str, Any]] = Field(
        default=None,
        description="Optional JSON body for POST endpoints (a-bogus, etc.).",
    )
    cookie: Optional[str] = Field(
        default=None,
        description="Optional cookie string (e.g. for xhs ``a1``).",
    )


class SignResponse(BaseModel):
    """Schema for ``POST /sign`` responses.

    The caller merges ``headers`` with their existing request headers before
    dispatching the upstream request. ``cookies`` is provided separately when
    the signed payload includes cookies (e.g. bilibili ``buvid3``).
    """

    platform: str
    url: str
    headers: Dict[str, str] = Field(
        default_factory=dict,
        description="Signed HTTP headers to merge into the upstream request.",
    )
    cookies: Dict[str, str] = Field(
        default_factory=dict,
        description="Signed cookies to attach to the upstream request.",
    )
    signed_params: Dict[str, str] = Field(
        default_factory=dict,
        description="Query parameters that were added/overwritten by the signer.",
    )
    drift_days: int = Field(
        ...,
        description="Approximate number of days until this signature may rotate.",
    )
    notes: Optional[str] = Field(
        default=None,
        description="Free-form diagnostics (warnings, signer version, etc.).",
    )


class HealthResponse(BaseModel):
    """Schema for ``GET /health`` responses."""

    status: str = "ok"
    loaded_platforms: list[str]
    pending_platforms: list[str]


# ---------------------------------------------------------------------------
# Abstract signer
# ---------------------------------------------------------------------------


class BaseSigner(ABC):
    """Abstract base class for platform-specific signers.

    Each subclass implements :meth:`sign` synchronously. The FastAPI layer
    runs them in ``asyncio.to_thread`` so blocking native call (py_mini_racer,
    subprocess, etc.) does not stall the event loop.
    """

    #: Platform identifier used by the public API.
    platform: ClassVar[str] = ""
    #: Approximate drift window in days (research notes).
    drift_days: ClassVar[int] = 45
    #: Short human description (for ``GET /health``).
    description: ClassVar[str] = ""

    @abstractmethod
    def sign(
        self,
        url: str,
        params: Mapping[str, Any],
        headers: Mapping[str, str],
        *,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Compute signed headers for a single request.

        Returns a dict with the keys ``headers``, ``cookies`` and
        ``signed_params``. The first two are merged by the caller into the
        upstream request.
        """
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Xiaohongshu signer (Node.js subprocess wrapping ReaJason/xhs)
# ---------------------------------------------------------------------------


class XHSSigner(BaseSigner):
    """Compute Xiaohongshu ``X-s`` / ``X-t`` signature.

    Strategy
    --------
    Xiaohongshu's web JS uses an internal sign function that is reverse-
    engineered by several open-source projects (e.g. ``ReaJason/xhs``). We
    invoke those projects through a small Node.js shim, communicating via
    JSON over stdin/stdout. The shim is expected to expose::

        // sign_shim.js
        module.exports = function (url, params, cookie, ua) {
            return { x_s: "...", x_t: "...", x_ray: "..." };
        };

    Signature drift cycle (research): **30-60 days**. Refresh the JS when
    upstream 400/403 responses start appearing.
    """

    platform = "xhs"
    drift_days = 45
    description = "Xiaohongshu X-s/X-t (Node subprocess -> ReaJason/xhs)"

    def __init__(self, shim_path: Optional[str] = None, node_bin: str = "node") -> None:
        self.node_bin = node_bin
        self.shim_path = shim_path or os.getenv(
            "XHS_SIGN_SHIM",
            str(Path(__file__).parent / "xhs_sign_shim.js"),
        )
        self._lock = asyncio.Lock()
        self._proc: Optional[subprocess.Popen[str]] = None
        if not Path(self.shim_path).exists():
            logger.warning("XHS sign shim not found at %s", self.shim_path)

    # -- subprocess lifecycle ----------------------------------------------

    def _start(self) -> subprocess.Popen[str]:
        """Start the persistent Node.js signer process."""
        if shutil.which(self.node_bin) is None:
            raise RuntimeError(
                f"`{self.node_bin}` not on PATH; install Node.js to use XHSSigner."
            )
        return subprocess.Popen(
            [self.node_bin, self.shim_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )

    def _ensure_proc(self) -> subprocess.Popen[str]:
        if self._proc is None or self._proc.poll() is not None:
            self._proc = self._start()
        return self._proc

    def _rpc(self, payload: Mapping[str, Any]) -> Dict[str, Any]:
        """Send a single JSON-RPC request, return parsed response."""
        proc = self._ensure_proc()
        assert proc.stdin and proc.stdout
        proc.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
        proc.stdin.flush()
        line = proc.stdout.readline()
        if not line:
            err = proc.stderr.read() if proc.stderr else ""
            raise RuntimeError(f"xhs signer died: {err!r}")
        return json.loads(line)

    def shutdown(self) -> None:
        if self._proc and self._proc.poll() is None:
            try:
                self._proc.terminate()
            except Exception:  # pragma: no cover - best effort
                pass

    # -- public API --------------------------------------------------------

    def sign(
        self,
        url: str,
        params: Mapping[str, Any],
        headers: Mapping[str, str],
        *,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        ua = headers.get("user-agent") or headers.get("User-Agent") or ""
        rpc_payload = {
            "url": url,
            "params": dict(params),
            "cookie": cookie or headers.get("cookie") or "",
            "ua": ua,
            "method": method,
            "body": dict(body) if body else None,
        }
        try:
            resp = self._rpc(rpc_payload)
        except Exception as exc:
            logger.exception("xhs signer RPC failed: %s", exc)
            raise HTTPException(status_code=502, detail=f"xhs signer failed: {exc}") from exc

        signed_headers = {
            "X-s": resp.get("x_s", ""),
            "X-t": resp.get("x_t", ""),
            "X-Ray": resp.get("x_ray", ""),
        }
        # Preserve caller-provided UA/cookie if signer did not override.
        if ua and "user-agent" not in {k.lower() for k in signed_headers}:
            signed_headers["User-Agent"] = ua
        return {
            "headers": {k: v for k, v in signed_headers.items() if v},
            "cookies": {},
            "signed_params": {},
        }


# ---------------------------------------------------------------------------
# Douyin signer (py_mini_racer evaluating x-bogus.js)
# ---------------------------------------------------------------------------


class DouyinSigner(BaseSigner):
    """Compute Douyin ``X-Bogus`` / ``a-bogus`` signature.

    Strategy
    --------
    Douyin's web JS exposes a ``sign(uri, user_agent)`` function that we
    replicate by evaluating the upstream ``x-bogus.js`` blob inside a
    ``py_mini_racer`` JS runtime. The blob can be obtained from
    https://lf-static.bytecdn.top/obj/rc-client-cloudgame-static/.../x-bogus.js
    or extracted from the live page; this class expects it at a configurable
    path (``DOUYIN_X_BOGUS_JS`` env var or sibling ``x-bogus.js`` file).

    Signature drift cycle (research): **30-60 days**. When ``X-Bogus`` is
    rejected (HTTP 403/200 with empty body) the JS blob must be refreshed.
    """

    platform = "douyin"
    drift_days = 45
    description = "Douyin X-Bogus / a-bogus (py_mini_racer -> x-bogus.js)"

    def __init__(self, js_path: Optional[str] = None) -> None:
        self.js_path = js_path or os.getenv(
            "DOUYIN_X_BOGUS_JS",
            str(Path(__file__).parent / "x-bogus.js"),
        )
        self._ctx: Optional[Any] = None
        self._init_lock = asyncio.Lock()

    def _load(self) -> Any:
        """Initialize the JS runtime once and cache the ``sign`` function."""
        if self._ctx is not None:
            return self._ctx
        try:
            from py_mini_racer import MiniRacer  # type: ignore
        except ImportError as exc:  # pragma: no cover - optional dep
            raise RuntimeError(
                "DouyinSigner requires `py_mini_racer`. "
                "Install with: `pip install py-mini-racer`."
            ) from exc

        js_file = Path(self.js_path)
        if not js_file.exists():
            raise FileNotFoundError(
                f"x-bogus.js not found at {self.js_path}. Set DOUYIN_X_BOGUS_JS "
                "to point at the upstream blob."
            )
        runtime = MiniRacer()
        runtime.eval(js_file.read_text(encoding="utf-8"))
        # The blob exposes either a top-level `sign` or a `window.sign`.
        # Try both and cache whichever works.
        try:
            runtime.eval("typeof sign === 'function' ? sign : (typeof window !== 'undefined' ? window.sign : null)")
        except Exception:  # pragma: no cover - defensive
            pass
        self._ctx = runtime
        return self._ctx

    def sign(
        self,
        url: str,
        params: Mapping[str, Any],
        headers: Mapping[str, str],
        *,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        runtime = self._load()
        query = "&".join(f"{k}={v}" for k, v in params.items())
        ua = headers.get("user-agent") or headers.get("User-Agent") or ""

        # Most x-bogus.js blobs expose `byted_acrawler.sign(url, ua)` or a
        # top-level `sign(url, query, ua)`. We try both shapes.
        candidates: list[str] = [
            "byted_acrawler && typeof byted_acrawler.sign === 'function' "
            " ? byted_acrawler.sign(JSON.stringify({url: arguments[0], ua: arguments[1]})) : null",
            "typeof sign === 'function' ? sign(arguments[0], arguments[1], arguments[2]) : null",
            "typeof window !== 'undefined' && typeof window.sign === 'function' "
            "? window.sign(arguments[0], arguments[1], arguments[2]) : null",
        ]
        signed: Optional[str] = None
        for snippet in candidates:
            try:
                signed = runtime.eval(snippet, url, query, ua)
            except Exception:
                signed = None
            if signed:
                break
        if not signed:
            raise RuntimeError(
                "Could not locate a callable sign() in x-bogus.js — "
                "the blob may have rotated. Refresh DOUYIN_X_BOGUS_JS."
            )

        signed_headers = {
            "X-Bogus": str(signed),
            "User-Agent": ua,
        }
        signed_params: Dict[str, str] = {}
        # a-bogus (for POST) is appended to body via different mechanism;
        # we surface it under signed_params for the caller to merge if needed.
        if method.upper() == "POST" and body:
            try:
                a_bogus = runtime.eval(
                    "typeof sign === 'function' ? sign(arguments[0], arguments[1], arguments[2], true) : ''",
                    url,
                    json.dumps(body, ensure_ascii=False, separators=(",", ":")),
                    ua,
                )
                if a_bogus:
                    signed_params["a-bogus"] = str(a_bogus)
            except Exception:  # pragma: no cover - best effort
                pass
        return {
            "headers": {k: v for k, v in signed_headers.items() if v},
            "cookies": {},
            "signed_params": signed_params,
        }


# ---------------------------------------------------------------------------
# Bilibili signer (bilibili-api-python's Wbi helper)
# ---------------------------------------------------------------------------


class BiliSigner(BaseSigner):
    """Compute Bilibili ``w_rid`` (WBI) signature.

    Strategy
    --------
    Uses ``bilibili_api.utils.wbi.Wbi`` from
    https://github.com/SocialSisterYi/bilibili-API-collect (and the
    ``bilibili-api-python`` package). The helper expects a key table
    (``img_key`` / ``sub_key``) which we fetch once per session from
    ``https://api.bilibili.com/x/web-interface/nav`` and cache.

    Signature drift cycle (research): **~90 days**. Key tables are
    re-issued infrequently and are not device-specific.
    """

    platform = "bili"
    drift_days = 90
    description = "Bilibili WBI w_rid (bilibili-api-python -> Wbi)"

    def __init__(self) -> None:
        self._wbi: Optional[Any] = None
        self._init_lock = asyncio.Lock()
        self._img_key: Optional[str] = None
        self._sub_key: Optional[str] = None

    def _ensure_keys(self) -> None:
        if self._img_key and self._sub_key:
            return
        try:
            from bilibili_api.utils.wbi import Wbi  # type: ignore
        except ImportError as exc:  # pragma: no cover - optional dep
            raise RuntimeError(
                "BiliSigner requires `bilibili-api-python`. "
                "Install with: `pip install bilibili-api-python`."
            ) from exc
        try:
            import requests  # type: ignore
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "BiliSigner requires `requests` to fetch the WBI key table."
            ) from exc

        nav = requests.get(
            "https://api.bilibili.com/x/web-interface/nav",
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        ).json()
        data = nav.get("data", {}) or {}
        wbi_img = data.get("wbi_img", {}) or {}
        img_url = wbi_img.get("img_url", "") or ""
        sub_url = wbi_img.get("sub_url", "") or ""
        self._img_key = img_url.rsplit("/", 1)[-1].split(".")[0]
        self._sub_key = sub_url.rsplit("/", 1)[-1].split(".")[0]
        self._wbi = Wbi(self._img_key, self._sub_key)

    def sign(
        self,
        url: str,
        params: Mapping[str, Any],
        headers: Mapping[str, str],
        *,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        self._ensure_keys()
        assert self._wbi is not None
        signed = self._wbi.sign(dict(params))
        signed_params = {
            "w_rid": str(signed.get("w_rid", "")),
            "wts": str(signed.get("wts", "")),
        }
        return {
            "headers": {},
            "cookies": {},
            "signed_params": signed_params,
        }


# ---------------------------------------------------------------------------
# Weibo signer (no JS — header-only stub, extend as needed)
# ---------------------------------------------------------------------------


class WeiboSigner(BaseSigner):
    """Compute Weibo request signature (``X-Request-Id`` / WSSE / ``sp``).

    Strategy
    --------
    Weibo's mobile/web signature surface has historically been lighter than
    Douyin/XHS: a UUID ``X-Request-Id`` header and a WSSE-style nonce. This
    implementation generates them locally (no subprocess / runtime). When
    the upstream rotates its scheme (new ``sp`` cookie algorithm etc.),
    subclass and override :meth:`_sign_post_payload`.

    Signature drift cycle (research): **30-60 days**. Mostly stable but
    occasional schema changes ship with mobile-app updates.
    """

    platform = "weibo"
    drift_days = 45
    description = "Weibo X-Request-Id / WSSE (local stub, extend per upstream)"

    def __init__(self) -> None:
        try:
            import uuid  # local import keeps import surface clean
            import hashlib
            import base64
            import time
            self._uuid = uuid
            self._hashlib = hashlib
            self._base64 = base64
            self._time = time
        except ImportError:  # pragma: no cover - stdlib always present
            raise

    def _wsse_nonce(self) -> str:
        """Generate a WSSE-style nonce (Base64 of 16 random bytes)."""
        raw = self._uuid.uuid4().bytes + self._uuid.uuid4().bytes  # 32 bytes
        return self._base64.b64encode(raw).decode("ascii")

    def sign(
        self,
        url: str,
        params: Mapping[str, Any],
        headers: Mapping[str, str],
        *,
        method: str = "GET",
        body: Optional[Mapping[str, Any]] = None,
        cookie: Optional[str] = None,
    ) -> Dict[str, Any]:
        req_id = str(self._uuid.uuid4()).upper()
        nonce = self._wsse_nonce()
        created = (
            self._time.strftime("%Y-%m-%dT%H:%M:%SZ", self._time.gmtime())
        )
        digest_input = f"{nonce}{created}".encode("utf-8")
        digest = self._base64.b64encode(
            self._hashlib.sha1(digest_input).digest()
        ).decode("ascii")
        signed_headers = {
            "X-Request-Id": req_id,
            "X-WSSE": f'UsernameToken Username="weibo", Nonce="{nonce}", '
            f'Created="{created}", Digest="{digest}"',
        }
        return {
            "headers": signed_headers,
            "cookies": {},
            "signed_params": {},
        }


# ---------------------------------------------------------------------------
# Signer registry (lazy)
# ---------------------------------------------------------------------------


class SignerRegistry:
    """Lazy registry mapping ``platform`` -> :class:`BaseSigner` instance.

    Signers are constructed on first ``get(...)`` call so a missing
    optional dependency (e.g. ``py_mini_racer``) does not prevent the
    server from starting.
    """

    _BUILDERS: ClassVar[Dict[str, Callable[[], BaseSigner]]] = {
        "xhs": XHSSigner,
        "douyin": DouyinSigner,
        "bili": BiliSigner,
        "weibo": WeiboSigner,
    }

    def __init__(self) -> None:
        self._instances: Dict[str, BaseSigner] = {}
        self._failed: Dict[str, str] = {}

    @property
    def supported(self) -> list[str]:
        return list(self._BUILDERS)

    @property
    def loaded(self) -> list[str]:
        return sorted(self._instances)

    @property
    def pending(self) -> list[str]:
        return sorted(set(self._BUILDERS) - set(self._instances))

    def get(self, platform: str) -> BaseSigner:
        key = platform.lower()
        if key in self._instances:
            return self._instances[key]
        if key in self._failed:
            raise HTTPException(status_code=503, detail=self._failed[key])
        builder = self._BUILDERS.get(key)
        if builder is None:
            raise HTTPException(
                status_code=400,
                detail=f"unknown platform '{platform}'. "
                f"supported: {self.supported}",
            )
        try:
            instance = builder()
        except Exception as exc:  # pragma: no cover - construction error
            msg = f"{key} signer failed to initialize: {exc}"
            self._failed[key] = msg
            logger.error(msg)
            raise HTTPException(status_code=503, detail=msg) from exc
        self._instances[key] = instance
        return instance

    def shutdown(self) -> None:
        for instance in self._instances.values():
            close = getattr(instance, "shutdown", None)
            if callable(close):
                try:
                    close()
                except Exception:  # pragma: no cover - best effort
                    pass


REGISTRY = SignerRegistry()


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------


app = FastAPI(
    title="Social-Account Signing Service",
    version="0.1.0",
    description=(
        "Compute platform-specific request signatures for XHS, Douyin, "
        "Bilibili and Weibo public endpoints. Lazy-loaded signers keep "
        "cold-start fast and isolate missing optional deps."
    ),
)


@app.on_event("shutdown")
def _on_shutdown() -> None:  # pragma: no cover - lifecycle
    REGISTRY.shutdown()


@app.get("/health", response_model=HealthResponse, tags=["meta"])
async def health() -> HealthResponse:
    """Liveness probe — reports which signers are loaded vs. pending."""
    return HealthResponse(
        loaded_platforms=REGISTRY.loaded,
        pending_platforms=REGISTRY.pending,
    )


@app.post("/sign", response_model=SignResponse, tags=["sign"])
async def sign(req: SignRequest) -> SignResponse:
    """Sign a single request.

    Body
    ----
    ``platform``   one of ``xhs`` | ``douyin`` | ``bili`` | ``weibo``
    ``url``        URL being signed (used by XHS / Douyin blob logic)
    ``params``     query-string params (object form)
    ``headers``    caller headers (UA, cookie, ...) — merged into output
    ``method``     ``GET`` (default) or ``POST``
    ``body``       optional POST body (drives a-bogus path on Douyin)
    ``cookie``     optional cookie string (overrides headers.cookie)

    Returns
    -------
    :class:`SignResponse` with ``headers``, ``cookies`` and ``signed_params``
    the caller merges into the upstream request.
    """
    try:
        signer = REGISTRY.get(req.platform)
    except HTTPException:
        raise
    result = await asyncio.to_thread(
        signer.sign,
        req.url,
        req.params,
        req.headers,
        method=req.method,
        body=req.body,
        cookie=req.cookie,
    )

    # Merge: caller headers < signed headers. Signed headers win because
    # they're explicitly computed for this request.
    merged_headers: Dict[str, str] = dict(req.headers)
    for k, v in (result.get("headers") or {}).items():
        merged_headers[k] = v

    notes_parts: list[str] = []
    if signer.platform in REGISTRY._failed:  # pragma: no cover
        notes_parts.append("signer previously failed to initialize")

    return SignResponse(
        platform=signer.platform,
        url=req.url,
        headers=merged_headers,
        cookies=result.get("cookies", {}) or {},
        signed_params=result.get("signed_params", {}) or {},
        drift_days=signer.drift_days,
        notes="; ".join(notes_parts) or None,
    )


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


def main() -> None:
    """Run uvicorn on 0.0.0.0:8000 (override with PORT/HOST)."""
    if uvicorn is None:  # pragma: no cover
        raise SystemExit("uvicorn is required: `pip install uvicorn`")
    host = os.getenv("SIGN_SERVER_HOST", "0.0.0.0")
    port = int(os.getenv("SIGN_SERVER_PORT", "8000"))
    uvicorn.run(
        "sign_server:app",
        host=host,
        port=port,
        log_level=os.getenv("SIGN_SERVER_LOG_LEVEL", "info").lower(),
        reload=os.getenv("SIGN_SERVER_RELOAD", "0") == "1",
    )


if __name__ == "__main__":
    sys.exit(main() or 0)


# ---------------------------------------------------------------------------
# Usage example
# ---------------------------------------------------------------------------
#
# Terminal A — start the service:
#
#   $ cd /Users/jack/Documents/public-social-account-analyzer/skill/scripts
#   $ python sign_server.py
#   INFO:     Started server process [12345]
#   INFO:     Waiting for application startup.
#   INFO:     Application startup complete.
#   INFO:     Uvicorn running on http://0.0.0.0:8000
#
# Terminal B — sign a XHS request:
#
#   $ curl -s http://localhost:8000/health | jq
#   {
#     "status": "ok",
#     "loaded_platforms": [],
#     "pending_platforms": ["bili", "douyin", "weibo", "xhs"]
#   }
#
#   $ curl -s -X POST http://localhost:8000/sign \
#       -H 'content-type: application/json' \
#       -d '{
#             "platform": "xhs",
#             "url": "https://www.xiaohongshu.com/api/sns/web/v1/user/other_info",
#             "params": {"user_id": "5f3c8e8e0000000001002a5e"},
#             "headers": {"user-agent": "Mozilla/5.0 ..."},
#             "cookie": "a1=...; web_session=..."
#           }' | jq
#   {
#     "platform": "xhs",
#     "url": "https://www.xiaohongshu.com/api/sns/web/v1/user/other_info",
#     "headers": {
#       "user-agent": "Mozilla/5.0 ...",
#       "X-s": "...",
#       "X-t": "...",
#       "X-Ray": "..."
#     },
#     "cookies": {},
#     "signed_params": {},
#     "drift_days": 45,
#     "notes": null
#   }
#
# Terminal C — sign a Bilibili request:
#
#   $ curl -s -X POST http://localhost:8000/sign \
#       -H 'content-type: application/json' \
#       -d '{
#             "platform": "bili",
#             "url": "https://api.bilibili.com/x/space/wbi/acc/info",
#             "params": {"mid": "2", "token": "", "platform": "web"},
#             "headers": {"user-agent": "Mozilla/5.0"}
#           }' | jq
#   {
#     "platform": "bili",
#     "url": "https://api.bilibili.com/x/space/wbi/acc/info",
#     "headers": {"user-agent": "Mozilla/5.0"},
#     "cookies": {},
#     "signed_params": {"w_rid": "...", "wts": "..."},
#     "drift_days": 90,
#     "notes": null
#   }
#
# From Python (httpx):
#
#   import httpx, json
#   r = httpx.post(
#       "http://localhost:8000/sign",
#       json={
#           "platform": "douyin",
#           "url": "https://www.douyin.com/aweme/v1/web/aweme/post/",
#           "params": {"max_cursor": "0", "user_id": "..."},
#           "headers": {"user-agent": "Mozilla/5.0 ..."},
#       },
#       timeout=10.0,
#   )
#   signed = r.json()
#   resp = httpx.get(signed["url"], params=signed["signed_params"] or None,
#                    headers=signed["headers"])