from __future__ import annotations

from typing import TypeVar
from urllib.parse import urlsplit

from audit_types import AuditInputError, JsonObject, JsonValue, StringEnum

EnumValue = TypeVar("EnumValue", bound=StringEnum)


def as_object(value: JsonValue, path: str) -> JsonObject:
    match value:
        case dict() as mapping:
            return mapping
        case _:
            raise AuditInputError(path=path, detail="expected an object")


def as_array(value: JsonValue, path: str) -> list[JsonValue]:
    match value:
        case list() as items:
            return items
        case _:
            raise AuditInputError(path=path, detail="expected an array")


def required(mapping: JsonObject, key: str, path: str) -> JsonValue:
    if key not in mapping:
        raise AuditInputError(path=f"{path}.{key}", detail="field is required")
    return mapping[key]


def string(mapping: JsonObject, key: str, path: str) -> str:
    value = required(mapping, key, path)
    match value:
        case str() as text if text:
            return text
        case _:
            raise AuditInputError(
                path=f"{path}.{key}",
                detail="expected a non-empty string",
            )


def optional_string(mapping: JsonObject, key: str, path: str) -> str:
    value = required(mapping, key, path)
    match value:
        case str() as text:
            return text
        case _:
            raise AuditInputError(path=f"{path}.{key}", detail="expected a string")


def web_url(mapping: JsonObject, key: str, path: str) -> str:
    value = string(mapping, key, path)
    try:
        parsed = urlsplit(value)
        _ = parsed.port
    except ValueError as error:
        raise AuditInputError(
            path=f"{path}.{key}",
            detail="expected an http or https URL with a host",
        ) from error

    is_http = parsed.scheme in {"http", "https"}
    has_host = parsed.hostname is not None
    has_credentials = parsed.username is not None or parsed.password is not None
    has_whitespace = any(character.isspace() for character in value)
    if not is_http or not has_host or has_credentials or has_whitespace:
        raise AuditInputError(
            path=f"{path}.{key}",
            detail="expected an http or https URL with a host",
        )
    return value


def positive_integer(mapping: JsonObject, key: str, path: str) -> int:
    value = required(mapping, key, path)
    match value:
        case bool():
            raise AuditInputError(path=f"{path}.{key}", detail="expected an integer")
        case int() as number if number >= 1:
            return number
        case _:
            raise AuditInputError(
                path=f"{path}.{key}",
                detail="expected a positive integer",
            )


def boolean(mapping: JsonObject, key: str, path: str) -> bool:
    value = required(mapping, key, path)
    match value:
        case bool() as flag:
            return flag
        case _:
            raise AuditInputError(path=f"{path}.{key}", detail="expected a boolean")


def optional_position(mapping: JsonObject, path: str) -> int | None:
    value = required(mapping, "brand_position", path)
    match value:
        case None:
            return None
        case bool():
            raise AuditInputError(
                path=f"{path}.brand_position",
                detail="expected a positive integer or null",
            )
        case int() as position if position >= 1:
            return position
        case _:
            raise AuditInputError(
                path=f"{path}.brand_position",
                detail="expected a positive integer or null",
            )


def enum_value(
    enum_type: type[EnumValue],
    mapping: JsonObject,
    key: str,
    path: str,
) -> EnumValue:
    value = string(mapping, key, path)
    try:
        return enum_type(value)
    except ValueError as error:
        allowed = ", ".join(item.value for item in enum_type)
        raise AuditInputError(
            path=f"{path}.{key}",
            detail=f"expected one of: {allowed}",
        ) from error


def string_tuple(mapping: JsonObject, key: str, path: str) -> tuple[str, ...]:
    items = as_array(required(mapping, key, path), f"{path}.{key}")
    values: list[str] = []
    for index, item in enumerate(items):
        match item:
            case str() as text if text:
                values.append(text)
            case _:
                raise AuditInputError(
                    path=f"{path}.{key}[{index}]",
                    detail="expected a non-empty string",
                )
    return tuple(values)
