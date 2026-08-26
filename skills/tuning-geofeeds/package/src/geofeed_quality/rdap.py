# Copyright 2026 Fastah Inc.
"""Privacy-minimizing authoritative RDAP lookup and publisher assessment."""

from __future__ import annotations

import ipaddress
import json
import threading
import time
import unicodedata
from collections.abc import Callable, Mapping
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, replace
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from typing import Any, Protocol, cast
from urllib.parse import quote, urljoin, urlsplit

import httpx
from pydantic import JsonValue

from .models import (
    Analysis,
    Evidence,
    EvidenceType,
    Finding,
    FindingCategory,
    PublisherProfile,
    RdapAssessment,
    RdapConfigurationSummary,
    RdapEntitySummary,
    RdapFailureCode,
    RdapNetworkSummary,
    RdapObservation,
    RdapPublicIdentifier,
    Severity,
)

IANA_IPV4_BOOTSTRAP = "https://data.iana.org/rdap/ipv4.json"
IANA_IPV6_BOOTSTRAP = "https://data.iana.org/rdap/ipv6.json"
DEFAULT_USER_AGENT = "Fastah-NetOps-Tools-geofeed-quality/0.3.0 (+https://fastah.net/)"


@dataclass(frozen=True)
class RdapRuntimeConfig:
    connect_timeout_seconds: float = 5.0
    read_timeout_seconds: float = 10.0
    response_byte_limit: int = 1_048_576
    max_redirects: int = 3
    max_concurrency: int = 2
    min_interval_per_rir_seconds: float = 0.5
    user_agent: str = DEFAULT_USER_AGENT
    bootstrap_ipv4_url: str = IANA_IPV4_BOOTSTRAP
    bootstrap_ipv6_url: str = IANA_IPV6_BOOTSTRAP

    def __post_init__(self) -> None:
        self.summary()
        _validate_https_url(self.bootstrap_ipv4_url)
        _validate_https_url(self.bootstrap_ipv6_url)
        if not self.user_agent.strip():
            raise ValueError("RDAP user agent must not be empty")

    def summary(self) -> RdapConfigurationSummary:
        return RdapConfigurationSummary(**self.__dict__)


@dataclass(frozen=True)
class HttpResponse:
    url: str
    status_code: int
    headers: Mapping[str, str]
    content: bytes


class HttpTransport(Protocol):
    def get(self, url: str, config: RdapRuntimeConfig) -> HttpResponse: ...


class RdapLookupClient(Protocol):
    config: RdapRuntimeConfig

    def lookup(self, prefix: str) -> RdapLookupResult: ...


class RdapCache(Protocol):
    def get(self, prefix: str) -> RdapLookupResult | None: ...

    def set(self, prefix: str, result: RdapLookupResult) -> None: ...


class RdapRequestError(Exception):
    def __init__(
        self,
        code: RdapFailureCode,
        message: str,
        *,
        retryable: bool = False,
        status_code: int | None = None,
        retry_after_seconds: int | None = None,
    ) -> None:
        self.code = code
        self.retryable = retryable
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds
        super().__init__(message)


def _validate_https_url(url: str) -> None:
    parsed = urlsplit(url)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.query
        or parsed.fragment
    ):
        raise RdapRequestError(
            RdapFailureCode.INSECURE_SERVICE_URL,
            "RDAP service URL must be credential-free HTTPS",
        )
    hostname = parsed.hostname.casefold().rstrip(".")
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise RdapRequestError(
            RdapFailureCode.INSECURE_SERVICE_URL, "RDAP service host is not public"
        )
    try:
        address = ipaddress.ip_address(hostname.strip("[]"))
    except ValueError:
        return
    if not address.is_global:
        raise RdapRequestError(
            RdapFailureCode.INSECURE_SERVICE_URL, "RDAP service host is not public"
        )


class HttpxTransport:
    """HTTP transport with no ambient credentials and explicit redirect/size bounds."""

    def get(self, url: str, config: RdapRuntimeConfig) -> HttpResponse:
        headers = {
            "Accept": "application/rdap+json, application/json",
            "User-Agent": config.user_agent,
        }
        current = url
        timeout = httpx.Timeout(
            connect=config.connect_timeout_seconds,
            read=config.read_timeout_seconds,
            write=config.read_timeout_seconds,
            pool=config.connect_timeout_seconds,
        )
        try:
            with httpx.Client(follow_redirects=False, trust_env=False, timeout=timeout) as client:
                for redirect_count in range(config.max_redirects + 1):
                    _validate_https_url(current)
                    with client.stream("GET", current, headers=headers) as response:
                        if response.status_code in {301, 302, 303, 307, 308}:
                            location = response.headers.get("location")
                            if not location or redirect_count == config.max_redirects:
                                raise RdapRequestError(
                                    RdapFailureCode.HTTP_ERROR,
                                    "RDAP redirect limit exceeded or redirect location missing",
                                )
                            current = urljoin(str(response.url), location)
                            continue
                        body = bytearray()
                        for chunk in response.iter_bytes():
                            body.extend(chunk)
                            if len(body) > config.response_byte_limit:
                                raise RdapRequestError(
                                    RdapFailureCode.RESPONSE_TOO_LARGE,
                                    "RDAP response exceeded configured byte limit",
                                )
                        return HttpResponse(
                            url=str(response.url),
                            status_code=response.status_code,
                            headers=dict(response.headers),
                            content=bytes(body),
                        )
        except httpx.TimeoutException as error:
            raise RdapRequestError(
                RdapFailureCode.TIMEOUT, "RDAP request timed out", retryable=True
            ) from error
        except httpx.RequestError as error:
            raise RdapRequestError(
                RdapFailureCode.HTTP_ERROR, "RDAP transport failed", retryable=True
            ) from error
        raise AssertionError("redirect loop terminated without response")


@dataclass(frozen=True)
class BootstrapService:
    network: ipaddress.IPv4Network | ipaddress.IPv6Network
    endpoint: str | None
    insecure_only: bool = False


class BootstrapRegistry:
    def __init__(self, services: list[BootstrapService]) -> None:
        self._services = sorted(
            services,
            key=lambda service: (
                service.network.version,
                -service.network.prefixlen,
                int(service.network.network_address),
            ),
        )

    @classmethod
    def from_documents(cls, ipv4: object, ipv6: object) -> BootstrapRegistry:
        services: list[BootstrapService] = []
        for version, document in ((4, ipv4), (6, ipv6)):
            if not isinstance(document, dict) or not isinstance(document.get("services"), list):
                raise RdapRequestError(
                    RdapFailureCode.BOOTSTRAP_UNAVAILABLE, "IANA bootstrap document is malformed"
                )
            for entry in document["services"]:
                if not isinstance(entry, list) or len(entry) != 2:
                    continue
                prefixes, urls = entry
                if not isinstance(prefixes, list) or not isinstance(urls, list):
                    continue
                endpoint = None
                for url in urls:
                    if not isinstance(url, str):
                        continue
                    try:
                        _validate_https_url(url)
                    except RdapRequestError:
                        continue
                    endpoint = url
                    break
                for prefix in prefixes:
                    try:
                        network = ipaddress.ip_network(prefix, strict=True)
                    except TypeError, ValueError:
                        continue
                    if network.version == version:
                        services.append(
                            BootstrapService(network, endpoint, insecure_only=endpoint is None)
                        )
        if not services:
            raise RdapRequestError(
                RdapFailureCode.BOOTSTRAP_UNAVAILABLE, "IANA bootstrap has no usable services"
            )
        return cls(services)

    def select(self, prefix: str) -> BootstrapService | None:
        network = ipaddress.ip_network(prefix, strict=True)
        return next(
            (
                service
                for service in self._services
                if service.network.version == network.version
                and network.subnet_of(cast(Any, service.network))
            ),
            None,
        )


@dataclass(frozen=True)
class RdapLookupResult:
    requested_prefix: str
    queried_at: datetime
    rir: str | None = None
    endpoint: str | None = None
    cached: bool = False
    http_status: int | None = None
    retry_after_seconds: int | None = None
    retryable: bool = False
    failure_code: RdapFailureCode | None = None
    network: RdapNetworkSummary | None = None
    entities: tuple[RdapEntitySummary, ...] = ()


class MemoryRdapCache:
    def __init__(self) -> None:
        self._values: dict[str, RdapLookupResult] = {}
        self._lock = threading.Lock()

    def get(self, prefix: str) -> RdapLookupResult | None:
        with self._lock:
            return self._values.get(prefix)

    def set(self, prefix: str, result: RdapLookupResult) -> None:
        with self._lock:
            self._values[prefix] = result


def _retry_after(value: str | None, now: datetime) -> int | None:
    if not value:
        return None
    try:
        return max(0, int(value))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(value)
        except TypeError, ValueError, OverflowError:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return max(0, int((parsed - now).total_seconds()))


def _json_response(response: HttpResponse, now: datetime) -> dict[str, Any]:
    if response.status_code == 429:
        raise RdapRequestError(
            RdapFailureCode.RATE_LIMITED,
            "RDAP service rate limited the request",
            retryable=True,
            status_code=429,
            retry_after_seconds=_retry_after(response.headers.get("retry-after"), now),
        )
    if response.status_code < 200 or response.status_code >= 300:
        raise RdapRequestError(
            RdapFailureCode.HTTP_ERROR,
            "RDAP service returned an unsuccessful status",
            retryable=response.status_code >= 500,
            status_code=response.status_code,
        )
    content_type = response.headers.get("content-type", "").split(";", 1)[0].strip().casefold()
    if content_type not in {"application/rdap+json", "application/json"}:
        raise RdapRequestError(
            RdapFailureCode.INVALID_CONTENT_TYPE, "RDAP service returned a non-JSON content type"
        )
    try:
        document = json.loads(response.content)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise RdapRequestError(
            RdapFailureCode.MALFORMED_RESPONSE, "RDAP service returned malformed JSON"
        ) from error
    if not isinstance(document, dict):
        raise RdapRequestError(
            RdapFailureCode.MALFORMED_RESPONSE, "RDAP response root must be an object"
        )
    return cast(dict[str, Any], document)


def _rir_name(endpoint: str) -> str:
    host = (urlsplit(endpoint).hostname or "").casefold()
    for token, name in (
        ("afrinic", "AFRINIC"),
        ("apnic", "APNIC"),
        ("arin", "ARIN"),
        ("ripe", "RIPE NCC"),
        ("lacnic", "LACNIC"),
    ):
        if token in host:
            return name
    return host


def _string(value: object) -> str | None:
    return value if isinstance(value, str) and value.strip() else None


def _vcard_organization_names(value: object) -> list[str]:
    if value is None:
        return []
    if not isinstance(value, list) or len(value) != 2 or not isinstance(value[1], list):
        raise ValueError("RDAP entity vcardArray is malformed")
    names: list[str] = []
    for field in value[1]:
        if not isinstance(field, list) or len(field) < 4:
            raise ValueError("RDAP entity vCard field is malformed")
        if field[0] != "org":
            continue
        field_value = field[3]
        candidates = field_value if isinstance(field_value, list) else [field_value]
        if not all(isinstance(candidate, str) and candidate.strip() for candidate in candidates):
            raise ValueError("RDAP entity organization name is malformed")
        names.extend(candidate.strip() for candidate in candidates)
    return names


def _entities(document: Mapping[str, Any]) -> tuple[RdapEntitySummary, ...]:
    raw_entities = document.get("entities", [])
    if not isinstance(raw_entities, list):
        raise ValueError("RDAP entities must be an array")
    pending = list(raw_entities)
    selected: list[RdapEntitySummary] = []
    while pending:
        entity = pending.pop(0)
        if not isinstance(entity, dict):
            raise ValueError("RDAP entity must be an object")
        object_class = entity.get("objectClassName")
        if object_class is not None and (
            not isinstance(object_class, str) or object_class.casefold() != "entity"
        ):
            raise ValueError("RDAP entity object class is invalid")
        nested = entity.get("entities")
        if nested is not None and not isinstance(nested, list):
            raise ValueError("nested RDAP entities must be an array")
        if nested:
            pending.extend(nested)
        raw_roles = entity.get("roles", [])
        if not isinstance(raw_roles, list) or not all(isinstance(role, str) for role in raw_roles):
            raise ValueError("RDAP entity roles must be an array of strings")
        normalized_roles = sorted({role.strip().casefold() for role in raw_roles if role.strip()})
        if "registrant" not in normalized_roles:
            continue
        public_ids: list[RdapPublicIdentifier] = []
        raw_public_ids = entity.get("publicIds")
        if raw_public_ids is not None:
            if not isinstance(raw_public_ids, list):
                raise ValueError("RDAP entity publicIds must be an array")
            for item in raw_public_ids:
                if not isinstance(item, dict):
                    raise ValueError("RDAP public identifier must be an object")
                identifier_type = _string(item.get("type"))
                identifier = _string(item.get("identifier"))
                if not identifier_type or not identifier:
                    raise ValueError("RDAP public identifier type and identifier are required")
                normalized_type = identifier_type.casefold()
                if any(
                    word in normalized_type for word in ("asn", "autnum", "domain", "handle", "org")
                ):
                    normalized_identifier = identifier.strip()
                    if "domain" in normalized_type:
                        normalized_identifier = _normal_domain(normalized_identifier)
                    elif "asn" in normalized_type or "autnum" in normalized_type:
                        normalized_identifier = _normal_asn(normalized_identifier)
                    else:
                        normalized_identifier = _normal_handle(normalized_identifier)
                    public_ids.append(
                        RdapPublicIdentifier(type=normalized_type, identifier=normalized_identifier)
                    )
        handle = entity.get("handle")
        if handle is not None and not isinstance(handle, str):
            raise ValueError("RDAP entity handle must be a string")
        summary = RdapEntitySummary(
            handle=_normal_handle(handle) if isinstance(handle, str) and handle.strip() else None,
            roles=normalized_roles,
            organization_names=_vcard_organization_names(entity.get("vcardArray")),
            public_ids=public_ids,
        )
        if summary.handle or summary.organization_names or summary.public_ids:
            selected.append(summary)
    return tuple(selected)


def _network_summary(document: Mapping[str, Any], requested_prefix: str) -> RdapNetworkSummary:
    object_class = document.get("objectClassName")
    if not isinstance(object_class, str) or object_class.casefold() != "ip network":
        raise RdapRequestError(
            RdapFailureCode.MALFORMED_RESPONSE,
            "RDAP response is not an IP network object",
        )
    start = _string(document.get("startAddress"))
    end = _string(document.get("endAddress"))
    if not start or not end:
        raise RdapRequestError(RdapFailureCode.MALFORMED_RESPONSE, "RDAP network range is missing")
    try:
        start_address = ipaddress.ip_address(start)
        end_address = ipaddress.ip_address(end)
        requested = ipaddress.ip_network(requested_prefix)
    except ValueError as error:
        raise RdapRequestError(
            RdapFailureCode.MALFORMED_RESPONSE, "RDAP network range is invalid"
        ) from error
    if (
        start_address.version != requested.version
        or end_address.version != requested.version
        or int(start_address) > int(requested.network_address)
        or int(end_address) < int(requested.broadcast_address)
    ):
        raise RdapRequestError(
            RdapFailureCode.MALFORMED_RESPONSE,
            "RDAP network range does not contain the requested prefix",
        )
    optional_values: dict[str, str | None] = {}
    for field in ("ipVersion", "handle", "name", "type"):
        value = document.get(field)
        if value is not None and not isinstance(value, str):
            raise RdapRequestError(
                RdapFailureCode.MALFORMED_RESPONSE,
                f"RDAP network {field} must be a string",
            )
        optional_values[field] = value.strip() if isinstance(value, str) and value.strip() else None
    return RdapNetworkSummary(
        start_address=str(start_address),
        end_address=str(end_address),
        ip_version=optional_values["ipVersion"],
        handle=optional_values["handle"],
        name=optional_values["name"],
        type=optional_values["type"],
    )


class _RirRateLimiter:
    def __init__(
        self, interval: float, monotonic: Callable[[], float], sleep: Callable[[float], None]
    ):
        self._interval = interval
        self._monotonic = monotonic
        self._sleep = sleep
        self._locks: dict[str, threading.Lock] = {}
        self._next: dict[str, float] = {}
        self._guard = threading.Lock()

    def wait(self, key: str) -> None:
        with self._guard:
            lock = self._locks.setdefault(key, threading.Lock())
        with lock:
            now = self._monotonic()
            delay = max(0.0, self._next.get(key, now) - now)
            if delay:
                self._sleep(delay)
            self._next[key] = self._monotonic() + self._interval


class AuthoritativeRdapClient:
    def __init__(
        self,
        registry: BootstrapRegistry | None,
        transport: HttpTransport,
        *,
        config: RdapRuntimeConfig | None = None,
        cache: RdapCache | None = None,
        bootstrap_error: RdapFailureCode | None = None,
        now: Callable[[], datetime] | None = None,
        monotonic: Callable[[], float] = time.monotonic,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.registry = registry
        self.transport = transport
        self.config = config or RdapRuntimeConfig()
        self.cache = cache or MemoryRdapCache()
        self.bootstrap_error = bootstrap_error
        self.now = now or (lambda: datetime.now(UTC))
        self.rate_limiter = _RirRateLimiter(
            self.config.min_interval_per_rir_seconds, monotonic, sleep
        )

    @classmethod
    def from_iana(
        cls,
        transport: HttpTransport | None = None,
        *,
        config: RdapRuntimeConfig | None = None,
        cache: RdapCache | None = None,
    ) -> AuthoritativeRdapClient:
        runtime = config or RdapRuntimeConfig()
        actual_transport = transport or HttpxTransport()
        now = datetime.now(UTC)
        try:
            ipv4_response = actual_transport.get(runtime.bootstrap_ipv4_url, runtime)
            ipv6_response = actual_transport.get(runtime.bootstrap_ipv6_url, runtime)
            ipv4 = _json_response(ipv4_response, now)
            ipv6 = _json_response(ipv6_response, now)
            registry = BootstrapRegistry.from_documents(ipv4, ipv6)
            return cls(registry, actual_transport, config=runtime, cache=cache)
        except RdapRequestError as error:
            return cls(
                None,
                actual_transport,
                config=runtime,
                cache=cache,
                bootstrap_error=error.code,
            )

    def lookup(self, prefix: str) -> RdapLookupResult:
        cached = self.cache.get(prefix)
        if cached is not None:
            return replace(cached, cached=True)
        queried_at = self.now()
        if self.registry is None:
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                failure_code=self.bootstrap_error or RdapFailureCode.BOOTSTRAP_UNAVAILABLE,
                retryable=True,
            )
            self.cache.set(prefix, result)
            return result
        service = self.registry.select(prefix)
        if service is None:
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                failure_code=RdapFailureCode.NO_AUTHORITATIVE_SERVICE,
            )
            self.cache.set(prefix, result)
            return result
        if service.endpoint is None or service.insecure_only:
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                failure_code=RdapFailureCode.INSECURE_SERVICE_URL,
            )
            self.cache.set(prefix, result)
            return result
        endpoint = service.endpoint
        rir = _rir_name(endpoint)
        response: HttpResponse | None = None
        try:
            _validate_https_url(endpoint)
            self.rate_limiter.wait(rir)
            request_url = urljoin(endpoint.rstrip("/") + "/", f"ip/{quote(prefix, safe='/:')}")
            response = self.transport.get(request_url, self.config)
            if len(response.content) > self.config.response_byte_limit:
                raise RdapRequestError(
                    RdapFailureCode.RESPONSE_TOO_LARGE,
                    "RDAP response exceeded configured byte limit",
                )
            document = _json_response(response, queried_at)
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                rir=rir,
                endpoint=endpoint,
                http_status=response.status_code,
                network=_network_summary(document, prefix),
                entities=_entities(document),
            )
        except RdapRequestError as error:
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                rir=rir,
                endpoint=endpoint,
                http_status=error.status_code,
                retry_after_seconds=error.retry_after_seconds,
                retryable=error.retryable,
                failure_code=error.code,
            )
        except TypeError, ValueError:
            result = RdapLookupResult(
                requested_prefix=prefix,
                queried_at=queried_at,
                rir=rir,
                endpoint=endpoint,
                http_status=response.status_code if response is not None else None,
                failure_code=RdapFailureCode.MALFORMED_RESPONSE,
            )
        self.cache.set(prefix, result)
        return result


def _normal_name(value: str) -> str:
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def _normal_handle(value: str) -> str:
    return unicodedata.normalize("NFKC", value).strip().upper()


def _normal_asn(value: str) -> str:
    normalized = value.strip().upper()
    normalized = normalized if normalized.startswith("AS") else f"AS{normalized}"
    if not normalized[2:].isdigit() or int(normalized[2:]) > 4_294_967_295:
        raise ValueError("RDAP ASN public identifier is invalid")
    return normalized


def _normal_domain(value: str) -> str:
    return value.strip().rstrip(".").casefold().encode("idna").decode("ascii")


def _assessment(
    profile: PublisherProfile | None, entities: tuple[RdapEntitySummary, ...]
) -> tuple[RdapAssessment, str, list[str], list[str]]:
    if profile is None or not any(
        (
            profile.organization_name,
            profile.asn,
            profile.rdap_entity_handle,
            profile.rir_organization_id,
            profile.domain,
        )
    ):
        return RdapAssessment.UNVERIFIED, "No publisher profile identifiers were supplied.", [], []

    handles = {_normal_handle(entity.handle) for entity in entities if entity.handle}
    names = {
        _normal_name(name)
        for entity in entities
        for name in entity.organization_names
        if name.strip()
    }
    public_ids = [public_id for entity in entities for public_id in entity.public_ids]
    asns = {
        _normal_asn(item.identifier)
        for item in public_ids
        if "asn" in item.type or "autnum" in item.type
    }
    domains = {_normal_domain(item.identifier) for item in public_ids if "domain" in item.type}
    org_ids = handles | {
        _normal_handle(item.identifier)
        for item in public_ids
        if "org" in item.type or "handle" in item.type
    }
    comparisons = {
        "organization_name": (profile.organization_name, names),
        "asn": (profile.asn, asns),
        "rdap_entity_handle": (profile.rdap_entity_handle, handles),
        "rir_organization_id": (profile.rir_organization_id, org_ids),
        "domain": (profile.domain, domains),
    }
    matched: list[str] = []
    conflicting: list[str] = []
    for field, (expected, observed) in comparisons.items():
        if expected is None or not observed:
            continue
        if expected in observed:
            matched.append(field)
        else:
            conflicting.append(field)
    if conflicting:
        return (
            RdapAssessment.CONFLICTING,
            "Authoritative RDAP identifiers affirmatively contradict profile fields: "
            + ", ".join(conflicting)
            + ". This is not a legal ownership conclusion.",
            matched,
            conflicting,
        )
    if matched:
        return (
            RdapAssessment.CONSISTENT,
            "Authoritative RDAP identifiers are consistent for profile fields: "
            + ", ".join(matched)
            + ". This does not prove legal ownership.",
            matched,
            [],
        )
    return (
        RdapAssessment.UNVERIFIED,
        "RDAP returned no comparable publisher identifier; absence is not contradictory evidence.",
        [],
        [],
    )


def _evidence_values(
    result: RdapLookupResult,
    assessment: RdapAssessment,
    matched: list[str],
    conflicting: list[str],
) -> dict[str, JsonValue]:
    return {
        "requested_prefix": result.requested_prefix,
        "rir": result.rir,
        "endpoint": result.endpoint,
        "cached": result.cached,
        "http_status": result.http_status,
        "retry_after_seconds": result.retry_after_seconds,
        "retryable": result.retryable,
        "failure_code": result.failure_code.value if result.failure_code else None,
        "assessment": assessment.value,
        "matched_profile_fields": cast(list[JsonValue], matched),
        "conflicting_profile_fields": cast(list[JsonValue], conflicting),
        "network_handle": result.network.handle if result.network else None,
        "entity_handles": [entity.handle for entity in result.entities if entity.handle],
    }


def enrich_analysis(
    analysis: Analysis,
    client: RdapLookupClient,
    profile: PublisherProfile | None = None,
) -> Analysis:
    """Return a new analysis with optional RDAP evidence; base row validity is untouched."""
    enriched = analysis.model_copy(deep=True)
    enriched.configuration.enrichment_enabled = True
    enriched.configuration.rdap = client.config.summary()
    rows_by_id = {row.id: row for row in enriched.rows}
    normalized_profile = profile.model_copy(deep=True) if profile else None
    if normalized_profile is not None:
        supplied_fields = [
            field
            for field in (
                "organization_name",
                "asn",
                "rdap_entity_handle",
                "rir_organization_id",
                "domain",
            )
            if getattr(normalized_profile, field) is not None
        ]
        profile_evidence = Evidence(
            id=f"evidence-{len(enriched.evidence) + 1:06d}",
            type=EvidenceType.SOURCE,
            source="user-supplied publisher profile",
            observed_at=enriched.created_at,
            target_ids=[enriched.analysis_id],
            values={"provided_fields": cast(list[JsonValue], supplied_fields)},
        )
        enriched.evidence.append(profile_evidence)
        normalized_profile.evidence_ids.append(profile_evidence.id)
    enriched.enrichment.publisher_profile = normalized_profile
    groups: dict[str, list[str]] = {}
    for row in enriched.rows:
        if row.prefix and row.prefix.canonical and row.prefix.is_publicly_routable is True:
            groups.setdefault(row.prefix.canonical, []).append(row.id)
    prefixes = sorted(groups, key=lambda value: (ipaddress.ip_network(value).version, value))
    with ThreadPoolExecutor(max_workers=client.config.max_concurrency) as executor:
        results = list(executor.map(client.lookup, prefixes))

    for index, result in enumerate(results, start=1):
        if result.failure_code:
            assessment = RdapAssessment.UNAVAILABLE
            explanation = (
                f"Authoritative RDAP evidence is unavailable ({result.failure_code.value}); "
                "no ownership conclusion was made."
            )
            matched: list[str] = []
            conflicting: list[str] = []
        else:
            try:
                assessment, explanation, matched, conflicting = _assessment(
                    normalized_profile, result.entities
                )
            except TypeError, ValueError:
                result = replace(
                    result,
                    retryable=False,
                    failure_code=RdapFailureCode.MALFORMED_RESPONSE,
                    network=None,
                    entities=(),
                )
                assessment = RdapAssessment.UNAVAILABLE
                explanation = (
                    "Authoritative RDAP evidence is unavailable (malformed_response); "
                    "no ownership conclusion was made."
                )
                matched = []
                conflicting = []
        evidence = Evidence(
            id=f"evidence-{len(enriched.evidence) + 1:06d}",
            type=EvidenceType.RDAP,
            source="IANA RDAP bootstrap and authoritative RIR response",
            observed_at=result.queried_at,
            target_ids=groups[result.requested_prefix],
            values=_evidence_values(result, assessment, matched, conflicting),
        )
        enriched.evidence.append(evidence)
        observation = RdapObservation(
            id=f"rdap-{index:06d}",
            target_row_ids=groups[result.requested_prefix],
            requested_prefix=result.requested_prefix,
            rir=result.rir,
            endpoint=result.endpoint,
            queried_at=result.queried_at,
            cached=result.cached,
            http_status=result.http_status,
            retry_after_seconds=result.retry_after_seconds,
            retryable=result.retryable,
            failure_code=result.failure_code,
            network=result.network,
            selected_entities=list(result.entities),
            assessment=assessment,
            explanation=explanation,
            matched_profile_fields=matched,
            conflicting_profile_fields=conflicting,
            evidence_ids=[evidence.id],
        )
        enriched.enrichment.observations.append(observation)
        finding = Finding(
            id=f"finding-{len(enriched.findings) + 1:06d}",
            category=FindingCategory.ENRICHMENT_OBSERVATION,
            severity=Severity.WARNING
            if assessment in {RdapAssessment.CONFLICTING, RdapAssessment.UNAVAILABLE}
            else Severity.INFO,
            rule_id=f"RDAP.{assessment.value.upper()}",
            reference="Authoritative RDAP evidence; assessment does not establish legal ownership",
            message=explanation,
            target_ids=groups[result.requested_prefix],
            evidence_ids=[evidence.id],
        )
        enriched.findings.append(finding)
        for row_id in groups[result.requested_prefix]:
            row = rows_by_id[row_id]
            row.evidence_ids.append(evidence.id)
            row.finding_ids.append(finding.id)

    enriched.statistics.enrichment_observations = (
        len(enriched.enrichment.observations)
        + len(enriched.enrichment.mcp_observations)
        + len(enriched.enrichment.asn_associations)
    )
    enriched.statistics.finding_counts.rdap_mcp_enrichment_observation = sum(
        finding.category == FindingCategory.ENRICHMENT_OBSERVATION for finding in enriched.findings
    )
    enriched.statistics.severity_counts.error = sum(
        finding.severity == Severity.ERROR for finding in enriched.findings
    )
    enriched.statistics.severity_counts.warning = sum(
        finding.severity == Severity.WARNING for finding in enriched.findings
    )
    enriched.statistics.severity_counts.info = sum(
        finding.severity == Severity.INFO for finding in enriched.findings
    )
    return enriched
