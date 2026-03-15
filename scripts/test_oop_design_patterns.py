"""
Event-Driven Message Processing Pipeline
=========================================

A deliberately over-engineered message processing system that demonstrates
the interplay of multiple GoF design patterns in a single cohesive application.

Patterns used:
  - Strategy        → Interchangeable compression algorithms
  - Observer        → Event bus for lifecycle notifications
  - Command         → Undo/redo of message operations
  - Decorator       → Layered message handler enhancements
  - Factory Method  → Polymorphic processor creation
  - State           → Message lifecycle transitions
  - Chain of Resp.  → Multi-step validation pipeline
  - Memento         → Snapshot & restore of pipeline state
  - Builder         → Step-by-step message construction
  - Singleton       → Central event bus instance (via DI)

Run:
    python test_oop_design_patterns.py
"""

from __future__ import annotations

import hashlib
import logging
import textwrap
import zlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum, auto
from typing import Protocol, runtime_checkable

# ---------------------------------------------------------------------------
# Logging (Rule 21 – Logging and Error Handling)
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("pipeline")


# ═══════════════════════════════════════════════════════════════════════════
# VALUE OBJECTS  (Object Calisthenics Rule 3 – Wrap Primitives)
# ═══════════════════════════════════════════════════════════════════════════
@dataclass(frozen=True)
class MessageId:
    """Strongly-typed wrapper around a raw message identifier."""

    value: str

    def __post_init__(self) -> None:
        if not self.value:
            raise ValueError("MessageId must not be empty")


@dataclass(frozen=True)
class Priority:
    """Bounded priority level (1 = highest, 10 = lowest)."""

    value: int

    def __post_init__(self) -> None:
        if not 1 <= self.value <= 10:
            raise ValueError(f"Priority must be 1..10, got {self.value}")


@dataclass(frozen=True)
class Payload:
    """Immutable wrapper for raw message content."""

    data: bytes

    @property
    def checksum(self) -> str:
        return hashlib.sha256(self.data).hexdigest()[:12]


# ═══════════════════════════════════════════════════════════════════════════
# STRATEGY PATTERN – Interchangeable compression algorithms
# ═══════════════════════════════════════════════════════════════════════════
@runtime_checkable
class CompressionStrategy(Protocol):
    """Interface for payload compression (Program to an Interface)."""

    def compress(self, data: bytes) -> bytes: ...
    def decompress(self, data: bytes) -> bytes: ...


class ZlibCompression:
    """Zlib-based compression strategy."""

    def compress(self, data: bytes) -> bytes:
        logger.debug("Compressing %d bytes with zlib", len(data))
        return zlib.compress(data, level=6)

    def decompress(self, data: bytes) -> bytes:
        return zlib.decompress(data)


class NoCompression:
    """Null-object compression strategy – data passes through unchanged."""

    def compress(self, data: bytes) -> bytes:
        return data

    def decompress(self, data: bytes) -> bytes:
        return data


# ═══════════════════════════════════════════════════════════════════════════
# STATE PATTERN – Message lifecycle transitions
# ═══════════════════════════════════════════════════════════════════════════
class MessageStatus(Enum):
    DRAFT = auto()
    VALIDATED = auto()
    QUEUED = auto()
    PROCESSING = auto()
    DELIVERED = auto()
    FAILED = auto()


class MessageState(ABC):
    """Abstract state governing allowed transitions."""

    @abstractmethod
    def next(self, message: Message) -> MessageState: ...

    @abstractmethod
    def status(self) -> MessageStatus: ...


class DraftState(MessageState):
    def next(self, message: Message) -> MessageState:
        logger.info("Message %s: DRAFT → VALIDATED", message.id.value)
        return ValidatedState()

    def status(self) -> MessageStatus:
        return MessageStatus.DRAFT


class ValidatedState(MessageState):
    def next(self, message: Message) -> MessageState:
        logger.info("Message %s: VALIDATED → QUEUED", message.id.value)
        return QueuedState()

    def status(self) -> MessageStatus:
        return MessageStatus.VALIDATED


class QueuedState(MessageState):
    def next(self, message: Message) -> MessageState:
        logger.info("Message %s: QUEUED → PROCESSING", message.id.value)
        return ProcessingState()

    def status(self) -> MessageStatus:
        return MessageStatus.QUEUED


class ProcessingState(MessageState):
    def next(self, message: Message) -> MessageState:
        logger.info("Message %s: PROCESSING → DELIVERED", message.id.value)
        return DeliveredState()

    def status(self) -> MessageStatus:
        return MessageStatus.PROCESSING


class DeliveredState(MessageState):
    def next(self, message: Message) -> MessageState:
        raise InvalidTransitionError("Cannot advance past DELIVERED")

    def status(self) -> MessageStatus:
        return MessageStatus.DELIVERED


class FailedState(MessageState):
    def next(self, message: Message) -> MessageState:
        raise InvalidTransitionError("Cannot advance from FAILED")

    def status(self) -> MessageStatus:
        return MessageStatus.FAILED


class InvalidTransitionError(Exception):
    """Raised when an illegal state transition is attempted."""


# ═══════════════════════════════════════════════════════════════════════════
# BUILDER PATTERN – Step-by-step message construction
# ═══════════════════════════════════════════════════════════════════════════
@dataclass
class Message:
    """Core domain entity whose lifecycle is governed by the State pattern."""

    id: MessageId
    payload: Payload
    priority: Priority
    created_at: datetime
    metadata: dict[str, str] = field(default_factory=dict)
    _state: MessageState = field(default_factory=DraftState)

    @property
    def status(self) -> MessageStatus:
        return self._state.status()

    def advance(self) -> None:
        self._state = self._state.next(self)


class MessageBuilder:
    """Builder for constructing Message instances step by step."""

    def __init__(self) -> None:
        self._id: MessageId | None = None
        self._payload: Payload | None = None
        self._priority: Priority = Priority(5)
        self._metadata: dict[str, str] = {}

    def with_id(self, raw_id: str) -> MessageBuilder:
        self._id = MessageId(raw_id)
        return self

    def with_payload(self, text: str) -> MessageBuilder:
        self._payload = Payload(text.encode("utf-8"))
        return self

    def with_priority(self, level: int) -> MessageBuilder:
        self._priority = Priority(level)
        return self

    def with_metadata(self, key: str, value: str) -> MessageBuilder:
        self._metadata[key] = value
        return self

    def build(self) -> Message:
        if self._id is None:
            raise ValueError("MessageId is required")
        if self._payload is None:
            raise ValueError("Payload is required")
        return Message(
            id=self._id,
            payload=self._payload,
            priority=self._priority,
            created_at=datetime.now(timezone.utc),
            metadata=dict(self._metadata),
        )


# ═══════════════════════════════════════════════════════════════════════════
# OBSERVER PATTERN – Event bus for lifecycle notifications
# ═══════════════════════════════════════════════════════════════════════════
class Event:
    """Base class for domain events."""

    def __init__(self, message: Message) -> None:
        self.message = message
        self.timestamp = datetime.now(timezone.utc)


class MessageValidatedEvent(Event):
    pass


class MessageDeliveredEvent(Event):
    pass


class MessageFailedEvent(Event):
    def __init__(self, message: Message, reason: str) -> None:
        super().__init__(message)
        self.reason = reason


class EventListener(ABC):
    """Observer interface – each listener reacts to a specific event type."""

    @abstractmethod
    def handle(self, event: Event) -> None: ...


class AuditLogger(EventListener):
    """Concrete observer that logs every event for auditing."""

    def handle(self, event: Event) -> None:
        logger.info(
            "[AUDIT] %s for message %s at %s",
            type(event).__name__,
            event.message.id.value,
            event.timestamp.isoformat(),
        )


class MetricsCollector(EventListener):
    """Concrete observer that tracks delivery metrics."""

    def __init__(self) -> None:
        self.delivered = 0
        self.failed = 0

    def handle(self, event: Event) -> None:
        if isinstance(event, MessageDeliveredEvent):
            self.delivered += 1
        elif isinstance(event, MessageFailedEvent):
            self.failed += 1
        logger.debug("[METRICS] delivered=%d  failed=%d", self.delivered, self.failed)


class EventBus:
    """Central pub/sub hub (Singleton semantics via DI, not module-global)."""

    def __init__(self) -> None:
        self._listeners: dict[type, list[EventListener]] = {}

    def subscribe(self, event_type: type, listener: EventListener) -> None:
        self._listeners.setdefault(event_type, []).append(listener)

    def publish(self, event: Event) -> None:
        for listener in self._listeners.get(type(event), []):
            listener.handle(event)


# ═══════════════════════════════════════════════════════════════════════════
# CHAIN OF RESPONSIBILITY – Multi-step validation pipeline
# ═══════════════════════════════════════════════════════════════════════════
class ValidationHandler(ABC):
    """Each handler either passes the message along or rejects it."""

    def __init__(self) -> None:
        self._next: ValidationHandler | None = None

    def set_next(self, handler: ValidationHandler) -> ValidationHandler:
        self._next = handler
        return handler

    def validate(self, message: Message) -> bool:
        if self._next is not None:
            return self._next.validate(message)
        return True  # end of chain → valid

    @abstractmethod
    def _check(self, message: Message) -> bool: ...


class PayloadSizeValidator(ValidationHandler):
    """Rejects messages whose payload exceeds 1 MB."""

    MAX_BYTES = 1_048_576

    def validate(self, message: Message) -> bool:
        if not self._check(message):
            return False
        return super().validate(message)

    def _check(self, message: Message) -> bool:
        ok = len(message.payload.data) <= self.MAX_BYTES
        if not ok:
            logger.warning("Payload too large: %d bytes", len(message.payload.data))
        return ok


class ChecksumValidator(ValidationHandler):
    """Ensures payload checksum is non-empty (integrity smoke test)."""

    def validate(self, message: Message) -> bool:
        if not self._check(message):
            return False
        return super().validate(message)

    def _check(self, message: Message) -> bool:
        ok = bool(message.payload.checksum)
        if not ok:
            logger.warning("Checksum validation failed for %s", message.id.value)
        return ok


class PriorityRangeValidator(ValidationHandler):
    """Ensures message priority is within acceptable bounds."""

    def validate(self, message: Message) -> bool:
        if not self._check(message):
            return False
        return super().validate(message)

    def _check(self, message: Message) -> bool:
        ok = 1 <= message.priority.value <= 10
        if not ok:
            logger.warning("Priority out of range: %d", message.priority.value)
        return ok


def build_validation_chain() -> ValidationHandler:
    """Wires up the chain: Size → Checksum → Priority."""
    head = PayloadSizeValidator()
    head.set_next(ChecksumValidator()).set_next(PriorityRangeValidator())
    return head


# ═══════════════════════════════════════════════════════════════════════════
# COMMAND PATTERN – Undo/redo for message operations
# ═══════════════════════════════════════════════════════════════════════════
class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class EnqueueCommand(Command):
    """Enqueues a message into a processing list (reversible)."""

    def __init__(self, queue: list[Message], message: Message) -> None:
        self._queue = queue
        self._message = message

    def execute(self) -> None:
        self._queue.append(self._message)
        logger.info("Enqueued message %s", self._message.id.value)

    def undo(self) -> None:
        self._queue.remove(self._message)
        logger.info("Dequeued (undo) message %s", self._message.id.value)


class CommandHistory:
    """Stores executed commands for undo support."""

    def __init__(self) -> None:
        self._history: list[Command] = []

    def execute(self, command: Command) -> None:
        command.execute()
        self._history.append(command)

    def undo_last(self) -> None:
        if not self._history:
            logger.warning("Nothing to undo")
            return
        command = self._history.pop()
        command.undo()


# ═══════════════════════════════════════════════════════════════════════════
# DECORATOR PATTERN – Layered handler enhancements
# ═══════════════════════════════════════════════════════════════════════════
class MessageHandler(ABC):
    """Component interface for message processing."""

    @abstractmethod
    def handle(self, message: Message) -> Message: ...


class CoreHandler(MessageHandler):
    """Concrete component: compresses the payload using a Strategy."""

    def __init__(self, strategy: CompressionStrategy) -> None:
        self._strategy = strategy

    def handle(self, message: Message) -> Message:
        compressed = self._strategy.compress(message.payload.data)
        logger.debug(
            "CoreHandler compressed %d → %d bytes",
            len(message.payload.data),
            len(compressed),
        )
        return Message(
            id=message.id,
            payload=Payload(compressed),
            priority=message.priority,
            created_at=message.created_at,
            metadata=message.metadata,
            _state=message._state,
        )


class HandlerDecorator(MessageHandler):
    """Base decorator – delegates to wrapped handler."""

    def __init__(self, wrapped: MessageHandler) -> None:
        self._wrapped = wrapped

    def handle(self, message: Message) -> Message:
        return self._wrapped.handle(message)


class LoggingDecorator(HandlerDecorator):
    """Adds timing logs around the wrapped handler."""

    def handle(self, message: Message) -> Message:
        logger.info(">>> Processing message %s", message.id.value)
        result = super().handle(message)
        logger.info("<<< Finished  message %s", result.id.value)
        return result


class MetadataDecorator(HandlerDecorator):
    """Stamps processing metadata onto the message."""

    def handle(self, message: Message) -> Message:
        result = super().handle(message)
        result.metadata["processed_at"] = datetime.now(timezone.utc).isoformat()
        result.metadata["original_checksum"] = message.payload.checksum
        return result


# ═══════════════════════════════════════════════════════════════════════════
# FACTORY METHOD – Polymorphic processor creation
# ═══════════════════════════════════════════════════════════════════════════
class ProcessorFactory(ABC):
    """Creator declares the factory method; subclasses decide the product."""

    @abstractmethod
    def _create_handler(self) -> MessageHandler: ...

    def create(self) -> MessageHandler:
        handler = self._create_handler()
        return LoggingDecorator(MetadataDecorator(handler))


class CompressedProcessorFactory(ProcessorFactory):
    """Creates a handler that applies zlib compression."""

    def _create_handler(self) -> MessageHandler:
        return CoreHandler(ZlibCompression())


class PlainProcessorFactory(ProcessorFactory):
    """Creates a handler that skips compression."""

    def _create_handler(self) -> MessageHandler:
        return CoreHandler(NoCompression())


# ═══════════════════════════════════════════════════════════════════════════
# MEMENTO PATTERN – Snapshot & restore of pipeline state
# ═══════════════════════════════════════════════════════════════════════════
@dataclass(frozen=True)
class PipelineMemento:
    """Immutable snapshot of the pipeline's message queue."""

    snapshot: tuple[Message, ...]
    taken_at: datetime


class Pipeline:
    """Orchestrates validation → enqueue → processing → delivery.

    Combines Chain of Responsibility, Command, Observer, Factory Method,
    State, and Memento into a single cohesive workflow.
    """

    def __init__(
        self,
        event_bus: EventBus,
        factory: ProcessorFactory,
    ) -> None:
        self._event_bus = event_bus
        self._handler = factory.create()
        self._validator = build_validation_chain()
        self._queue: list[Message] = []
        self._history = CommandHistory()
        self._mementos: list[PipelineMemento] = []

    # -- Memento operations --------------------------------------------------
    def save_snapshot(self) -> PipelineMemento:
        memento = PipelineMemento(
            snapshot=tuple(self._queue),
            taken_at=datetime.now(timezone.utc),
        )
        self._mementos.append(memento)
        logger.info("Snapshot saved (%d messages)", len(memento.snapshot))
        return memento

    def restore_snapshot(self, memento: PipelineMemento) -> None:
        self._queue = list(memento.snapshot)
        logger.info(
            "Snapshot restored from %s (%d messages)",
            memento.taken_at.isoformat(),
            len(self._queue),
        )

    # -- Core workflow -------------------------------------------------------
    def submit(self, message: Message) -> bool:
        """Validate, enqueue, and advance the message state."""
        if not self._validator.validate(message):
            self._event_bus.publish(MessageFailedEvent(message, "validation failed"))
            return False

        # State: DRAFT → VALIDATED
        message.advance()
        self._event_bus.publish(MessageValidatedEvent(message))

        # Command: enqueue (undoable)
        cmd = EnqueueCommand(self._queue, message)
        self._history.execute(cmd)

        # State: VALIDATED → QUEUED
        message.advance()
        return True

    def process_all(self) -> list[Message]:
        """Process every queued message through the decorated handler."""
        results: list[Message] = []
        while self._queue:
            msg = self._queue.pop(0)

            # State: QUEUED → PROCESSING
            msg.advance()

            processed = self._handler.handle(msg)

            # State: PROCESSING → DELIVERED
            processed.advance()
            self._event_bus.publish(MessageDeliveredEvent(processed))

            results.append(processed)
        return results

    def undo_last_enqueue(self) -> None:
        self._history.undo_last()

    @property
    def queue_depth(self) -> int:
        return len(self._queue)


# ═══════════════════════════════════════════════════════════════════════════
# DEMO – Wire everything up and run
# ═══════════════════════════════════════════════════════════════════════════
def main() -> None:
    logger.info("=== Event-Driven Message Processing Pipeline ===")

    # --- Dependency Injection (no module-level singletons) ---
    bus = EventBus()
    bus.subscribe(MessageValidatedEvent, AuditLogger())
    bus.subscribe(MessageDeliveredEvent, AuditLogger())
    bus.subscribe(MessageFailedEvent, AuditLogger())

    metrics = MetricsCollector()
    bus.subscribe(MessageDeliveredEvent, metrics)
    bus.subscribe(MessageFailedEvent, metrics)

    # Factory Method: choose compressed processor
    pipeline = Pipeline(event_bus=bus, factory=CompressedProcessorFactory())

    # Builder: construct messages
    msg1 = (
        MessageBuilder()
        .with_id("msg-001")
        .with_payload("Hello, beautifully over-engineered world!")
        .with_priority(1)
        .with_metadata("source", "unit-test")
        .build()
    )

    msg2 = (
        MessageBuilder()
        .with_id("msg-002")
        .with_payload("Second message with lower priority")
        .with_priority(7)
        .build()
    )

    msg3 = (
        MessageBuilder()
        .with_id("msg-003")
        .with_payload("Third message – will be undone")
        .with_priority(3)
        .build()
    )

    # Submit messages through validation chain
    pipeline.submit(msg1)
    pipeline.submit(msg2)
    pipeline.submit(msg3)
    logger.info("Queue depth after 3 submits: %d", pipeline.queue_depth)

    # Memento: snapshot before undo
    snapshot = pipeline.save_snapshot()

    # Command: undo last enqueue
    pipeline.undo_last_enqueue()
    logger.info("Queue depth after undo: %d", pipeline.queue_depth)

    # Memento: restore snapshot
    pipeline.restore_snapshot(snapshot)
    logger.info("Queue depth after restore: %d", pipeline.queue_depth)

    # Process all queued messages (Decorator + Strategy + State)
    delivered = pipeline.process_all()
    logger.info("Delivered %d messages", len(delivered))

    # Print summary
    print("\n" + "=" * 60)
    print("DELIVERY REPORT")
    print("=" * 60)
    for msg in delivered:
        print(
            textwrap.dedent(f"""\
            ID       : {msg.id.value}
            Status   : {msg.status.name}
            Priority : {msg.priority.value}
            Checksum : {msg.payload.checksum}
            Metadata : {msg.metadata}
            """)
        )
    print(f"Total delivered : {metrics.delivered}")
    print(f"Total failed    : {metrics.failed}")
    print("=" * 60)


if __name__ == "__main__":
    main()
