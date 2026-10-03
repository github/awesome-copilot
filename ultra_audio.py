"""Fast, local, non-ML audio analysis helpers for DAW Bridge 3.0.

The signatures are similarity hints, not proof of identity. Mix observations are
technical measurements and conservative prompts, not mastering advice.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import soundfile as sf

FINGERPRINT_BINS = 48
SPECTRAL_BANDS = 8
MAX_AUDIO_SECONDS = 1800
BAND_NAMES = (
    "sub", "bass", "low_mid", "mid", "upper_mid", "presence", "brilliance", "air",
)
BAND_EDGES = (20.0, 60.0, 120.0, 250.0, 500.0, 2000.0, 5000.0, 10000.0, 20000.0)


def _db(value: float | None) -> float | None:
    if value is None or not math.isfinite(float(value)) or value <= 0:
        return None
    return round(20.0 * math.log10(float(value)), 2)


def _window_spectrum(samples: np.ndarray, sample_rate: int) -> np.ndarray:
    """Return normalized power per logarithmically useful fixed band."""
    x = np.asarray(samples, dtype=np.float32)
    if x.ndim == 2:
        x = x.mean(axis=1, dtype=np.float64).astype(np.float32)
    if x.size < 16:
        return np.zeros(SPECTRAL_BANDS, dtype=np.float64)
    x = x - float(np.mean(x))
    window = np.hanning(x.size).astype(np.float32)
    spectrum = np.fft.rfft(x * window)
    power = np.square(np.abs(spectrum), dtype=np.float64)
    freqs = np.fft.rfftfreq(x.size, 1.0 / sample_rate)
    nyquist = sample_rate * 0.5
    values = []
    for low, high in zip(BAND_EDGES[:-1], BAND_EDGES[1:]):
        upper = min(high, nyquist)
        mask = (freqs >= low) & (freqs < upper)
        values.append(float(power[mask].sum()) if np.any(mask) else 0.0)
    out = np.asarray(values, dtype=np.float64)
    total = float(out.sum())
    if total > 1e-30:
        out /= total
    return out


def _spectral_hash(rows: list[list[float]]) -> str:
    # One sign bit for each adjacent-band contrast in each time segment.
    bits = []
    for row in rows:
        for left, right in zip(row[:-1], row[1:]):
            bits.append(1 if right >= left else 0)
    packed = bytearray((len(bits) + 7) // 8)
    for index, bit in enumerate(bits):
        if bit:
            packed[index // 8] |= 1 << (7 - index % 8)
    return bytes(packed).hex()


def audio_fingerprint(path: Path, bins: int = FINGERPRINT_BINS) -> dict:
    p = Path(path)
    with sf.SoundFile(str(p)) as audio:
        frames, rate, channels = len(audio), int(audio.samplerate), int(audio.channels)
        if frames <= 0 or rate <= 0:
            raise ValueError("Pusty lub nieprawidłowy plik audio.")
        duration = frames / rate
        if duration > MAX_AUDIO_SECONDS:
            raise ValueError("Limit fingerprintu: 30 minut na plik.")
        # A compact, evenly spaced set of windows gives a stable, low-I/O signature.
        span = min(8192, max(1024, rate // 8))
        rms_bins, peak_bins, spectral_rows = [], [], []
        for i in range(bins):
            center = int((i + 0.5) * frames / bins)
            start = min(max(0, center - span // 2), max(0, frames - span))
            audio.seek(start)
            x = audio.read(frames=min(span, frames - start), dtype="float32", always_2d=True)
            if x.size:
                rms_bins.append(float(np.sqrt(np.mean(np.square(x, dtype=np.float64)))) )
                peak_bins.append(float(np.max(np.abs(x))))
                spectral_rows.append(_window_spectrum(x, rate).tolist())
            else:
                rms_bins.append(0.0)
                peak_bins.append(0.0)
                spectral_rows.append([0.0] * SPECTRAL_BANDS)
    rms_arr = np.asarray(rms_bins, dtype=np.float64)
    return {
        "duration": round(duration, 5),
        "sampleRate": rate,
        "channels": channels,
        "rms": float(np.sqrt(np.mean(np.square(rms_arr)))) if rms_arr.size else 0.0,
        "peak": max(peak_bins, default=0.0),
        "rmsBins": rms_bins,
        "peakBins": peak_bins,
        "bandEnergy": spectral_rows,
        "spectralHash": _spectral_hash(spectral_rows),
        "bandNames": list(BAND_NAMES),
        "method": "48 równomiernych segmentów RMS/peak + 8 pasm FFT; lokalna heurystyka, bez ML",
    }


def _cosine(a, b) -> float:
    x = np.asarray(a, dtype=np.float64).reshape(-1)
    y = np.asarray(b, dtype=np.float64).reshape(-1)
    if x.size != y.size or x.size == 0:
        return 0.0
    nx, ny = float(np.linalg.norm(x)), float(np.linalg.norm(y))
    if nx < 1e-12 or ny < 1e-12:
        return 1.0 if nx < 1e-12 and ny < 1e-12 else 0.0
    return float(np.clip(np.dot(x, y) / (nx * ny), 0.0, 1.0))


def _spectral_similarity(a: dict, b: dict) -> float | None:
    aa, bb = a.get("bandEnergy"), b.get("bandEnergy")
    if not isinstance(aa, list) or not isinstance(bb, list) or not aa or not bb:
        return None
    try:
        x, y = np.asarray(aa, dtype=np.float64), np.asarray(bb, dtype=np.float64)
    except (TypeError, ValueError):
        return None
    if x.ndim != 2 or y.ndim != 2 or x.shape[1] != y.shape[1]:
        return None
    # Permit a small edit/offset while still comparing like-for-like timeline segments.
    scores = []
    max_shift = min(3, max(0, min(len(x), len(y)) // 8))
    for shift in range(-max_shift, max_shift + 1):
        if shift >= 0:
            xa, yb = x[shift:], y[:len(x) - shift if shift else len(x)]
        else:
            xa, yb = x[:len(x) + shift], y[-shift:]
        n = min(len(xa), len(yb))
        if n <= 0:
            continue
        xa, yb = xa[:n], yb[:n]
        row_scores = [_cosine(row_a, row_b) for row_a, row_b in zip(xa, yb)]
        scores.append(float(np.mean(row_scores)) if row_scores else 0.0)
    return max(scores, default=0.0)


def fingerprint_components(a: dict, b: dict) -> dict:
    def cosine(key):
        return _cosine(a.get(key, []), b.get(key, []))

    rms, peak = cosine("rmsBins"), cosine("peakBins")
    spectral = _spectral_similarity(a, b)
    da, db = a.get("duration"), b.get("duration")
    duration = max(0.0, 1.0 - abs(da - db) / max(da, db, 0.1)) if da and db else 0.0
    ra, rb = a.get("rms", 0.0), b.get("rms", 0.0)
    gain = max(0.0, 1.0 - abs(math.log10((ra + 1e-9) / (rb + 1e-9))) / 2.0) if ra and rb else (1.0 if not ra and not rb else 0.0)
    hash_a, hash_b = a.get("spectralHash"), b.get("spectralHash")
    spectral_hash = None
    if isinstance(hash_a, str) and isinstance(hash_b, str) and len(hash_a) == len(hash_b):
        try:
            ba, bb = bytes.fromhex(hash_a), bytes.fromhex(hash_b)
            total = max(1, len(ba) * 8)
            spectral_hash = 1.0 - sum((u ^ v).bit_count() for u, v in zip(ba, bb)) / total
        except ValueError:
            pass
    if spectral is None:
        score = 0.38 * rms + 0.22 * peak + 0.25 * duration + 0.15 * gain
    else:
        score = 0.22 * rms + 0.12 * peak + 0.20 * spectral + 0.12 * (spectral_hash if spectral_hash is not None else spectral) + 0.22 * duration + 0.12 * gain
    return {
        "similarity": round(float(np.clip(score, 0.0, 1.0)), 6),
        "rms": round(rms, 6),
        "peak": round(peak, 6),
        "spectral": round(spectral, 6) if spectral is not None else None,
        "spectralHash": round(spectral_hash, 6) if spectral_hash is not None else None,
        "duration": round(duration, 6),
        "gainInvariant": round(gain, 6),
    }


def estimate_tempo(path: Path, max_seconds: float = 180.0) -> dict:
    p = Path(path)
    with sf.SoundFile(str(p)) as audio:
        rate, channels = int(audio.samplerate), int(audio.channels)
        frames_total = min(len(audio), int(rate * max_seconds))
        if rate <= 0 or frames_total <= 0:
            raise ValueError("Plik audio nie zawiera czytelnych próbek.")
        frame = max(128, rate // 20)  # 50 ms energy envelope
        frames_total = frames_total // frame * frame
        if frames_total < frame * 40:
            return {"bpm": None, "confidence": 0.0, "candidates": [], "analyzedSeconds": round(frames_total / rate, 2),
                    "method": "autokorelacja obwiedni energii 50 ms", "note": "Za krótki materiał do wiarygodnego oszacowania tempa."}
        envelope = []
        block_frames = frame * 240
        remaining = frames_total
        while remaining:
            count = min(block_frames, remaining)
            count = count // frame * frame
            if count <= 0:
                break
            x = audio.read(frames=count, dtype="float32", always_2d=True)
            remaining -= len(x)
            if not x.size:
                break
            n = len(x) // frame
            x = x[:n * frame]
            power = np.mean(np.square(x.reshape(n, frame, channels), dtype=np.float64), axis=(1, 2))
            envelope.extend(np.sqrt(power).tolist())
    env = np.asarray(envelope, dtype=np.float64)
    if env.size < 40:
        return {"bpm": None, "confidence": 0.0, "candidates": [], "analyzedSeconds": round(env.size * 0.05, 2),
                "method": "autokorelacja obwiedni energii 50 ms", "note": "Za krótki materiał do wiarygodnego oszacowania tempa."}
    # Positive log-energy changes are a cheap onset proxy, not a beat tracker.
    onset = np.maximum(0.0, np.diff(np.log(env + 1e-7)))
    onset -= float(np.mean(onset))
    onset *= np.hanning(onset.size)
    if float(np.linalg.norm(onset)) < 1e-8:
        return {"bpm": None, "confidence": 0.0, "candidates": [], "analyzedSeconds": round(env.size * 0.05, 2),
                "method": "autokorelacja obwiedni energii 50 ms", "note": "Brak wyraźnych zmian energii; tempo nie jest określone."}
    fft_size = 1 << int(math.ceil(math.log2(max(2, onset.size * 2))))
    spectrum = np.fft.rfft(onset, n=fft_size)
    corr = np.fft.irfft(spectrum * np.conjugate(spectrum), n=fft_size)[:onset.size]
    if corr[0] > 0:
        corr /= corr[0]
    min_lag = max(3, int(round(20 * 60 / 240)))
    max_lag = min(onset.size // 2, int(round(20 * 60 / 40)))
    candidates = []
    for lag in range(min_lag, max_lag + 1):
        bpm = 20 * 60 / lag
        # Gentle preference for common beat ranges; report alternates rather than hiding ambiguity.
        prior = 1.04 if 75 <= bpm <= 155 else 1.0
        candidates.append((float(corr[lag]) * prior, float(bpm), float(corr[lag])))
    candidates.sort(reverse=True)
    selected = []
    for _, bpm, raw_score in candidates:
        if all(abs(bpm - old["bpm"]) > 3.0 for old in selected):
            selected.append({"bpm": round(bpm, 1), "score": round(max(0.0, raw_score), 4)})
            if len(selected) == 3:
                break
    confidence = min(0.99, max(0.0, selected[0]["score"] if selected else 0.0))
    return {
        "bpm": selected[0]["bpm"] if selected and confidence >= 0.04 else None,
        "confidence": round(confidence, 3),
        "candidates": selected,
        "analyzedSeconds": round(env.size * 0.05, 2),
        "method": "autokorelacja lokalnej obwiedni energii 50 ms; bez ML",
        "note": "Tempo jest propozycją heurystyczną; half-time/double-time i tonalne źródła mogą dać alternatywy.",
    }


def producer_report(path: Path) -> dict:
    p = Path(path)
    with sf.SoundFile(str(p)) as audio:
        rate, channels, frames = int(audio.samplerate), int(audio.channels), len(audio)
        duration = frames / rate if rate else 0.0
        if not rate or not frames or duration > MAX_AUDIO_SECONDS:
            raise ValueError("Limit Producer AI: czytelny plik do 30 minut.")
        block = max(rate // 5, 1)
        chunk_size = block * 120  # up to about 24 seconds per I/O operation
        sum_squares = 0.0
        sample_count = 0
        peak = 0.0
        near_full_scale = 0
        left_sq = right_sq = lr_sum = channel_count = 0.0
        envelope = []
        remaining = frames
        while remaining:
            x = audio.read(frames=min(chunk_size, remaining), dtype="float32", always_2d=True)
            if not x.size:
                break
            remaining -= len(x)
            vals = np.asarray(x, dtype=np.float64)
            absolute = np.abs(vals)
            peak = max(peak, float(absolute.max(initial=0.0)))
            near_full_scale += int(np.count_nonzero(absolute >= 0.999))
            sum_squares += float(np.square(vals).sum())
            sample_count += int(vals.size)
            if channels >= 2:
                left, right = vals[:, 0], vals[:, 1]
                left_sq += float(np.dot(left, left))
                right_sq += float(np.dot(right, right))
                lr_sum += float(np.dot(left, right))
                channel_count += len(left)
            n = len(x) // block
            if n:
                shaped = vals[:n * block].reshape(n, block, channels)
                rmses = np.sqrt(np.mean(np.square(shaped), axis=(1, 2)))
                envelope.extend(rmses.tolist())
        rms = math.sqrt(sum_squares / sample_count) if sample_count else 0.0
        peak_db, rms_db = _db(peak), _db(rms)
        crest = round(peak_db - rms_db, 2) if peak_db is not None and rms_db is not None else None
        balance_db = None
        correlation = None
        if channels >= 2:
            l_rms = math.sqrt(left_sq / max(1.0, channel_count))
            r_rms = math.sqrt(right_sq / max(1.0, channel_count))
            if l_rms > 0 or r_rms > 0:
                balance_db = round(20.0 * math.log10((r_rms + 1e-12) / (l_rms + 1e-12)), 2)
            denominator = math.sqrt(left_sq * right_sq)
            correlation = round(float(np.clip(lr_sum / denominator, -1.0, 1.0)), 4) if denominator > 1e-20 else None
    # Spectral balance is sampled at 48 evenly distributed positions; this avoids a full-file FFT.
    band_power = np.zeros(SPECTRAL_BANDS, dtype=np.float64)
    spectrum_count = 0
    with sf.SoundFile(str(p)) as audio:
        rate, frames = int(audio.samplerate), len(audio)
        span = min(16384, max(1024, rate // 2))
        for i in range(48):
            center = int((i + 0.5) * frames / 48)
            start = min(max(0, center - span // 2), max(0, frames - span))
            audio.seek(start)
            x = audio.read(frames=min(span, frames - start), dtype="float32", always_2d=True)
            if x.size:
                row = _window_spectrum(x, rate)
                band_power += row
                spectrum_count += 1
    if spectrum_count:
        band_power /= spectrum_count
    band_sum = float(band_power.sum())
    bands = []
    for name, value in zip(BAND_NAMES, band_power):
        share = float(value / band_sum) if band_sum > 1e-30 else 0.0
        bands.append({"name": name, "share": round(share, 4), "relativeDb": _db(math.sqrt(share))})
    suggestions = []
    if peak >= 0.999 or near_full_scale:
        suggestions.append({"severity": "warning", "code": "near-full-scale", "text": "Są próbki blisko pełnej skali; sprawdź clipping i zapas headroomu w DAW. To nie jest pomiar true-peak."})
    if balance_db is not None and abs(balance_db) >= 3.0:
        suggestions.append({"severity": "info", "code": "stereo-imbalance", "text": f"Energia kanałów różni się o {abs(balance_db):.1f} dB; sprawdź, czy taka panorama jest zamierzona."})
    if correlation is not None and correlation < -0.2:
        suggestions.append({"severity": "warning", "code": "phase-correlation", "text": "Ujemna korelacja L/R może oznaczać ryzyko osłabienia w mono; sprawdź odsłuchem i miernikiem mono."})
    if crest is not None and crest < 6.0:
        suggestions.append({"severity": "info", "code": "low-crest", "text": "Niski crest factor; sprawdź, czy dynamika i limiter odpowiadają zamierzonemu brzmieniu."})
    if crest is not None and crest > 24.0:
        suggestions.append({"severity": "info", "code": "high-crest", "text": "Wysoki crest factor; sprawdź transienty oraz zgodność poziomu z celem miksu."})
    if not suggestions:
        suggestions.append({"severity": "info", "code": "no-obvious-flag", "text": "Brak oczywistych anomalii z tych prostych pomiarów; to nie ocenia jakości artystycznej miksu."})
    return {
        "file": p.name,
        "duration": round(duration, 3),
        "sampleRate": rate,
        "channels": channels,
        "peakDbfs": peak_db,
        "rmsDbfs": rms_db,
        "crestDb": crest,
        "nearFullScaleSamples": near_full_scale,
        "stereoBalanceDbRtoL": balance_db,
        "stereoCorrelation": correlation,
        "bandEnergy": bands,
        "envelope": [round(float(v), 6) for v in envelope[:9000]],
        "technicalFlags": suggestions,
        "confidence": "pomiar techniczny + proste progi; bez LUFS, true-peak, odsłuchu i modelu ML",
        "sha256": None,
    }


def silence_markers(path: Path, threshold_db: float = -48.0, minimum_seconds: float = 1.0) -> dict:
    """Suggest silence boundaries in a source file. Never writes into a DAW session."""
    p = Path(path)
    with sf.SoundFile(str(p)) as audio:
        rate, channels, total = int(audio.samplerate), int(audio.channels), len(audio)
        duration = total / rate if rate else 0.0
        if not rate or duration > MAX_AUDIO_SECONDS:
            raise ValueError("Limit Auto-Markers: czytelny plik do 30 minut.")
        block = max(128, rate // 10)  # 100 ms windows
        chunk_windows = 200
        energies = []
        remaining = total
        while remaining:
            count = min(block * chunk_windows, remaining)
            x = audio.read(frames=count, dtype="float32", always_2d=True)
            if not x.size:
                break
            remaining -= len(x)
            n = math.ceil(len(x) / block)
            padded = np.zeros((n * block, channels), dtype=np.float32)
            padded[:len(x)] = x
            shaped = padded.reshape(n, block, channels)
            energies.extend(np.sqrt(np.mean(np.square(shaped, dtype=np.float64), axis=(1, 2))).tolist())
    threshold = 10.0 ** (threshold_db / 20.0)
    min_windows = max(1, int(math.ceil(minimum_seconds / 0.1)))
    proposals = []
    start = None
    for i, value in enumerate(energies + [float("inf")]):
        if value < threshold and start is None:
            start = i
        elif value >= threshold and start is not None:
            if i - start >= min_windows:
                proposals.append({"name": f"Silence {len(proposals) + 1}", "position": round(start * 0.1, 3),
                                  "endSeconds": round(i * 0.1, 3), "unit": "seconds", "type": "silence-boundary",
                                  "confidence": "RMS threshold heuristic"})
            start = None
    return {"file": p.name, "thresholdDb": threshold_db, "minimumSeconds": minimum_seconds,
            "markers": proposals[:200], "method": "100 ms RMS windows; suggestions only"}
