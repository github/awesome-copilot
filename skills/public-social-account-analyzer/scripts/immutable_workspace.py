"""Create-only collection workspaces with an identity-bound commit marker.

The protocol deliberately never rolls output back.  A failed run can leave the
directory and any files it created, but without a valid ``.complete`` marker.
That makes failure recovery race-free: this module never deletes, replaces, or
renames a pathname that another process could have exchanged concurrently.
"""

from __future__ import annotations

import hashlib
import ctypes
import errno
import json
import os
import re
import stat
import sys
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterable, Iterator


FORMAT = "public-social-account-analyzer/immutable-workspace-v1"
MANIFEST_NAME = "manifest.json"
COMPLETE_NAME = ".complete"
_MARKER_PREFIX = b"PUBLIC-SOCIAL-ACCOUNT-ANALYZER-COMPLETE-V1\nmanifest-sha256="
_SHA256_PATTERN = re.compile(r"[0-9a-f]{64}")
_MAX_MANIFEST_BYTES = 1024 * 1024
_MAX_MARKER_BYTES = len(_MARKER_PREFIX) + 65
_FINAL_COMMIT_IO_ATTEMPTS = 3
_COMMIT_INDETERMINATE_MESSAGE = (
    "workspace commit durability or final verification is indeterminate"
)
DEFAULT_MAX_ARTIFACT_BYTES = 64 * 1024 * 1024

ANALYSIS_REQUIRED_ARTIFACTS = frozenset(
    {
        "source/profile.json",
        "source/posts.jsonl",
        "source/collection-task.json",
        "source/collection-provenance.json",
        "normalized-posts.csv",
        "normalized-coverage.json",
        "analysis.json",
        "account-analysis-report.md",
        "dashboard.html",
        "task.json",
        "pipeline-report.md",
        "delivery-summary.json",
        "final-response.md",
    }
)
ANALYSIS_OPTIONAL_ARTIFACTS = frozenset(
    {
        "source/comments.jsonl",
        "source/index-evidence.json",
        "taxonomy-prompt.md",
        "taxonomy-input.jsonl",
        "taxonomy-result-template.json",
        "source/classification-results.json",
        "business-insights-prompt.md",
        "business-context.json",
        "business-evidence-catalog.jsonl",
        "business-result-template.json",
        "source/business-insight-results.json",
        "comment-insights-prompt.md",
        "source/comment-insight-results.json",
    }
)
ANALYSIS_ARTIFACTS = ANALYSIS_REQUIRED_ARTIFACTS | ANALYSIS_OPTIONAL_ARTIFACTS
ANALYSIS_OPTIONAL_ARTIFACT_REQUIREMENTS = {
    "taxonomy-input.jsonl": frozenset({"taxonomy-prompt.md"}),
    "taxonomy-result-template.json": frozenset({"taxonomy-prompt.md"}),
    "source/classification-results.json": frozenset({"taxonomy-prompt.md"}),
    "business-context.json": frozenset({"business-insights-prompt.md"}),
    "business-evidence-catalog.jsonl": frozenset({"business-insights-prompt.md"}),
    "business-result-template.json": frozenset({"business-insights-prompt.md"}),
}


class WorkspaceError(RuntimeError):
    """Base class for stable immutable-workspace failures."""


class WorkspaceExistsError(WorkspaceError):
    """A create-only workspace or artifact name was already occupied."""


class WorkspaceCapabilityError(WorkspaceError):
    """The host cannot provide the primitives required by the protocol."""


class WorkspaceIdentityError(WorkspaceError):
    """A held workspace or artifact no longer matches its pathname."""


class WorkspaceVerificationError(WorkspaceError):
    """A committed workspace did not satisfy the manifest contract."""


class WorkspaceWriteError(WorkspaceError):
    """A create-only artifact could not be safely persisted."""


class WorkspaceCommitIndeterminate(WorkspaceError):
    """A visible marker may exist, but commit success cannot be confirmed."""

    def __init__(self) -> None:
        super().__init__(_COMMIT_INDETERMINATE_MESSAGE)


def _identity(metadata) -> tuple[int, int]:
    return metadata.st_dev, metadata.st_ino


def _backend_kind() -> str:
    if os.name == "nt":
        return "windows"
    if sys.platform == "darwin" or sys.platform.startswith("linux"):
        return "posix"
    return "unsupported"


def _directory_flags() -> int:
    return (
        os.O_RDONLY
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_DIRECTORY", 0)
        | getattr(os, "O_NOFOLLOW", 0)
    )


def _read_flags() -> int:
    return (
        os.O_RDONLY
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_NONBLOCK", 0)
    )


def _create_flags() -> int:
    return (
        os.O_RDWR
        | os.O_CREAT
        | os.O_EXCL
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_NOFOLLOW", 0)
        | getattr(os, "O_NONBLOCK", 0)
    )


@dataclass
class _PosixChainEntry:
    name: str | None
    descriptor: int
    identity: tuple[int, int]


class _PosixDirectoryChain:
    """Held no-follow descriptors for every component beneath ``/``."""

    def __init__(self, entries: list[_PosixChainEntry]) -> None:
        self.entries = entries
        self.closed = False

    @property
    def leaf_fd(self) -> int:
        if self.closed or not self.entries:
            raise WorkspaceIdentityError("workspace path chain is closed")
        return self.entries[-1].descriptor

    @property
    def identities(self) -> tuple[tuple[int, int], ...]:
        return tuple(entry.identity for entry in self.entries)

    def append(
        self,
        name: str,
        *,
        error_type: type[WorkspaceError],
    ) -> _PosixChainEntry:
        descriptor = -1
        try:
            descriptor = os.open(name, _directory_flags(), dir_fd=self.leaf_fd)
            held = os.fstat(descriptor)
            named = os.stat(
                name, dir_fd=self.leaf_fd, follow_symlinks=False
            )
            if (
                not stat.S_ISDIR(held.st_mode)
                or not stat.S_ISDIR(named.st_mode)
                or _identity(held) != _identity(named)
            ):
                raise error_type("workspace path component identity changed")
            entry = _PosixChainEntry(name, descriptor, _identity(held))
            self.entries.append(entry)
            descriptor = -1
            return entry
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise error_type("workspace path component cannot be opened safely") from exc
        finally:
            if descriptor >= 0:
                try:
                    os.close(descriptor)
                except OSError:
                    pass

    def validate(self, *, error_type: type[WorkspaceError]) -> None:
        if self.closed or not self.entries:
            raise error_type("workspace path chain is closed")
        try:
            root = self.entries[0]
            held_root = os.fstat(root.descriptor)
            named_root = os.stat(os.sep, follow_symlinks=False)
            if (
                not stat.S_ISDIR(held_root.st_mode)
                or not stat.S_ISDIR(named_root.st_mode)
                or _identity(held_root) != root.identity
                or _identity(named_root) != root.identity
            ):
                raise error_type("workspace root identity changed")
            for parent, child in zip(self.entries, self.entries[1:]):
                held = os.fstat(child.descriptor)
                named = os.stat(
                    child.name,
                    dir_fd=parent.descriptor,
                    follow_symlinks=False,
                )
                if (
                    not stat.S_ISDIR(held.st_mode)
                    or not stat.S_ISDIR(named.st_mode)
                    or _identity(held) != child.identity
                    or _identity(named) != child.identity
                ):
                    raise error_type("workspace path component identity changed")
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise error_type("workspace path chain identity changed") from exc

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        for entry in reversed(self.entries):
            try:
                os.close(entry.descriptor)
            except OSError:
                pass
        self.entries.clear()


def _open_posix_directory_chain(
    path: str,
    *,
    error_type: type[WorkspaceError],
) -> _PosixDirectoryChain:
    target = os.path.normpath(os.path.abspath(path))
    if not target.startswith(os.sep):
        raise error_type("workspace path must be absolute")
    root_fd = -1
    chain: _PosixDirectoryChain | None = None
    try:
        root_fd = os.open(os.sep, _directory_flags())
        root_metadata = os.fstat(root_fd)
        if not stat.S_ISDIR(root_metadata.st_mode):
            raise error_type("workspace root is unsafe")
        chain = _PosixDirectoryChain(
            [_PosixChainEntry(None, root_fd, _identity(root_metadata))]
        )
        root_fd = -1
        for component in (part for part in target.split(os.sep) if part):
            chain.append(component, error_type=error_type)
        chain.validate(error_type=error_type)
        return chain
    except WorkspaceError:
        if chain is not None:
            chain.close()
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        if chain is not None:
            chain.close()
        raise error_type("workspace path cannot be opened safely") from exc
    finally:
        if root_fd >= 0:
            try:
                os.close(root_fd)
            except OSError:
                pass


def _preflight_posix() -> None:
    required_constants = ("O_NOFOLLOW", "O_NONBLOCK", "O_DIRECTORY")
    if any(not getattr(os, name, 0) for name in required_constants):
        raise WorkspaceCapabilityError("safe POSIX output primitives are unavailable")
    dir_fd = getattr(os, "supports_dir_fd", ())
    fd_paths = getattr(os, "supports_fd", ())
    if not all(operation in dir_fd for operation in (os.mkdir, os.open, os.stat)):
        raise WorkspaceCapabilityError("safe POSIX output primitives are unavailable")
    if os.listdir not in fd_paths:
        raise WorkspaceCapabilityError("safe POSIX output primitives are unavailable")


def _preflight_windows() -> None:
    try:
        import msvcrt  # noqa: F401

        win_dll = getattr(__import__("ctypes"), "WinDLL", None)
        if win_dll is None:
            raise RuntimeError
        kernel32 = win_dll("kernel32", use_last_error=True)
        for name in (
            "CreateFileW",
            "GetFileInformationByHandle",
            "GetFileInformationByHandleEx",
            "CloseHandle",
        ):
            if getattr(kernel32, name, None) is None:
                raise RuntimeError
    except Exception as exc:
        raise WorkspaceCapabilityError(
            "safe Windows output primitives are unavailable"
        ) from exc


class _WindowsFileTime(ctypes.Structure):
    _fields_ = [("low", ctypes.c_uint32), ("high", ctypes.c_uint32)]


class _WindowsHandleInformation(ctypes.Structure):
    _fields_ = [
        ("attributes", ctypes.c_uint32),
        ("creation_time", _WindowsFileTime),
        ("access_time", _WindowsFileTime),
        ("write_time", _WindowsFileTime),
        ("volume_serial", ctypes.c_uint32),
        ("size_high", ctypes.c_uint32),
        ("size_low", ctypes.c_uint32),
        ("links", ctypes.c_uint32),
        ("index_high", ctypes.c_uint32),
        ("index_low", ctypes.c_uint32),
    ]


def _windows_kernel32():
    win_dll = getattr(ctypes, "WinDLL", None)
    if win_dll is None:
        raise WorkspaceCapabilityError("safe Windows output primitives are unavailable")
    return win_dll("kernel32", use_last_error=True)


def _windows_error(message: str) -> OSError:
    get_error = getattr(ctypes, "get_last_error", lambda: errno.EIO)
    number = get_error() or errno.EIO
    return OSError(number, message)


def _windows_handle_metadata(handle: int) -> dict[str, object]:
    kernel32 = _windows_kernel32()
    function = kernel32.GetFileInformationByHandle
    function.argtypes = [
        ctypes.c_void_p,
        ctypes.POINTER(_WindowsHandleInformation),
    ]
    function.restype = ctypes.c_int
    information = _WindowsHandleInformation()
    if not function(ctypes.c_void_p(handle), ctypes.byref(information)):
        raise _windows_error("Windows handle identity is unavailable")
    return {
        "identity": (
            information.volume_serial,
            (information.index_high << 32) | information.index_low,
        ),
        "directory": bool(information.attributes & 0x00000010),
        "reparse": bool(information.attributes & 0x00000400),
        "links": information.links,
        "size": (information.size_high << 32) | information.size_low,
    }


_WINDOWS_DIRECTORY_BUFFER_BYTES = 64 * 1024
_FILE_ID_BOTH_DIRECTORY_INFO = 10
_FILE_ID_BOTH_DIRECTORY_RESTART_INFO = 11
_ERROR_NO_MORE_FILES = 18
_FILE_ID_BOTH_NAME_LENGTH_OFFSET = 60
_FILE_ID_BOTH_NAME_OFFSET = 104


def _parse_windows_directory_buffer(payload: bytes) -> set[str]:
    """Parse one FILE_ID_BOTH_DIR_INFO buffer returned for a held handle."""
    names: set[str] = set()
    offset = 0
    while True:
        if offset + _FILE_ID_BOTH_NAME_OFFSET > len(payload):
            raise WorkspaceVerificationError(
                "Windows directory inventory is malformed"
            )
        next_offset = int.from_bytes(payload[offset : offset + 4], "little")
        name_length = int.from_bytes(
            payload[
                offset
                + _FILE_ID_BOTH_NAME_LENGTH_OFFSET : offset
                + _FILE_ID_BOTH_NAME_LENGTH_OFFSET
                + 4
            ],
            "little",
        )
        name_start = offset + _FILE_ID_BOTH_NAME_OFFSET
        name_end = name_start + name_length
        if next_offset == 0:
            record_end = len(payload)
        else:
            if (
                next_offset < _FILE_ID_BOTH_NAME_OFFSET
                or next_offset % 8
                or offset + next_offset > len(payload)
            ):
                raise WorkspaceVerificationError(
                    "Windows directory inventory is malformed"
                )
            record_end = offset + next_offset
        if name_length % 2 or name_end > record_end:
            raise WorkspaceVerificationError(
                "Windows directory inventory is malformed"
            )
        try:
            name = payload[name_start:name_end].decode("utf-16-le")
        except UnicodeDecodeError as exc:
            raise WorkspaceVerificationError(
                "Windows directory inventory is malformed"
            ) from exc
        if name and name not in {".", ".."}:
            names.add(name)
        if next_offset == 0:
            return names
        offset = record_end


def _windows_directory_names(handle: int) -> set[str]:
    """Enumerate names through an already-held Windows directory handle."""
    kernel32 = _windows_kernel32()
    function = kernel32.GetFileInformationByHandleEx
    function.argtypes = [
        ctypes.c_void_p,
        ctypes.c_int,
        ctypes.c_void_p,
        ctypes.c_uint32,
    ]
    function.restype = ctypes.c_int
    names: set[str] = set()
    information_class = _FILE_ID_BOTH_DIRECTORY_RESTART_INFO
    while True:
        buffer = ctypes.create_string_buffer(_WINDOWS_DIRECTORY_BUFFER_BYTES)
        set_error = getattr(ctypes, "set_last_error", None)
        if set_error is not None:
            set_error(0)
        succeeded = function(
            ctypes.c_void_p(handle),
            information_class,
            ctypes.byref(buffer),
            ctypes.sizeof(buffer),
        )
        if not succeeded:
            get_error = getattr(ctypes, "get_last_error", lambda: errno.EIO)
            error_number = get_error() or errno.EIO
            if error_number == _ERROR_NO_MORE_FILES:
                return names
            raise OSError(
                error_number, "Windows directory inventory is unavailable"
            )
        names.update(_parse_windows_directory_buffer(buffer.raw))
        information_class = _FILE_ID_BOTH_DIRECTORY_INFO


def _close_windows_handle(handle: object) -> None:
    if int(handle) < 0:
        return
    kernel32 = _windows_kernel32()
    function = kernel32.CloseHandle
    function.argtypes = [ctypes.c_void_p]
    function.restype = ctypes.c_int
    function(ctypes.c_void_p(int(handle)))


def _open_windows_path(
    path: str,
    *,
    create_new: bool,
    directory: bool,
) -> tuple[int, dict[str, object]]:
    """Open without FILE_SHARE_DELETE so owned names cannot be exchanged."""
    kernel32 = _windows_kernel32()
    function = kernel32.CreateFileW
    function.argtypes = [
        ctypes.c_wchar_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
    ]
    function.restype = ctypes.c_void_p
    if create_new:
        desired_access = 0x80000000 | 0x40000000
    elif directory:
        desired_access = 0x00000001 | 0x00000080
    else:
        desired_access = 0x80000000
    share_without_delete = 0x00000001 | 0x00000002
    disposition = 1 if create_new else 3
    flags = 0x00200000
    if directory:
        flags |= 0x02000000
    else:
        flags |= 0x00000080
    raw = function(
        os.path.abspath(path),
        desired_access,
        share_without_delete,
        None,
        disposition,
        flags,
        None,
    )
    invalid = ctypes.c_void_p(-1).value
    if raw in {None, invalid}:
        error = _windows_error("Windows path cannot be opened safely")
        if create_new and error.errno in {80, 183}:
            raise WorkspaceExistsError("workspace artifact already exists") from error
        raise error
    handle = int(raw)
    try:
        metadata = _windows_handle_metadata(handle)
        if bool(metadata["directory"]) is not directory or metadata["reparse"]:
            raise OSError("unsafe Windows path type")
        return handle, metadata
    except BaseException:
        _close_windows_handle(handle)
        raise


def _windows_file_handle_to_fd(handle: int, *, writable: bool) -> int:
    try:
        import msvcrt

        return msvcrt.open_osfhandle(
            handle,
            (os.O_RDWR if writable else os.O_RDONLY)
            | getattr(os, "O_BINARY", 0),
        )
    except Exception:
        _close_windows_handle(handle)
        raise


def _open_windows_regular_fd(path: str, *, create_new: bool) -> tuple[int, tuple[int, int]]:
    handle, metadata = _open_windows_path(
        path, create_new=create_new, directory=False
    )
    if metadata["links"] != 1:
        _close_windows_handle(handle)
        raise WorkspaceVerificationError("workspace artifact is unsafe")
    descriptor = _windows_file_handle_to_fd(handle, writable=create_new)
    return descriptor, metadata["identity"]


def preflight_backend() -> str:
    """Validate the full backend before any output directory is created."""
    backend = _backend_kind()
    if backend == "posix":
        _preflight_posix()
    elif backend == "windows":
        _preflight_windows()
    else:
        raise WorkspaceCapabilityError("immutable workspace backend is unavailable")
    return backend


def _normalized_comparison_path(path: str) -> str:
    return os.path.normcase(os.path.normpath(os.path.abspath(path)))


def _lexically_overlaps(first: str, second: str) -> bool:
    normalized_first = _normalized_comparison_path(first)
    normalized_second = _normalized_comparison_path(second)
    try:
        common = os.path.commonpath((normalized_first, normalized_second))
    except ValueError:
        return False
    return common in {normalized_first, normalized_second}


def reject_workspace_overlap(source_path: str, destination_path: str) -> None:
    """Reject lexical or identity overlap without mutating either pathname."""
    backend = preflight_backend()
    source = os.path.abspath(source_path)
    destination = os.path.abspath(destination_path)
    if _lexically_overlaps(source, destination):
        raise WorkspaceVerificationError(
            "resume source and destination overlap"
        )
    destination_parent = os.path.dirname(destination)
    if backend == "posix":
        source_chain: _PosixDirectoryChain | None = None
        destination_chain: _PosixDirectoryChain | None = None
        try:
            source_chain = _open_posix_directory_chain(
                source, error_type=WorkspaceVerificationError
            )
            destination_chain = _open_posix_directory_chain(
                destination_parent, error_type=WorkspaceVerificationError
            )
            source_chain.validate(error_type=WorkspaceVerificationError)
            destination_chain.validate(error_type=WorkspaceVerificationError)
            if source_chain.entries[-1].identity in destination_chain.identities:
                raise WorkspaceVerificationError(
                    "resume destination is inside the source workspace"
                )
            return
        finally:
            if destination_chain is not None:
                destination_chain.close()
            if source_chain is not None:
                source_chain.close()

    source_handle = -1
    ancestor_handles: list[int] = []
    try:
        source_handle, source_metadata = _open_windows_path(
            source, create_new=False, directory=True
        )
        current = destination_parent
        while True:
            handle, metadata = _open_windows_path(
                current, create_new=False, directory=True
            )
            ancestor_handles.append(handle)
            if metadata["identity"] == source_metadata["identity"]:
                raise WorkspaceVerificationError(
                    "resume destination is inside the source workspace"
                )
            parent = os.path.dirname(current)
            if parent == current:
                break
            current = parent
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError(
            "resume paths cannot be compared safely"
        ) from exc
    finally:
        for handle in reversed(ancestor_handles):
            try:
                _close_windows_handle(handle)
            except OSError:
                pass
        if source_handle >= 0:
            try:
                _close_windows_handle(source_handle)
            except OSError:
                pass


def preflight_workspace_target(path: str) -> str:
    """Prove a final output name is absent without creating any node."""
    backend = preflight_backend()
    target = os.path.abspath(path)
    parent = os.path.dirname(target)
    name = os.path.basename(target)
    if not name or name in {".", ".."}:
        raise WorkspaceWriteError("invalid workspace target")
    if backend == "posix":
        chain: _PosixDirectoryChain | None = None
        try:
            chain = _open_posix_directory_chain(
                parent, error_type=WorkspaceWriteError
            )
            chain.validate(error_type=WorkspaceIdentityError)
            try:
                os.stat(name, dir_fd=chain.leaf_fd, follow_symlinks=False)
            except FileNotFoundError:
                chain.validate(error_type=WorkspaceIdentityError)
                return target
            raise WorkspaceExistsError("workspace target already exists")
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceWriteError(
                "workspace target cannot be checked safely"
            ) from exc
        finally:
            if chain is not None:
                chain.close()

    parent_handle = -1
    try:
        parent_handle, parent_metadata = _open_windows_path(
            parent, create_new=False, directory=True
        )
        try:
            os.lstat(target)
        except FileNotFoundError:
            held = _windows_handle_metadata(parent_handle)
            if held["identity"] != parent_metadata["identity"]:
                raise WorkspaceIdentityError("workspace parent identity changed")
            return target
        raise WorkspaceExistsError("workspace target already exists")
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceWriteError(
            "workspace target cannot be checked safely"
        ) from exc
    finally:
        if parent_handle >= 0:
            try:
                _close_windows_handle(parent_handle)
            except OSError:
                pass


def reject_sealed_workspace(path: str) -> None:
    """Reject legacy mutation of a committed or commit-started workspace."""
    target = os.path.abspath(path)
    try:
        metadata = os.lstat(target)
    except FileNotFoundError:
        return
    except OSError as exc:
        raise WorkspaceVerificationError(
            "legacy workspace cannot be inspected safely"
        ) from exc
    if not stat.S_ISDIR(metadata.st_mode) or stat.S_ISLNK(metadata.st_mode):
        raise WorkspaceVerificationError("legacy workspace path is unsafe")

    backend = preflight_backend()
    metadata_names = (COMPLETE_NAME, MANIFEST_NAME)
    if backend == "posix":
        chain: _PosixDirectoryChain | None = None
        try:
            chain = _open_posix_directory_chain(
                target, error_type=WorkspaceVerificationError
            )
            chain.validate(error_type=WorkspaceVerificationError)
            for name in metadata_names:
                try:
                    os.stat(name, dir_fd=chain.leaf_fd, follow_symlinks=False)
                except FileNotFoundError:
                    continue
                raise WorkspaceVerificationError(
                    "legacy CLI refuses a sealed immutable workspace"
                )
            chain.validate(error_type=WorkspaceVerificationError)
            return
        finally:
            if chain is not None:
                chain.close()

    handle = -1
    try:
        handle, held = _open_windows_path(
            target, create_new=False, directory=True
        )
        for name in metadata_names:
            if os.path.lexists(os.path.join(target, name)):
                raise WorkspaceVerificationError(
                    "legacy CLI refuses a sealed immutable workspace"
                )
        if _windows_handle_metadata(handle)["identity"] != held["identity"]:
            raise WorkspaceVerificationError("legacy workspace identity changed")
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError(
            "legacy workspace cannot be inspected safely"
        ) from exc
    finally:
        if handle >= 0:
            try:
                _close_windows_handle(handle)
            except OSError:
                pass


def _normalize_artifacts(values: Iterable[str]) -> frozenset[str]:
    normalized: set[str] = set()
    for value in values:
        if not isinstance(value, str):
            raise ValueError("artifact path must be text")
        relative = value.replace("\\", "/")
        parts = relative.split("/")
        if (
            len(parts) not in {1, 2}
            or (len(parts) == 2 and parts[0] != "source")
            or any(part in {"", ".", ".."} for part in parts)
            or relative in {MANIFEST_NAME, COMPLETE_NAME, "source"}
        ):
            raise ValueError("invalid artifact path")
        normalized.add(relative)
    return frozenset(normalized)


def _regular_single_link(metadata) -> bool:
    return stat.S_ISREG(metadata.st_mode) and metadata.st_nlink == 1


def _read_descriptor(descriptor: int, max_bytes: int) -> bytes:
    metadata = os.fstat(descriptor)
    if not _regular_single_link(metadata):
        raise WorkspaceVerificationError("workspace artifact is unsafe")
    if metadata.st_size > max_bytes:
        raise WorkspaceVerificationError("workspace artifact is too large")
    try:
        offset = os.lseek(descriptor, 0, os.SEEK_CUR)
        os.lseek(descriptor, 0, os.SEEK_SET)
    except OSError as exc:
        raise WorkspaceVerificationError("workspace artifact is unreadable") from exc
    chunks: list[bytes] = []
    remaining = max_bytes + 1
    try:
        while remaining > 0:
            chunk = os.read(descriptor, min(1024 * 1024, remaining))
            if not chunk:
                break
            chunks.append(chunk)
            remaining -= len(chunk)
    finally:
        try:
            os.lseek(descriptor, offset, os.SEEK_SET)
        except OSError:
            pass
    payload = b"".join(chunks)
    if len(payload) > max_bytes:
        raise WorkspaceVerificationError("workspace artifact is too large")
    return payload


@dataclass
class _OwnedLeaf:
    relative_path: str
    descriptor: int
    identity: tuple[int, int]


class ImmutableWorkspace:
    """A final-name reservation whose artifacts and commit are create-only."""

    def __init__(
        self,
        path: str,
        *,
        allowed_artifacts: frozenset[str],
        backend: str,
        parent_handle: object,
        target_handle: object,
        source_handle: object,
        target_identity: tuple[int, int],
        source_identity: tuple[int, int],
        target_name: str,
        parent_identity: tuple[int, int] | None = None,
        posix_chain: _PosixDirectoryChain | None = None,
    ) -> None:
        self.path = os.path.abspath(path)
        self.parent_path = os.path.dirname(self.path)
        self.source_path = os.path.join(self.path, "source")
        self.allowed_artifacts = allowed_artifacts
        self.backend = backend
        self.parent_handle = parent_handle
        self.target_handle = target_handle
        self.source_handle = source_handle
        self.target_identity = target_identity
        self.source_identity = source_identity
        self.parent_identity = parent_identity
        self.target_name = target_name
        self.posix_chain = posix_chain
        self._leaves: dict[str, _OwnedLeaf] = {}
        self._invalid = False
        self._committed = False
        self._marker_finalized = False
        self.closed = False

    def __fspath__(self) -> str:
        return self.path

    @classmethod
    def reserve(
        cls, path: str, *, allowed_artifacts: Iterable[str]
    ) -> "ImmutableWorkspace":
        allowed = _normalize_artifacts(allowed_artifacts)
        backend = preflight_backend()
        target = os.path.abspath(path)
        parent = os.path.dirname(target)
        name = os.path.basename(target)
        if not name or name in {".", ".."}:
            raise WorkspaceWriteError("invalid workspace target")
        if backend == "posix":
            return cls._reserve_posix(target, parent, name, allowed)
        if not os.path.isdir(parent):
            raise WorkspaceWriteError("workspace parent does not exist")
        return cls._reserve_windows(target, parent, name, allowed)

    @classmethod
    def _reserve_posix(
        cls,
        target: str,
        parent: str,
        name: str,
        allowed: frozenset[str],
    ) -> "ImmutableWorkspace":
        chain: _PosixDirectoryChain | None = None
        transferred = False
        try:
            chain = _open_posix_directory_chain(
                parent, error_type=WorkspaceWriteError
            )
            chain.validate(error_type=WorkspaceIdentityError)
            parent_fd = chain.leaf_fd
            parent_identity = chain.entries[-1].identity
            try:
                os.mkdir(name, 0o700, dir_fd=parent_fd)
            except FileExistsError as exc:
                raise WorkspaceExistsError("workspace target already exists") from exc
            target_entry = chain.append(
                name, error_type=WorkspaceIdentityError
            )
            os.mkdir("source", 0o700, dir_fd=target_entry.descriptor)
            source_entry = chain.append(
                "source", error_type=WorkspaceIdentityError
            )
            chain.validate(error_type=WorkspaceIdentityError)
            reservation = cls(
                target,
                allowed_artifacts=allowed,
                backend="posix",
                parent_handle=parent_fd,
                target_handle=target_entry.descriptor,
                source_handle=source_entry.descriptor,
                target_identity=target_entry.identity,
                source_identity=source_entry.identity,
                target_name=name,
                parent_identity=parent_identity,
                posix_chain=chain,
            )
            transferred = True
            return reservation
        except WorkspaceError:
            raise
        except FileExistsError as exc:
            raise WorkspaceExistsError("workspace child already exists") from exc
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceWriteError("workspace cannot be reserved") from exc
        finally:
            if not transferred and chain is not None:
                chain.close()

    @classmethod
    def _reserve_windows(
        cls,
        target: str,
        parent: str,
        name: str,
        allowed: frozenset[str],
    ) -> "ImmutableWorkspace":
        parent_handle = target_handle = source_handle = -1
        transferred = False
        try:
            parent_handle, parent_metadata = _open_windows_path(
                parent, create_new=False, directory=True
            )
            try:
                os.mkdir(target, 0o700)
            except FileExistsError as exc:
                raise WorkspaceExistsError(
                    "workspace target already exists"
                ) from exc
            created_target = os.lstat(target)
            if (
                not stat.S_ISDIR(created_target.st_mode)
                or stat.S_ISLNK(created_target.st_mode)
            ):
                raise WorkspaceIdentityError("workspace target identity changed")
            target_handle, target_metadata = _open_windows_path(
                target, create_new=False, directory=True
            )
            if created_target.st_ino != target_metadata["identity"][1]:
                raise WorkspaceIdentityError("workspace target identity changed")
            source = os.path.join(target, "source")
            os.mkdir(source, 0o700)
            created_source = os.lstat(source)
            if (
                not stat.S_ISDIR(created_source.st_mode)
                or stat.S_ISLNK(created_source.st_mode)
            ):
                raise WorkspaceIdentityError("workspace source identity changed")
            source_handle, source_metadata = _open_windows_path(
                source, create_new=False, directory=True
            )
            if created_source.st_ino != source_metadata["identity"][1]:
                raise WorkspaceIdentityError("workspace source identity changed")
            reservation = cls(
                target,
                allowed_artifacts=allowed,
                backend="windows",
                parent_handle=parent_handle,
                target_handle=target_handle,
                source_handle=source_handle,
                target_identity=target_metadata["identity"],
                source_identity=source_metadata["identity"],
                target_name=name,
                parent_identity=parent_metadata["identity"],
            )
            transferred = True
            return reservation
        except WorkspaceError:
            raise
        except FileExistsError as exc:
            raise WorkspaceExistsError("workspace child already exists") from exc
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceWriteError("workspace cannot be reserved") from exc
        finally:
            if not transferred:
                for handle in (source_handle, target_handle, parent_handle):
                    if handle >= 0:
                        try:
                            _close_windows_handle(handle)
                        except OSError:
                            pass

    @property
    def _target_fd(self) -> int:
        if self.backend != "posix":
            raise WorkspaceCapabilityError("POSIX directory descriptor is unavailable")
        return int(self.target_handle)

    @property
    def _source_fd(self) -> int:
        if self.backend != "posix":
            raise WorkspaceCapabilityError("POSIX directory descriptor is unavailable")
        return int(self.source_handle)

    @property
    def _parent_fd(self) -> int:
        if self.backend != "posix":
            raise WorkspaceCapabilityError("POSIX directory descriptor is unavailable")
        return int(self.parent_handle)

    def _artifact_location(self, relative_path: str) -> tuple[int, str]:
        parts = relative_path.split("/")
        if len(parts) == 1:
            return self._target_fd, parts[0]
        return self._source_fd, parts[1]

    def _artifact_path(self, relative_path: str) -> str:
        return os.path.join(self.path, *relative_path.split("/"))

    def verify_identity(self) -> None:
        if self.closed:
            raise WorkspaceIdentityError("workspace is closed")
        if self.backend == "windows":
            try:
                held_parent = _windows_handle_metadata(int(self.parent_handle))
                held_target = _windows_handle_metadata(int(self.target_handle))
                held_source = _windows_handle_metadata(int(self.source_handle))
                named_parent_handle, named_parent = _open_windows_path(
                    self.parent_path, create_new=False, directory=True
                )
                try:
                    named_target_handle, named_target = _open_windows_path(
                        self.path, create_new=False, directory=True
                    )
                    try:
                        named_source_handle, named_source = _open_windows_path(
                            self.source_path, create_new=False, directory=True
                        )
                        try:
                            if (
                                self.parent_identity is None
                                or held_parent["identity"] != self.parent_identity
                                or named_parent["identity"] != self.parent_identity
                                or held_target["identity"] != self.target_identity
                                or named_target["identity"] != self.target_identity
                                or held_source["identity"] != self.source_identity
                                or named_source["identity"] != self.source_identity
                            ):
                                raise WorkspaceIdentityError(
                                    "workspace identity changed"
                                )
                        finally:
                            _close_windows_handle(named_source_handle)
                    finally:
                        _close_windows_handle(named_target_handle)
                finally:
                    _close_windows_handle(named_parent_handle)
                return
            except WorkspaceError:
                raise
            except (OSError, NotImplementedError, TypeError) as exc:
                raise WorkspaceIdentityError(
                    "workspace identity cannot be verified"
                ) from exc
        if self.posix_chain is None:
            raise WorkspaceIdentityError("workspace path chain is unavailable")
        self.posix_chain.validate(error_type=WorkspaceIdentityError)

    def _create_leaf(self, relative_path: str) -> _OwnedLeaf:
        if relative_path in self._leaves:
            raise WorkspaceExistsError("workspace artifact already created")
        if self.backend == "posix":
            directory_fd, leaf = self._artifact_location(relative_path)
        else:
            directory_fd, leaf = -1, ""
        descriptor = -1
        try:
            self.verify_identity()
            try:
                if self.backend == "posix":
                    descriptor = os.open(
                        leaf, _create_flags(), 0o600, dir_fd=directory_fd
                    )
                    metadata = os.fstat(descriptor)
                    identity = _identity(metadata)
                else:
                    descriptor, identity = _open_windows_regular_fd(
                        self._artifact_path(relative_path), create_new=True
                    )
            except FileExistsError as exc:
                raise WorkspaceExistsError(
                    "workspace artifact already exists"
                ) from exc
            metadata = os.fstat(descriptor)
            if not _regular_single_link(metadata):
                raise WorkspaceWriteError("workspace artifact is unsafe")
            owned = _OwnedLeaf(relative_path, descriptor, identity)
            self._leaves[relative_path] = owned
            descriptor = -1
            self.verify_identity()
            self._verify_leaf_identity(owned)
            return owned
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceWriteError("workspace artifact cannot be created") from exc
        finally:
            if descriptor >= 0:
                try:
                    os.close(descriptor)
                except OSError:
                    pass

    @contextmanager
    def open_text(
        self, relative_path: str, *, newline: str | None = None
    ) -> Iterator[object]:
        normalized = _normalize_artifacts((relative_path,))
        relative = next(iter(normalized))
        if relative not in self.allowed_artifacts:
            raise WorkspaceWriteError("workspace artifact is not allowlisted")
        if self._committed:
            raise WorkspaceWriteError("workspace is already committed")
        owned = self._create_leaf(relative)
        handle = None
        try:
            handle = os.fdopen(
                os.dup(owned.descriptor),
                "w",
                encoding="utf-8",
                newline=newline,
            )
            yield handle
            handle.flush()
            os.fsync(handle.fileno())
        except BaseException:
            self._invalid = True
            raise
        finally:
            if handle is not None:
                try:
                    handle.close()
                except OSError:
                    self._invalid = True

    @contextmanager
    def open_binary(self, relative_path: str) -> Iterator[object]:
        """Open one allowlisted artifact for a create-only binary write."""
        normalized = _normalize_artifacts((relative_path,))
        relative = next(iter(normalized))
        if relative not in self.allowed_artifacts:
            raise WorkspaceWriteError("workspace artifact is not allowlisted")
        if self._committed:
            raise WorkspaceWriteError("workspace is already committed")
        owned = self._create_leaf(relative)
        handle = None
        try:
            handle = os.fdopen(os.dup(owned.descriptor), "wb")
            yield handle
            handle.flush()
            os.fsync(handle.fileno())
        except BaseException:
            self._invalid = True
            raise
        finally:
            if handle is not None:
                try:
                    handle.close()
                except OSError:
                    self._invalid = True

    def _verify_leaf_identity(self, owned: _OwnedLeaf) -> os.stat_result:
        if self.backend == "windows":
            try:
                held = os.fstat(owned.descriptor)
                named_handle, named = _open_windows_path(
                    self._artifact_path(owned.relative_path),
                    create_new=False,
                    directory=False,
                )
                try:
                    if (
                        not _regular_single_link(held)
                        or named["reparse"]
                        or named["directory"]
                        or named["links"] != 1
                        or named["identity"] != owned.identity
                    ):
                        raise WorkspaceIdentityError(
                            "workspace artifact identity changed"
                        )
                finally:
                    _close_windows_handle(named_handle)
                return held
            except WorkspaceError:
                raise
            except (OSError, NotImplementedError, TypeError) as exc:
                raise WorkspaceIdentityError(
                    "workspace artifact identity changed"
                ) from exc
        directory_fd, leaf = self._artifact_location(owned.relative_path)
        try:
            held = os.fstat(owned.descriptor)
            named = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceIdentityError("workspace artifact identity changed") from exc
        if (
            not _regular_single_link(held)
            or not _regular_single_link(named)
            or _identity(held) != owned.identity
            or _identity(named) != owned.identity
        ):
            raise WorkspaceIdentityError("workspace artifact identity changed")
        return held

    def _inventory_names(self, paths: Iterable[str]) -> tuple[set[str], set[str]]:
        root = {"source"}
        source: set[str] = set()
        for relative in paths:
            parts = relative.split("/")
            if len(parts) == 1:
                root.add(parts[0])
            else:
                source.add(parts[1])
        return root, source

    def _verify_inventory(self, paths: Iterable[str]) -> None:
        expected_root, expected_source = self._inventory_names(paths)
        if self.backend == "posix":
            actual_root = set(os.listdir(self._target_fd))
            actual_source = set(os.listdir(self._source_fd))
        else:
            actual_root = set(os.listdir(self.path))
            actual_source = set(os.listdir(self.source_path))
        if COMPLETE_NAME in actual_root or MANIFEST_NAME in actual_root:
            raise WorkspaceExistsError("workspace commit metadata already exists")
        if actual_root != expected_root or actual_source != expected_source:
            raise WorkspaceIdentityError("workspace inventory changed")

    def _artifact_evidence(self) -> list[dict[str, object]]:
        evidence: list[dict[str, object]] = []
        for relative in sorted(self._leaves):
            if relative in {MANIFEST_NAME, COMPLETE_NAME}:
                continue
            owned = self._leaves[relative]
            metadata = self._verify_leaf_identity(owned)
            payload = _read_descriptor(
                owned.descriptor, DEFAULT_MAX_ARTIFACT_BYTES
            )
            if len(payload) != metadata.st_size:
                raise WorkspaceIdentityError("workspace artifact size changed")
            evidence.append(
                {
                    "path": relative,
                    "size": len(payload),
                    "sha256": hashlib.sha256(payload).hexdigest(),
                }
            )
        return evidence

    def _write_metadata(self, relative_path: str, payload: bytes) -> _OwnedLeaf:
        owned = self._create_leaf(relative_path)
        try:
            self._write_descriptor(owned.descriptor, payload)
            os.fsync(owned.descriptor)
            self._verify_leaf_identity(owned)
            return owned
        except BaseException:
            self._invalid = True
            raise

    @staticmethod
    def _write_descriptor(descriptor: int, payload: bytes) -> None:
        view = memoryview(payload)
        while view:
            written = os.write(descriptor, view)
            if written <= 0:
                raise OSError("short workspace metadata write")
            view = view[written:]

    def _sync_precommit_directories(self) -> None:
        if self.backend != "posix":
            return
        try:
            os.fsync(self._source_fd)
            os.fsync(self._target_fd)
            os.fsync(self._parent_fd)
        except OSError as exc:
            self._invalid = True
            raise WorkspaceWriteError("workspace commit cannot be synced") from exc

    def _sync_final_marker(self, marker_owned: _OwnedLeaf) -> None:
        for _ in range(_FINAL_COMMIT_IO_ATTEMPTS):
            self.verify_identity()
            self._verify_leaf_identity(marker_owned)
            try:
                os.fsync(marker_owned.descriptor)
            except OSError:
                continue
            return
        raise WorkspaceCommitIndeterminate() from None

    def _verify_visible_commit(self) -> dict:
        for _ in range(_FINAL_COMMIT_IO_ATTEMPTS):
            try:
                return verify_committed_workspace(
                    self.path, allowed_artifacts=self.allowed_artifacts
                )
            except OSError:
                continue
        raise WorkspaceCommitIndeterminate() from None

    def commit(self) -> str:
        """Create manifest then ``.complete``; never repair or roll back."""
        if self.closed:
            raise WorkspaceIdentityError("workspace is closed")
        if self._committed:
            raise WorkspaceWriteError("workspace is already committed")
        if self._invalid:
            raise WorkspaceWriteError("workspace serialization did not complete")
        self.verify_identity()
        application_paths = set(self._leaves)
        if not application_paths.issubset(self.allowed_artifacts):
            raise WorkspaceWriteError("workspace contains unallowlisted artifacts")
        self._verify_inventory(application_paths)
        artifacts = self._artifact_evidence()
        manifest = {"artifacts": artifacts, "format": FORMAT}
        manifest_bytes = (
            json.dumps(
                manifest,
                ensure_ascii=False,
                sort_keys=True,
                separators=(",", ":"),
            ).encode("utf-8")
            + b"\n"
        )
        manifest_digest = hashlib.sha256(manifest_bytes).hexdigest()
        self._write_metadata(MANIFEST_NAME, manifest_bytes)
        self.verify_identity()
        self._verify_committing_tree(manifest, manifest_digest, marker=False)
        marker_owned = self._create_leaf(COMPLETE_NAME)
        try:
            os.fsync(marker_owned.descriptor)
        except OSError as exc:
            self._invalid = True
            raise WorkspaceWriteError("workspace marker cannot be prepared") from exc
        self._sync_precommit_directories()
        self.verify_identity()
        self._verify_committing_tree(manifest, manifest_digest, marker=True)
        marker = _MARKER_PREFIX + manifest_digest.encode("ascii") + b"\n"
        try:
            self._write_descriptor(marker_owned.descriptor, marker)
            self._marker_finalized = True
            self._sync_final_marker(marker_owned)
            self.verify_identity()
            self._verify_committing_tree(manifest, manifest_digest, marker=True)
            verified = self._verify_visible_commit()
            if verified.get("commit_sha256") != manifest_digest:
                raise WorkspaceIdentityError("workspace commit digest changed")
        except Exception:
            self._invalid = True
            raise
        self._committed = True
        return manifest_digest

    def _verify_committing_tree(
        self, manifest: dict, manifest_digest: str, *, marker: bool
    ) -> None:
        paths = [item["path"] for item in manifest["artifacts"]]
        expected_root, expected_source = self._inventory_names(paths)
        expected_root.add(MANIFEST_NAME)
        if marker:
            expected_root.add(COMPLETE_NAME)
        actual_root = set(
            os.listdir(self._target_fd)
            if self.backend == "posix"
            else os.listdir(self.path)
        )
        actual_source = set(
            os.listdir(self._source_fd)
            if self.backend == "posix"
            else os.listdir(self.source_path)
        )
        if actual_root != expected_root:
            raise WorkspaceIdentityError("workspace inventory changed")
        if actual_source != expected_source:
            raise WorkspaceIdentityError("workspace inventory changed")
        for item in manifest["artifacts"]:
            relative = item["path"]
            owned = self._leaves[relative]
            metadata = self._verify_leaf_identity(owned)
            payload = _read_descriptor(
                owned.descriptor, DEFAULT_MAX_ARTIFACT_BYTES
            )
            if len(payload) != metadata.st_size or len(payload) != item["size"]:
                raise WorkspaceIdentityError("workspace artifact size changed")
            if hashlib.sha256(payload).hexdigest() != item["sha256"]:
                raise WorkspaceIdentityError("workspace artifact digest changed")
        manifest_metadata = self._verify_leaf_identity(
            self._leaves[MANIFEST_NAME]
        )
        manifest_payload = _read_descriptor(
            self._leaves[MANIFEST_NAME].descriptor, _MAX_MANIFEST_BYTES
        )
        if (
            len(manifest_payload) != manifest_metadata.st_size
            or hashlib.sha256(manifest_payload).hexdigest() != manifest_digest
        ):
            raise WorkspaceIdentityError("workspace manifest changed")
        if marker:
            marker_metadata = self._verify_leaf_identity(
                self._leaves[COMPLETE_NAME]
            )
            marker_payload = _read_descriptor(
                self._leaves[COMPLETE_NAME].descriptor, _MAX_MARKER_BYTES
            )
            expected_marker = (
                _MARKER_PREFIX + manifest_digest.encode("ascii") + b"\n"
                if self._marker_finalized
                else b""
            )
            if (
                len(marker_payload) != marker_metadata.st_size
                or marker_payload != expected_marker
            ):
                raise WorkspaceIdentityError("workspace marker changed")
        self.verify_identity()

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        for owned in reversed(tuple(self._leaves.values())):
            try:
                os.close(owned.descriptor)
            except OSError:
                pass
        self._leaves.clear()
        if self.backend == "posix":
            if self.posix_chain is not None:
                self.posix_chain.close()
                self.posix_chain = None
        elif self.backend == "windows":
            for handle in (
                self.source_handle,
                self.target_handle,
                self.parent_handle,
            ):
                if int(handle) >= 0:
                    try:
                        _close_windows_handle(handle)
                    except OSError:
                        pass
        self.source_handle = self.target_handle = self.parent_handle = -1

    def __enter__(self) -> "ImmutableWorkspace":
        if self.closed:
            raise WorkspaceIdentityError("workspace is closed")
        return self

    def __exit__(self, exc_type, exc, traceback) -> bool:
        self.close()
        return False


@dataclass
class _PosixWorkspaceHandles:
    chain: _PosixDirectoryChain

    @property
    def parent_fd(self) -> int:
        return self.chain.entries[-3].descriptor

    @property
    def target_fd(self) -> int:
        return self.chain.entries[-2].descriptor

    @property
    def source_fd(self) -> int:
        return self.chain.entries[-1].descriptor


def _open_posix_workspace(path: str) -> _PosixWorkspaceHandles:
    chain: _PosixDirectoryChain | None = None
    transferred = False
    try:
        chain = _open_posix_directory_chain(
            os.path.abspath(path), error_type=WorkspaceVerificationError
        )
        chain.append("source", error_type=WorkspaceVerificationError)
        chain.validate(error_type=WorkspaceVerificationError)
        handles = _PosixWorkspaceHandles(chain)
        transferred = True
        return handles
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError("workspace cannot be opened safely") from exc
    finally:
        if not transferred and chain is not None:
            chain.close()


def _read_named_regular(
    directory_fd: int, leaf: str, *, max_bytes: int
) -> bytes:
    descriptor = -1
    try:
        descriptor = os.open(leaf, _read_flags(), dir_fd=directory_fd)
        opened = os.fstat(descriptor)
        named = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
        if (
            not _regular_single_link(opened)
            or not _regular_single_link(named)
            or _identity(opened) != _identity(named)
        ):
            raise WorkspaceVerificationError("workspace artifact is unsafe")
        payload = _read_descriptor(descriptor, max_bytes)
        named_after = os.stat(leaf, dir_fd=directory_fd, follow_symlinks=False)
        if _identity(named_after) != _identity(opened):
            raise WorkspaceVerificationError("workspace artifact identity changed")
        return payload
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError("workspace artifact cannot be read") from exc
    finally:
        if descriptor >= 0:
            try:
                os.close(descriptor)
            except OSError:
                pass


def _parse_manifest(payload: bytes, allowed: frozenset[str]) -> dict:
    try:
        value = json.loads(payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise WorkspaceVerificationError("workspace manifest is invalid") from exc
    if not isinstance(value, dict) or set(value) != {"format", "artifacts"}:
        raise WorkspaceVerificationError("workspace manifest is invalid")
    if value.get("format") != FORMAT or not isinstance(value.get("artifacts"), list):
        raise WorkspaceVerificationError("workspace manifest is invalid")
    paths: list[str] = []
    for item in value["artifacts"]:
        if not isinstance(item, dict) or set(item) != {"path", "size", "sha256"}:
            raise WorkspaceVerificationError("workspace manifest is invalid")
        path = item.get("path")
        size = item.get("size")
        digest = item.get("sha256")
        if (
            not isinstance(path, str)
            or path not in allowed
            or isinstance(size, bool)
            or not isinstance(size, int)
            or size < 0
            or not isinstance(digest, str)
            or _SHA256_PATTERN.fullmatch(digest) is None
        ):
            raise WorkspaceVerificationError("workspace manifest is invalid")
        paths.append(path)
    if paths != sorted(set(paths)):
        raise WorkspaceVerificationError("workspace manifest is not deterministic")
    canonical = (
        json.dumps(
            value,
            ensure_ascii=False,
            sort_keys=True,
            separators=(",", ":"),
        ).encode("utf-8")
        + b"\n"
    )
    if canonical != payload:
        raise WorkspaceVerificationError("workspace manifest is not deterministic")
    return value


def _verify_posix_handles(
    handles: _PosixWorkspaceHandles,
    allowed: frozenset[str],
    *,
    capture_path: str | None = None,
) -> tuple[dict, bytes | None]:
    handles.chain.validate(error_type=WorkspaceVerificationError)
    target_fd = handles.target_fd
    source_fd = handles.source_fd
    marker = _read_named_regular(
        target_fd, COMPLETE_NAME, max_bytes=_MAX_MARKER_BYTES
    )
    if (
        not marker.startswith(_MARKER_PREFIX)
        or not marker.endswith(b"\n")
        or len(marker) != _MAX_MARKER_BYTES
    ):
        raise WorkspaceVerificationError("workspace marker is invalid")
    digest_bytes = marker[len(_MARKER_PREFIX) : -1]
    try:
        manifest_digest = digest_bytes.decode("ascii")
    except UnicodeDecodeError as exc:
        raise WorkspaceVerificationError("workspace marker is invalid") from exc
    if _SHA256_PATTERN.fullmatch(manifest_digest) is None:
        raise WorkspaceVerificationError("workspace marker is invalid")
    manifest_payload = _read_named_regular(
        target_fd, MANIFEST_NAME, max_bytes=_MAX_MANIFEST_BYTES
    )
    if hashlib.sha256(manifest_payload).hexdigest() != manifest_digest:
        raise WorkspaceVerificationError("workspace manifest digest changed")
    manifest = _parse_manifest(manifest_payload, allowed)
    paths = [item["path"] for item in manifest["artifacts"]]
    expected_root = {"source", MANIFEST_NAME, COMPLETE_NAME}
    expected_source: set[str] = set()
    for relative in paths:
        parts = relative.split("/")
        if len(parts) == 1:
            expected_root.add(parts[0])
        else:
            expected_source.add(parts[1])
    if set(os.listdir(target_fd)) != expected_root:
        raise WorkspaceVerificationError("workspace inventory is invalid")
    if set(os.listdir(source_fd)) != expected_source:
        raise WorkspaceVerificationError("workspace inventory is invalid")
    captured: bytes | None = None
    for item in manifest["artifacts"]:
        relative = item["path"]
        parts = relative.split("/")
        directory_fd = target_fd if len(parts) == 1 else source_fd
        payload = _read_named_regular(
            directory_fd,
            parts[-1],
            max_bytes=DEFAULT_MAX_ARTIFACT_BYTES,
        )
        if len(payload) != item["size"]:
            raise WorkspaceVerificationError("workspace artifact size changed")
        if hashlib.sha256(payload).hexdigest() != item["sha256"]:
            raise WorkspaceVerificationError("workspace artifact digest changed")
        if relative == capture_path:
            captured = payload
    handles.chain.validate(error_type=WorkspaceVerificationError)
    result = dict(manifest)
    result["commit_sha256"] = manifest_digest
    return result, captured


def _close_posix_handles(handles: _PosixWorkspaceHandles) -> None:
    handles.chain.close()


def _open_windows_workspace(
    path: str,
) -> tuple[
    int,
    int,
    int,
    tuple[int, int],
    tuple[int, int],
    tuple[int, int],
]:
    target = os.path.abspath(path)
    parent_handle = target_handle = source_handle = -1
    transferred = False
    try:
        parent_handle, parent_metadata = _open_windows_path(
            os.path.dirname(target), create_new=False, directory=True
        )
        target_handle, target_metadata = _open_windows_path(
            target, create_new=False, directory=True
        )
        source_handle, source_metadata = _open_windows_path(
            os.path.join(target, "source"), create_new=False, directory=True
        )
        handles = (
            parent_handle,
            target_handle,
            source_handle,
            parent_metadata["identity"],
            target_metadata["identity"],
            source_metadata["identity"],
        )
        transferred = True
        return handles
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError("workspace cannot be opened safely") from exc
    finally:
        if not transferred:
            for handle in (source_handle, target_handle, parent_handle):
                if handle >= 0:
                    try:
                        _close_windows_handle(handle)
                    except OSError:
                        pass


def _close_windows_workspace(
    handles: tuple[
        int,
        int,
        int,
        tuple[int, int],
        tuple[int, int],
        tuple[int, int],
    ]
) -> None:
    for handle in (handles[2], handles[1], handles[0]):
        try:
            _close_windows_handle(handle)
        except OSError:
            pass


def _verify_windows_workspace_identity(
    path: str,
    handles: tuple[
        int,
        int,
        int,
        tuple[int, int],
        tuple[int, int],
        tuple[int, int],
    ],
) -> None:
    target = os.path.abspath(path)
    named_handles: list[int] = []
    try:
        held = (
            _windows_handle_metadata(handles[0]),
            _windows_handle_metadata(handles[1]),
            _windows_handle_metadata(handles[2]),
        )
        named = []
        for candidate in (
            os.path.dirname(target),
            target,
            os.path.join(target, "source"),
        ):
            handle, metadata = _open_windows_path(
                candidate, create_new=False, directory=True
            )
            named_handles.append(handle)
            named.append(metadata)
        expected = handles[3:6]
        if any(
            held_metadata["identity"] != identity
            or named_metadata["identity"] != identity
            for held_metadata, named_metadata, identity in zip(
                held, named, expected
            )
        ):
            raise WorkspaceVerificationError("workspace identity changed")
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError("workspace identity changed") from exc
    finally:
        for handle in reversed(named_handles):
            try:
                _close_windows_handle(handle)
            except OSError:
                pass


def _read_windows_named_regular(path: str, *, max_bytes: int) -> bytes:
    descriptor = -1
    try:
        descriptor, _ = _open_windows_regular_fd(path, create_new=False)
        return _read_descriptor(descriptor, max_bytes)
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceVerificationError("workspace artifact cannot be read") from exc
    finally:
        if descriptor >= 0:
            try:
                os.close(descriptor)
            except OSError:
                pass


def _verify_windows_handles(
    path: str,
    handles: tuple[
        int,
        int,
        int,
        tuple[int, int],
        tuple[int, int],
        tuple[int, int],
    ],
    allowed: frozenset[str],
    *,
    capture_path: str | None = None,
) -> tuple[dict, bytes | None]:
    target = os.path.abspath(path)
    _verify_windows_workspace_identity(path, handles)
    marker = _read_windows_named_regular(
        os.path.join(target, COMPLETE_NAME), max_bytes=_MAX_MARKER_BYTES
    )
    if (
        not marker.startswith(_MARKER_PREFIX)
        or not marker.endswith(b"\n")
        or len(marker) != _MAX_MARKER_BYTES
    ):
        raise WorkspaceVerificationError("workspace marker is invalid")
    try:
        manifest_digest = marker[len(_MARKER_PREFIX) : -1].decode("ascii")
    except UnicodeDecodeError as exc:
        raise WorkspaceVerificationError("workspace marker is invalid") from exc
    if _SHA256_PATTERN.fullmatch(manifest_digest) is None:
        raise WorkspaceVerificationError("workspace marker is invalid")
    manifest_payload = _read_windows_named_regular(
        os.path.join(target, MANIFEST_NAME), max_bytes=_MAX_MANIFEST_BYTES
    )
    if hashlib.sha256(manifest_payload).hexdigest() != manifest_digest:
        raise WorkspaceVerificationError("workspace manifest digest changed")
    manifest = _parse_manifest(manifest_payload, allowed)
    paths = [item["path"] for item in manifest["artifacts"]]
    expected_root = {"source", MANIFEST_NAME, COMPLETE_NAME}
    expected_source: set[str] = set()
    for relative in paths:
        parts = relative.split("/")
        if len(parts) == 1:
            expected_root.add(parts[0])
        else:
            expected_source.add(parts[1])
    if set(os.listdir(target)) != expected_root:
        raise WorkspaceVerificationError("workspace inventory is invalid")
    source = os.path.join(target, "source")
    if set(os.listdir(source)) != expected_source:
        raise WorkspaceVerificationError("workspace inventory is invalid")
    captured: bytes | None = None
    for item in manifest["artifacts"]:
        payload = _read_windows_named_regular(
            os.path.join(target, *item["path"].split("/")),
            max_bytes=DEFAULT_MAX_ARTIFACT_BYTES,
        )
        if len(payload) != item["size"]:
            raise WorkspaceVerificationError("workspace artifact size changed")
        if hashlib.sha256(payload).hexdigest() != item["sha256"]:
            raise WorkspaceVerificationError("workspace artifact digest changed")
        if item["path"] == capture_path:
            captured = payload
    _verify_windows_workspace_identity(path, handles)
    result = dict(manifest)
    result["commit_sha256"] = manifest_digest
    return result, captured


def verify_committed_workspace(
    path: str, *, allowed_artifacts: Iterable[str]
) -> dict:
    """Verify marker, manifest, exact inventory, sizes, and SHA-256 hashes."""
    allowed = _normalize_artifacts(allowed_artifacts)
    backend = preflight_backend()
    if backend == "posix":
        handles = _open_posix_workspace(path)
        try:
            result, _ = _verify_posix_handles(handles, allowed)
            return result
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceVerificationError("workspace verification failed") from exc
        finally:
            _close_posix_handles(handles)
    handles_windows = _open_windows_workspace(path)
    try:
        result, _ = _verify_windows_handles(
            path, handles_windows, allowed
        )
        return result
    finally:
        _close_windows_workspace(handles_windows)


@dataclass(frozen=True)
class ResumeArtifact:
    payload: bytes | None
    source_format: str
    source_digest: str


@dataclass
class _VerifiedReaderLeaf:
    relative_path: str
    descriptor: int
    identity: tuple[int, int]
    size: int
    sha256: str
    max_bytes: int


class VerifiedWorkspaceReader:
    """Read one committed workspace through a single identity-bound snapshot.

    All artifact descriptors are opened and hashed before construction returns.
    Later reads use only those held descriptors; pathnames are consulted solely
    to prove that the visible tree still names the same objects.
    """

    def __init__(
        self,
        path: str,
        *,
        allowed_artifacts: frozenset[str],
        backend: str,
        manifest: dict,
        source_digest: str,
        leaves: dict[str, _VerifiedReaderLeaf],
        marker_leaf: _VerifiedReaderLeaf,
        manifest_leaf: _VerifiedReaderLeaf,
        posix_handles: _PosixWorkspaceHandles | None = None,
        windows_handles: tuple | None = None,
    ) -> None:
        self.path = os.path.abspath(path)
        self.allowed_artifacts = allowed_artifacts
        self.backend = backend
        self.manifest = dict(manifest)
        self.source_format = FORMAT
        self.source_digest = source_digest
        self._leaves = leaves
        self._marker_leaf = marker_leaf
        self._manifest_leaf = manifest_leaf
        self._posix_handles = posix_handles
        self._windows_handles = windows_handles
        self.closed = False

    @classmethod
    def open(
        cls, path: str, *, allowed_artifacts: Iterable[str]
    ) -> "VerifiedWorkspaceReader":
        allowed = _normalize_artifacts(allowed_artifacts)
        backend = preflight_backend()
        if backend == "posix":
            return cls._open_posix(path, allowed)
        return cls._open_windows(path, allowed)

    @staticmethod
    def _expected_inventory(manifest: dict) -> tuple[set[str], set[str]]:
        root = {"source", MANIFEST_NAME, COMPLETE_NAME}
        source: set[str] = set()
        for item in manifest["artifacts"]:
            parts = item["path"].split("/")
            if len(parts) == 1:
                root.add(parts[0])
            else:
                source.add(parts[1])
        return root, source

    @staticmethod
    def _open_posix_leaf(
        handles: _PosixWorkspaceHandles,
        relative_path: str,
        *,
        max_bytes: int,
    ) -> tuple[_VerifiedReaderLeaf, bytes]:
        parts = relative_path.split("/")
        directory_fd = handles.target_fd if len(parts) == 1 else handles.source_fd
        descriptor = -1
        try:
            descriptor = os.open(parts[-1], _read_flags(), dir_fd=directory_fd)
            held = os.fstat(descriptor)
            named = os.stat(
                parts[-1], dir_fd=directory_fd, follow_symlinks=False
            )
            if (
                not _regular_single_link(held)
                or not _regular_single_link(named)
                or _identity(held) != _identity(named)
            ):
                raise WorkspaceVerificationError("workspace artifact is unsafe")
            payload = _read_descriptor(descriptor, max_bytes)
            leaf = _VerifiedReaderLeaf(
                relative_path=relative_path,
                descriptor=descriptor,
                identity=_identity(held),
                size=len(payload),
                sha256=hashlib.sha256(payload).hexdigest(),
                max_bytes=max_bytes,
            )
            descriptor = -1
            return leaf, payload
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceVerificationError(
                "workspace artifact cannot be opened safely"
            ) from exc
        finally:
            if descriptor >= 0:
                try:
                    os.close(descriptor)
                except OSError:
                    pass

    @classmethod
    def _open_posix(
        cls, path: str, allowed: frozenset[str]
    ) -> "VerifiedWorkspaceReader":
        handles: _PosixWorkspaceHandles | None = None
        opened: list[_VerifiedReaderLeaf] = []
        transferred = False
        try:
            handles = _open_posix_workspace(path)
            handles.chain.validate(error_type=WorkspaceVerificationError)
            marker_leaf, marker = cls._open_posix_leaf(
                handles, COMPLETE_NAME, max_bytes=_MAX_MARKER_BYTES
            )
            opened.append(marker_leaf)
            manifest_leaf, manifest_payload = cls._open_posix_leaf(
                handles, MANIFEST_NAME, max_bytes=_MAX_MANIFEST_BYTES
            )
            opened.append(manifest_leaf)
            manifest_digest = cls._validate_commit_metadata(marker, manifest_payload)
            manifest = _parse_manifest(manifest_payload, allowed)
            expected_root, expected_source = cls._expected_inventory(manifest)
            if set(os.listdir(handles.target_fd)) != expected_root:
                raise WorkspaceVerificationError("workspace inventory is invalid")
            if set(os.listdir(handles.source_fd)) != expected_source:
                raise WorkspaceVerificationError("workspace inventory is invalid")
            leaves: dict[str, _VerifiedReaderLeaf] = {}
            for item in manifest["artifacts"]:
                leaf, payload = cls._open_posix_leaf(
                    handles,
                    item["path"],
                    max_bytes=DEFAULT_MAX_ARTIFACT_BYTES,
                )
                opened.append(leaf)
                if len(payload) != item["size"]:
                    raise WorkspaceVerificationError(
                        "workspace artifact size changed"
                    )
                if hashlib.sha256(payload).hexdigest() != item["sha256"]:
                    raise WorkspaceVerificationError(
                        "workspace artifact digest changed"
                    )
                leaves[item["path"]] = leaf
            handles.chain.validate(error_type=WorkspaceVerificationError)
            result_manifest = dict(manifest)
            result_manifest["commit_sha256"] = manifest_digest
            reader = cls(
                path,
                allowed_artifacts=allowed,
                backend="posix",
                manifest=result_manifest,
                source_digest=manifest_digest,
                leaves=leaves,
                marker_leaf=marker_leaf,
                manifest_leaf=manifest_leaf,
                posix_handles=handles,
            )
            transferred = True
            return reader
        finally:
            if not transferred:
                for leaf in reversed(opened):
                    try:
                        os.close(leaf.descriptor)
                    except OSError:
                        pass
                if handles is not None:
                    _close_posix_handles(handles)

    @staticmethod
    def _open_windows_leaf(
        path: str, relative_path: str, *, max_bytes: int
    ) -> tuple[_VerifiedReaderLeaf, bytes]:
        descriptor = -1
        try:
            artifact_path = os.path.join(path, *relative_path.split("/"))
            descriptor, identity = _open_windows_regular_fd(
                artifact_path, create_new=False
            )
            payload = _read_descriptor(descriptor, max_bytes)
            leaf = _VerifiedReaderLeaf(
                relative_path=relative_path,
                descriptor=descriptor,
                identity=identity,
                size=len(payload),
                sha256=hashlib.sha256(payload).hexdigest(),
                max_bytes=max_bytes,
            )
            descriptor = -1
            return leaf, payload
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceVerificationError(
                "workspace artifact cannot be opened safely"
            ) from exc
        finally:
            if descriptor >= 0:
                try:
                    os.close(descriptor)
                except OSError:
                    pass

    @classmethod
    def _open_windows(
        cls, path: str, allowed: frozenset[str]
    ) -> "VerifiedWorkspaceReader":
        handles = None
        opened: list[_VerifiedReaderLeaf] = []
        transferred = False
        target = os.path.abspath(path)
        try:
            handles = _open_windows_workspace(target)
            marker_leaf, marker = cls._open_windows_leaf(
                target, COMPLETE_NAME, max_bytes=_MAX_MARKER_BYTES
            )
            opened.append(marker_leaf)
            manifest_leaf, manifest_payload = cls._open_windows_leaf(
                target, MANIFEST_NAME, max_bytes=_MAX_MANIFEST_BYTES
            )
            opened.append(manifest_leaf)
            manifest_digest = cls._validate_commit_metadata(marker, manifest_payload)
            manifest = _parse_manifest(manifest_payload, allowed)
            expected_root, expected_source = cls._expected_inventory(manifest)
            if set(os.listdir(target)) != expected_root:
                raise WorkspaceVerificationError("workspace inventory is invalid")
            if set(os.listdir(os.path.join(target, "source"))) != expected_source:
                raise WorkspaceVerificationError("workspace inventory is invalid")
            leaves: dict[str, _VerifiedReaderLeaf] = {}
            for item in manifest["artifacts"]:
                leaf, payload = cls._open_windows_leaf(
                    target,
                    item["path"],
                    max_bytes=DEFAULT_MAX_ARTIFACT_BYTES,
                )
                opened.append(leaf)
                if len(payload) != item["size"]:
                    raise WorkspaceVerificationError(
                        "workspace artifact size changed"
                    )
                if hashlib.sha256(payload).hexdigest() != item["sha256"]:
                    raise WorkspaceVerificationError(
                        "workspace artifact digest changed"
                    )
                leaves[item["path"]] = leaf
            _verify_windows_workspace_identity(target, handles)
            result_manifest = dict(manifest)
            result_manifest["commit_sha256"] = manifest_digest
            reader = cls(
                target,
                allowed_artifacts=allowed,
                backend="windows",
                manifest=result_manifest,
                source_digest=manifest_digest,
                leaves=leaves,
                marker_leaf=marker_leaf,
                manifest_leaf=manifest_leaf,
                windows_handles=handles,
            )
            transferred = True
            return reader
        finally:
            if not transferred:
                for leaf in reversed(opened):
                    try:
                        os.close(leaf.descriptor)
                    except OSError:
                        pass
                if handles is not None:
                    _close_windows_workspace(handles)

    @staticmethod
    def _validate_commit_metadata(marker: bytes, manifest_payload: bytes) -> str:
        if (
            not marker.startswith(_MARKER_PREFIX)
            or not marker.endswith(b"\n")
            or len(marker) != _MAX_MARKER_BYTES
        ):
            raise WorkspaceVerificationError("workspace marker is invalid")
        try:
            digest = marker[len(_MARKER_PREFIX) : -1].decode("ascii")
        except UnicodeDecodeError as exc:
            raise WorkspaceVerificationError("workspace marker is invalid") from exc
        if _SHA256_PATTERN.fullmatch(digest) is None:
            raise WorkspaceVerificationError("workspace marker is invalid")
        if hashlib.sha256(manifest_payload).hexdigest() != digest:
            raise WorkspaceVerificationError("workspace manifest digest changed")
        return digest

    def _read_leaf(self, leaf: _VerifiedReaderLeaf) -> bytes:
        try:
            held = os.fstat(leaf.descriptor)
            if (
                not _regular_single_link(held)
                or (
                    self.backend == "posix"
                    and _identity(held) != leaf.identity
                )
            ):
                raise WorkspaceVerificationError(
                    "workspace artifact identity changed"
                )
            if self.backend == "posix":
                if self._posix_handles is None:
                    raise WorkspaceVerificationError(
                        "workspace reader handles are unavailable"
                    )
                parts = leaf.relative_path.split("/")
                directory_fd = (
                    self._posix_handles.target_fd
                    if len(parts) == 1
                    else self._posix_handles.source_fd
                )
                named = os.stat(
                    parts[-1], dir_fd=directory_fd, follow_symlinks=False
                )
                if (
                    not _regular_single_link(named)
                    or _identity(named) != leaf.identity
                ):
                    raise WorkspaceVerificationError(
                        "workspace artifact identity changed"
                    )
            payload = _read_descriptor(leaf.descriptor, leaf.max_bytes)
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceVerificationError(
                "workspace artifact identity changed"
            ) from exc
        if len(payload) != leaf.size:
            raise WorkspaceVerificationError("workspace artifact size changed")
        if hashlib.sha256(payload).hexdigest() != leaf.sha256:
            raise WorkspaceVerificationError("workspace artifact digest changed")
        return payload

    def _validate_identity(self) -> None:
        if self.closed:
            raise WorkspaceVerificationError("workspace reader is closed")
        if self.backend == "posix":
            if self._posix_handles is None:
                raise WorkspaceVerificationError(
                    "workspace reader handles are unavailable"
                )
            self._posix_handles.chain.validate(
                error_type=WorkspaceVerificationError
            )
        else:
            if self._windows_handles is None:
                raise WorkspaceVerificationError(
                    "workspace reader handles are unavailable"
                )
            handles = self._windows_handles
            for handle, expected_identity in zip(
                handles[:3], handles[3:]
            ):
                try:
                    metadata = _windows_handle_metadata(int(handle))
                except (OSError, NotImplementedError, TypeError) as exc:
                    raise WorkspaceVerificationError(
                        "workspace identity changed"
                    ) from exc
                if (
                    metadata["identity"] != expected_identity
                    or not metadata["directory"]
                    or metadata["reparse"]
                ):
                    raise WorkspaceVerificationError(
                        "workspace identity changed"
                    )

    def _validate_inventory(self) -> None:
        expected_root, expected_source = self._expected_inventory(self.manifest)
        try:
            if self.backend == "posix":
                assert self._posix_handles is not None
                root = set(os.listdir(self._posix_handles.target_fd))
                source = set(os.listdir(self._posix_handles.source_fd))
            else:
                if self._windows_handles is None:
                    raise WorkspaceVerificationError(
                        "workspace reader handles are unavailable"
                    )
                root = _windows_directory_names(
                    int(self._windows_handles[1])
                )
                source = _windows_directory_names(
                    int(self._windows_handles[2])
                )
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceVerificationError(
                "workspace inventory is invalid"
            ) from exc
        if root != expected_root or source != expected_source:
            raise WorkspaceVerificationError("workspace inventory is invalid")

    def _validate_metadata(self) -> None:
        marker = self._read_leaf(self._marker_leaf)
        manifest_payload = self._read_leaf(self._manifest_leaf)
        digest = self._validate_commit_metadata(marker, manifest_payload)
        if digest != self.source_digest:
            raise WorkspaceVerificationError("workspace commit digest changed")

    def read(
        self, relative_path: str, *, max_bytes: int = DEFAULT_MAX_ARTIFACT_BYTES
    ) -> ResumeArtifact:
        """Read one manifested artifact without reopening its pathname."""
        relative = next(iter(_normalize_artifacts((relative_path,))))
        if relative not in self.allowed_artifacts:
            raise WorkspaceVerificationError("workspace artifact is not allowlisted")
        leaf = self._leaves.get(relative)
        if leaf is None:
            raise WorkspaceVerificationError("workspace artifact is not manifested")
        if max_bytes < leaf.size:
            raise WorkspaceVerificationError("workspace artifact is too large")
        self._validate_identity()
        self._validate_inventory()
        self._validate_metadata()
        payload = self._read_leaf(leaf)
        self._validate_identity()
        return ResumeArtifact(payload, self.source_format, self.source_digest)

    def verify_unchanged(self) -> dict:
        """Re-hash the held committed snapshot before consuming its results."""
        self._validate_identity()
        self._validate_inventory()
        self._validate_metadata()
        for leaf in self._leaves.values():
            self._read_leaf(leaf)
        self._validate_identity()
        return dict(self.manifest)

    def close(self) -> None:
        if self.closed:
            return
        self.closed = True
        for leaf in reversed(
            [*self._leaves.values(), self._manifest_leaf, self._marker_leaf]
        ):
            try:
                os.close(leaf.descriptor)
            except OSError:
                pass
        self._leaves.clear()
        if self._posix_handles is not None:
            _close_posix_handles(self._posix_handles)
            self._posix_handles = None
        if self._windows_handles is not None:
            _close_windows_workspace(self._windows_handles)
            self._windows_handles = None

    def __enter__(self) -> "VerifiedWorkspaceReader":
        if self.closed:
            raise WorkspaceVerificationError("workspace reader is closed")
        return self

    def __exit__(self, exc_type, exc, traceback) -> bool:
        self.close()
        return False


def read_resume_artifact(
    path: str,
    relative_path: str,
    *,
    allowed_artifacts: Iterable[str],
    max_bytes: int = DEFAULT_MAX_ARTIFACT_BYTES,
) -> ResumeArtifact:
    """Read one legacy or committed artifact without ever mutating its tree."""
    allowed = _normalize_artifacts(allowed_artifacts)
    relative = next(iter(_normalize_artifacts((relative_path,))))
    if relative not in allowed:
        raise WorkspaceVerificationError("resume artifact is not allowlisted")
    backend = preflight_backend()
    if backend == "windows":
        handles_windows = _open_windows_workspace(path)
        target = os.path.abspath(path)
        try:
            marker = os.path.join(target, COMPLETE_NAME)
            if os.path.lexists(marker):
                manifest, payload = _verify_windows_handles(
                    path,
                    handles_windows,
                    allowed,
                    capture_path=relative,
                )
                return ResumeArtifact(
                    payload=payload,
                    source_format=FORMAT,
                    source_digest=manifest["commit_sha256"],
                )
            if os.path.lexists(os.path.join(target, MANIFEST_NAME)):
                raise WorkspaceVerificationError(
                    "incomplete immutable workspace cannot be resumed"
                )
            artifact_path = os.path.join(target, *relative.split("/"))
            try:
                payload = _read_windows_named_regular(
                    artifact_path, max_bytes=max_bytes
                )
            except WorkspaceVerificationError as exc:
                cause = exc.__cause__
                if isinstance(cause, FileNotFoundError):
                    payload = None
                else:
                    raise
            _verify_windows_workspace_identity(path, handles_windows)
            return ResumeArtifact(
                payload=payload,
                source_format="legacy-read-only",
                source_digest=hashlib.sha256(payload or b"").hexdigest(),
            )
        finally:
            _close_windows_workspace(handles_windows)
    handles = _open_posix_workspace(path)
    target_fd = handles.target_fd
    source_fd = handles.source_fd
    try:
        try:
            os.stat(COMPLETE_NAME, dir_fd=target_fd, follow_symlinks=False)
            has_marker = True
        except FileNotFoundError:
            has_marker = False
        if has_marker:
            manifest, payload = _verify_posix_handles(
                handles, allowed, capture_path=relative
            )
            return ResumeArtifact(
                payload=payload,
                source_format=FORMAT,
                source_digest=manifest["commit_sha256"],
            )
        try:
            os.stat(MANIFEST_NAME, dir_fd=target_fd, follow_symlinks=False)
        except FileNotFoundError:
            pass
        else:
            raise WorkspaceVerificationError(
                "incomplete immutable workspace cannot be resumed"
            )
        parts = relative.split("/")
        directory_fd = target_fd if len(parts) == 1 else source_fd
        try:
            payload = _read_named_regular(
                directory_fd, parts[-1], max_bytes=max_bytes
            )
        except WorkspaceVerificationError as exc:
            cause = exc.__cause__
            if isinstance(cause, FileNotFoundError):
                payload = None
            else:
                raise
        digest_payload = payload if payload is not None else b""
        handles.chain.validate(error_type=WorkspaceVerificationError)
        return ResumeArtifact(
            payload=payload,
            source_format="legacy-read-only",
            source_digest=hashlib.sha256(digest_payload).hexdigest(),
        )
    finally:
        _close_posix_handles(handles)


def ensure_container(path: str) -> str:
    """Create one non-output container beneath an existing parent, if absent."""
    backend = preflight_backend()
    target = os.path.abspath(path)
    parent = os.path.dirname(target)
    name = os.path.basename(target)
    if not name:
        raise WorkspaceWriteError("workspace container parent does not exist")
    if backend == "windows":
        if not os.path.isdir(parent):
            raise WorkspaceWriteError("workspace container parent does not exist")
        parent_handle = child_handle = -1
        try:
            parent_handle, _ = _open_windows_path(
                parent, create_new=False, directory=True
            )
            try:
                os.mkdir(target, 0o700)
            except FileExistsError:
                pass
            child_handle, _ = _open_windows_path(
                target, create_new=False, directory=True
            )
            return target
        except WorkspaceError:
            raise
        except (OSError, NotImplementedError, TypeError) as exc:
            raise WorkspaceWriteError(
                "workspace container cannot be prepared"
            ) from exc
        finally:
            for handle in (child_handle, parent_handle):
                if handle >= 0:
                    try:
                        _close_windows_handle(handle)
                    except OSError:
                        pass
    chain: _PosixDirectoryChain | None = None
    try:
        chain = _open_posix_directory_chain(
            parent, error_type=WorkspaceWriteError
        )
        chain.validate(error_type=WorkspaceIdentityError)
        try:
            os.mkdir(name, 0o700, dir_fd=chain.leaf_fd)
        except FileExistsError:
            pass
        chain.append(name, error_type=WorkspaceIdentityError)
        chain.validate(error_type=WorkspaceIdentityError)
        return target
    except WorkspaceError:
        raise
    except (OSError, NotImplementedError, TypeError) as exc:
        raise WorkspaceWriteError("workspace container cannot be prepared") from exc
    finally:
        if chain is not None:
            chain.close()
