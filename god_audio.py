"""God Mode 4.2: local adaptive audio features and conservative reports."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import soundfile as sf

from ultra_audio import audio_fingerprint, BAND_NAMES, BAND_EDGES, MAX_AUDIO_SECONDS

MAX_ADAPTIVE_SECONDS = 180.0
MAX_DEEP_SCAN_SECONDS_PER_FILE = 45.0
MAX_DEEP_SCAN_FILES = 20
MAX_DEEP_SCAN_DECODE_BYTES = 512 * 1024 ** 2
KEY_NAMES = ("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")
MAJOR_PROFILE = np.asarray([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], dtype=np.float64)
MINOR_PROFILE = np.asarray([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17], dtype=np.float64)


def _cos(a, b):
    x, y = np.asarray(a, dtype=np.float64).reshape(-1), np.asarray(b, dtype=np.float64).reshape(-1)
    if x.size != y.size or not x.size:
        return 0.0
    nx, ny = float(np.linalg.norm(x)), float(np.linalg.norm(y))
    if nx < 1e-12 or ny < 1e-12:
        return 1.0 if nx < 1e-12 and ny < 1e-12 else 0.0
    return float(np.clip(np.dot(x, y) / (nx * ny), 0.0, 1.0))


def _key_estimate(chroma):
    profile = np.asarray(chroma, dtype=np.float64).reshape(-1)
    if profile.size != 12 or float(np.sum(profile)) < 1e-12:
        return {"key": None, "mode": None, "confidence": 0.0, "alternatives": [],
                "method": "Krumhansl-style chroma correlation; low-energy/no-tonal result"}
    profile = profile / (float(np.linalg.norm(profile)) + 1e-12)
    rows = []
    for mode, template in (("major", MAJOR_PROFILE), ("minor", MINOR_PROFILE)):
        t = template - float(np.mean(template))
        t = t / (float(np.linalg.norm(t)) + 1e-12)
        for root, name in enumerate(KEY_NAMES):
            shifted = np.roll(t, root)
            score = float(np.dot(profile - float(np.mean(profile)), shifted))
            rows.append({"key": name, "mode": mode, "score": score})
    rows.sort(key=lambda x: x["score"], reverse=True)
    best, second = rows[0], rows[1]
    spread = max(0.0, best["score"] - second["score"])
    confidence = float(np.clip(spread / (abs(best["score"]) + 0.08), 0.0, 1.0))
    # Percussive/noisy audio often has no stable pitch center; leave the result open.
    if best["score"] < 0.05 or confidence < 0.015:
        return {"key": None, "mode": None, "confidence": round(confidence, 3),
                "alternatives": rows[:5], "method": "Krumhansl-style chroma correlation; key may be ambiguous"}
    return {"key": best["key"], "mode": best["mode"], "confidence": round(confidence, 3),
            "score": round(best["score"], 4), "alternatives": rows[:5],
            "method": "Krumhansl-style 12-bin chroma correlation; heuristic, not a transcription"}


def _tempo_from_onset(onset, fps):
    x = np.asarray(onset, dtype=np.float64)
    if x.size < 40 or float(np.linalg.norm(x)) < 1e-8:
        return {"bpm": None, "confidence": 0.0, "candidates": []}
    x = x - float(np.mean(x))
    x *= np.hanning(x.size)
    fft_size = 1 << int(math.ceil(math.log2(max(2, x.size * 2))))
    spectrum = np.fft.rfft(x, n=fft_size)
    corr = np.fft.irfft(spectrum * np.conjugate(spectrum), n=fft_size)[:x.size]
    if corr[0] > 0:
        corr /= corr[0]
    min_lag = max(2, int(round(fps * 60 / 240)))
    max_lag = min(x.size // 2, int(round(fps * 60 / 40)))
    scores = []
    for lag in range(min_lag, max_lag + 1):
        bpm = fps * 60 / lag
        score = float(corr[lag]) * (1.03 if 75 <= bpm <= 155 else 1.0)
        scores.append((score, bpm, float(corr[lag])))
    scores.sort(reverse=True)
    candidates = []
    for _, bpm, score in scores:
        if all(abs(bpm - prev["bpm"]) > 3 for prev in candidates):
            candidates.append({"bpm": round(bpm, 1), "score": round(max(0.0, score), 4)})
            if len(candidates) >= 4:
                break
    confidence = candidates[0]["score"] if candidates else 0.0
    return {"bpm": candidates[0]["bpm"] if confidence >= 0.04 else None,
            "confidence": round(float(np.clip(confidence, 0, 0.99)), 3), "candidates": candidates}


def _segment_boundaries(change, n_frames, fps, duration):
    if n_frames < 2:
        return [0, n_frames]
    desired = int(np.clip(round(duration / 3.0), 8, 96))
    min_gap = max(1, int(round(0.25 * fps)))
    search = max(1, int(round(0.35 * fps)))
    boundaries = [0]
    for i in range(1, desired):
        ideal = int(round(i * n_frames / desired))
        lo, hi = max(boundaries[-1] + min_gap, ideal - search), min(n_frames - 1, ideal + search)
        if hi <= lo:
            candidate = ideal
        else:
            candidate = lo + int(np.argmax(change[lo:hi + 1]))
        candidate = min(max(candidate, boundaries[-1] + 1), n_frames - (desired - i))
        if candidate - boundaries[-1] >= min_gap and n_frames - candidate >= min_gap:
            boundaries.append(candidate)
        elif ideal > boundaries[-1] + min_gap and n_frames - ideal >= min_gap:
            boundaries.append(ideal)
    boundaries.append(n_frames)
    # Deduplicate and keep a bounded number of segments.
    out = [boundaries[0]]
    for point in boundaries[1:]:
        if point > out[-1]:
            out.append(point)
    return out


def adaptive_fingerprint(path: Path, max_seconds: float = MAX_ADAPTIVE_SECONDS) -> dict:
    """Bounded local signature plus adaptive transient/harmonic/rhythm features."""
    p = Path(path)
    try:
        max_seconds = float(max_seconds)
    except (TypeError, ValueError):
        raise ValueError('Limit adaptive audio analysis is invalid.')
    if not math.isfinite(max_seconds) or max_seconds <= 0:
        raise ValueError('Limit adaptive audio analysis must be positive and finite.')
    max_seconds = min(MAX_ADAPTIVE_SECONDS, max_seconds)
    base = audio_fingerprint(p)
    rms_all, peak_all, flux_all, bands_all, chroma_all = [], [], [], [], []
    with sf.SoundFile(str(p)) as audio:
        rate, channels, frames_total = int(audio.samplerate), int(audio.channels), len(audio)
        if rate <= 0 or frames_total <= 0:
            raise ValueError("Pusty lub nieprawidłowy plik audio.")
        duration_total = frames_total / rate
        if duration_total > MAX_AUDIO_SECONDS:
            raise ValueError("Limit fingerprintu: 30 minut na plik.")
        frames_to_read = min(frames_total, int(rate * max_seconds))
        frame = max(1, min(max(128, rate // 50), frames_to_read))  # approximately 20 ms, shorter for tiny one-shots
        frames_to_read = frames_to_read // frame * frame
        fps = rate / frame
        nfft = 1 << int(math.ceil(math.log2(frame)))
        window = np.hanning(nfft).astype(np.float32)
        freqs = np.fft.rfftfreq(nfft, 1.0 / rate)
        band_masks = [(freqs >= lo) & (freqs < min(hi, rate * 0.5)) for lo, hi in zip(BAND_EDGES[:-1], BAND_EDGES[1:])]
        pitch_ok = (freqs >= 40.0) & (freqs <= min(8000.0, rate * 0.5))
        pitch_midi = np.zeros(freqs.shape, dtype=np.int16)
        pitch_midi[pitch_ok] = np.rint(69 + 12 * np.log2(freqs[pitch_ok] / 440.0)).astype(np.int16)
        pitch_class = pitch_midi % 12
        previous_mag = None
        remaining = frames_to_read
        chunk_frames = frame * 500
        while remaining:
            count = min(chunk_frames, remaining)
            x = audio.read(frames=count, dtype="float32", always_2d=True)
            remaining -= len(x)
            if not x.size:
                break
            n = len(x) // frame
            if not n:
                continue
            shaped = x[:n * frame].reshape(n, frame, channels)
            mono = shaped.mean(axis=2, dtype=np.float64).astype(np.float32)
            rms = np.sqrt(np.mean(np.square(shaped, dtype=np.float64), axis=(1, 2)))
            peak = np.max(np.abs(shaped), axis=(1, 2))
            rms_all.extend(rms.tolist())
            peak_all.extend(peak.tolist())
            padded = np.zeros((n, nfft), dtype=np.float32)
            padded[:, :frame] = mono
            padded -= np.mean(padded, axis=1, keepdims=True)
            mag = np.abs(np.fft.rfft(padded * window, axis=1)).astype(np.float32)
            power = np.square(mag, dtype=np.float64)
            band_rows = np.column_stack([power[:, mask].sum(axis=1) if np.any(mask) else np.zeros(n) for mask in band_masks])
            band_total = band_rows.sum(axis=1, keepdims=True)
            band_rows = np.divide(band_rows, band_total, out=np.zeros_like(band_rows), where=band_total > 1e-20)
            bands_all.extend(band_rows.tolist())
            chroma = np.zeros((n, 12), dtype=np.float64)
            if np.any(pitch_ok):
                for pc in range(12):
                    mask = pitch_ok & (pitch_class == pc)
                    if np.any(mask):
                        chroma[:, pc] = power[:, mask].sum(axis=1)
            chroma_total = chroma.sum(axis=1, keepdims=True)
            chroma = np.divide(chroma, chroma_total, out=np.zeros_like(chroma), where=chroma_total > 1e-20)
            chroma_all.extend(chroma.tolist())
            if previous_mag is None:
                prev = np.concatenate([mag[:1], mag[:-1]], axis=0)
            else:
                prev = np.concatenate([previous_mag[None, :], mag[:-1]], axis=0)
            flux = np.maximum(mag - prev, 0.0).sum(axis=1) / (prev.sum(axis=1) + 1e-8)
            energy_rise = np.maximum(0.0, np.diff(np.log(np.maximum(rms, 1e-8)), prepend=np.log(max(float(rms[0]), 1e-8))))
            flux_all.extend((0.75 * flux + 0.25 * energy_rise).tolist())
            previous_mag = mag[-1].copy()
    if not rms_all:
        raise ValueError("Nie udało się zbudować profilu adaptacyjnego.")
    rms_arr = np.asarray(rms_all, dtype=np.float64)
    peak_arr = np.asarray(peak_all, dtype=np.float64)
    flux_arr = np.asarray(flux_all, dtype=np.float64)
    bands_arr = np.asarray(bands_all, dtype=np.float64)
    chroma_arr = np.asarray(chroma_all, dtype=np.float64)
    med = float(np.median(flux_arr))
    mad = float(np.median(np.abs(flux_arr - med))) + 1e-9
    robust_flux = np.clip((flux_arr - med) / (4.0 * mad), 0.0, 1.0)
    positive_energy = np.maximum(0.0, np.diff(np.log(np.maximum(rms_arr, 1e-8)), prepend=np.log(max(float(rms_arr[0]), 1e-8))))
    energy_norm = np.clip(positive_energy / (float(np.percentile(positive_energy, 95)) + 1e-9), 0.0, 1.0)
    change = np.clip(0.7 * robust_flux + 0.3 * energy_norm, 0.0, 1.0)
    fps = rate / frame
    duration_analyzed = len(rms_arr) / fps
    boundaries = _segment_boundaries(change, len(rms_arr), fps, duration_analyzed)
    segments = []
    for start, end in zip(boundaries[:-1], boundaries[1:]):
        if end <= start:
            continue
        segment_rms = float(np.sqrt(np.mean(np.square(rms_arr[start:end]))))
        segment_bands = bands_arr[start:end].mean(axis=0)
        segment_chroma = chroma_arr[start:end].mean(axis=0)
        segment_bands = segment_bands / (float(segment_bands.sum()) + 1e-12)
        segment_chroma = segment_chroma / (float(segment_chroma.sum()) + 1e-12)
        segments.append({
            'startSeconds': round(start / fps, 4), 'endSeconds': round(end / fps, 4),
            'rms': segment_rms, 'peak': float(peak_arr[start:end].max(initial=0.0)),
            'bandEnergy': segment_bands.tolist(), 'harmonicChroma': segment_chroma.tolist(),
            'transientDensity': float(np.mean(change[start:end])),
        })
    # Non-maximum suppression on the adaptive onset curve.
    min_gap = max(1, int(round(0.08 * fps)))
    threshold = float(np.median(change) + max(0.12, 1.5 * np.median(np.abs(change - np.median(change)))))
    candidates = np.flatnonzero((change >= threshold) & (change >= np.r_[change[0], change[:-1]]) & (change >= np.r_[change[1:], change[-1]]))
    ranked = sorted(candidates.tolist(), key=lambda i: float(change[i]), reverse=True)
    chosen = []
    for index in ranked:
        if all(abs(index - other) >= min_gap for other in chosen):
            chosen.append(index)
            if len(chosen) >= 2000:
                break
    chosen.sort()
    transients = [{'time': round(i / fps, 4), 'strength': round(float(change[i]), 4)} for i in chosen]
    onset = np.asarray(change, dtype=np.float64)
    tempo = _tempo_from_onset(onset, fps)
    chroma_mean = chroma_arr.mean(axis=0)
    key = _key_estimate(chroma_mean)
    rhythm_bins = np.interp(np.linspace(0, max(0, len(onset) - 1), 128), np.arange(len(onset)), onset)
    rhythm_bins = rhythm_bins / (float(np.linalg.norm(rhythm_bins)) + 1e-12)
    base.update({
        'adaptiveSegments': segments,
        'adaptiveSegmentCount': len(segments),
        'adaptiveCoverageSeconds': round(duration_analyzed, 3),
        'adaptiveLimitSeconds': round(max_seconds, 3),
        'adaptiveMethod': '20 ms RMS/peak, energy/flux change boundaries, 8-band energy and 12-bin chroma; local heuristic, time-limited',
        'transients': transients,
        'transientCount': len(transients),
        'rhythmProfile': rhythm_bins.tolist(),
        'rhythmTempo': tempo,
        'chromaProfile': chroma_mean.tolist(),
        'tonality': key,
        'harmonicBandNames': list(KEY_NAMES),
    })
    return base


def _dtw_similarity(a, b, max_cells=20000):
    x = np.asarray(a, dtype=np.float64)
    y = np.asarray(b, dtype=np.float64)
    if x.ndim != 2 or y.ndim != 2 or not len(x) or not len(y) or x.shape[1] != y.shape[1]:
        return None
    if len(x) * len(y) > max_cells:
        stride_x = max(1, int(math.ceil(len(x) / 140)))
        stride_y = max(1, int(math.ceil(len(y) / 140)))
        x, y = x[::stride_x], y[::stride_y]
    n, m = len(x), len(y)
    window = max(abs(n - m) + 4, int(max(n, m) * 0.18))
    cost = np.full((n + 1, m + 1), np.inf, dtype=np.float64)
    length = np.zeros((n + 1, m + 1), dtype=np.int32)
    cost[0, 0] = 0.0
    for i in range(1, n + 1):
        lo, hi = max(1, i - window), min(m, i + window)
        for j in range(lo, hi + 1):
            nx, ny = float(np.linalg.norm(x[i - 1])), float(np.linalg.norm(y[j - 1]))
            if nx < 1e-12 or ny < 1e-12:
                distance = 0.0 if nx < 1e-12 and ny < 1e-12 else 1.0
            else:
                distance = 1.0 - float(np.clip(np.dot(x[i - 1], y[j - 1]) / (nx * ny), 0.0, 1.0))
            choices = ((cost[i - 1, j - 1], length[i - 1, j - 1]),
                       (cost[i - 1, j], length[i - 1, j]),
                       (cost[i, j - 1], length[i, j - 1]))
            prev_cost, prev_len = min(choices, key=lambda z: z[0])
            cost[i, j] = prev_cost + distance
            length[i, j] = prev_len + 1
    if not math.isfinite(cost[n, m]) or not length[n, m]:
        return 0.0
    return float(np.clip(1.0 - cost[n, m] / length[n, m], 0.0, 1.0))


def adaptive_similarity(a: dict, b: dict) -> dict:
    seg_a = a.get('adaptiveSegments', [])
    seg_b = b.get('adaptiveSegments', [])
    adaptive = harmonic = None
    if seg_a and seg_b:
        bands_a = [x.get('bandEnergy', [0.0] * 8) for x in seg_a]
        bands_b = [x.get('bandEnergy', [0.0] * 8) for x in seg_b]
        chroma_a = [x.get('harmonicChroma', [0.0] * 12) for x in seg_a]
        chroma_b = [x.get('harmonicChroma', [0.0] * 12) for x in seg_b]
        adaptive = _dtw_similarity(bands_a, bands_b)
        harmonic = _dtw_similarity(chroma_a, chroma_b)
    if adaptive is None:
        # Safe migration fallback for existing v3 signatures.
        from ultra_audio import fingerprint_components
        old = fingerprint_components(a, b)
        adaptive = old.get('spectral') if old.get('spectral') is not None else old['similarity']
        harmonic = old.get('spectralHash') if old.get('spectralHash') is not None else adaptive
    rhythm = _cos(a.get('rhythmProfile', []), b.get('rhythmProfile', [])) if a.get('rhythmProfile') and b.get('rhythmProfile') else None
    if rhythm is not None:
        # Rhythm may be phase-shifted by a short leading silence; try small circular shifts.
        x, y = np.asarray(a['rhythmProfile']), np.asarray(b['rhythmProfile'])
        rhythm = max(_cos(np.roll(x, shift), y) for shift in range(-8, 9))
    band_global = _cos(np.asarray(a.get('bandEnergy', [])).mean(axis=0) if np.asarray(a.get('bandEnergy', [])).ndim == 2 else [],
                       np.asarray(b.get('bandEnergy', [])).mean(axis=0) if np.asarray(b.get('bandEnergy', [])).ndim == 2 else [])
    da, db = a.get('duration'), b.get('duration')
    duration = max(0.0, 1.0 - abs(da - db) / max(float(da or 0), float(db or 0), 0.1)) if da and db else 0.0
    components = {
        'adaptiveSegments': round(float(adaptive or 0), 6),
        'harmonicBands': round(float(harmonic or 0), 6),
        'rhythm': round(float(rhythm or 0), 6) if rhythm is not None else None,
        'spectral': round(float(band_global), 6),
        'duration': round(float(duration), 6),
    }
    weights = [('adaptiveSegments', 0.32), ('harmonicBands', 0.24), ('spectral', 0.18), ('duration', 0.10)]
    if rhythm is not None:
        weights.append(('rhythm', 0.16))
    total_weight = sum(w for _, w in weights)
    score = sum(components[key] * weight for key, weight in weights) / total_weight
    return {'similarity': round(float(np.clip(score, 0.0, 1.0)), 6), **components,
            'method': 'constrained DTW of adaptive spectral/chroma segments + rhythmic envelope; heuristic'}


def mix_integrity_report(path: Path, profile: dict | None = None) -> dict:
    p = Path(path)
    profile = profile or adaptive_fingerprint(p)
    duration = float(profile.get('duration', 0.0))
    segments = profile.get('adaptiveSegments', [])
    # Aggregate the adaptive feature sequence into at most eight timeline sections.
    n_sections = min(8, max(1, len(segments)))
    section_rows = []
    for section in range(n_sections):
        lo = int(section * len(segments) / n_sections)
        hi = max(lo + 1, int((section + 1) * len(segments) / n_sections))
        rows = segments[lo:hi]
        if not rows:
            continue
        rms_values = np.asarray([x.get('rms', 0.0) for x in rows], dtype=np.float64)
        peak_values = np.asarray([x.get('peak', 0.0) for x in rows], dtype=np.float64)
        rms = float(np.sqrt(np.mean(np.square(rms_values)))) if rms_values.size else 0.0
        peak = float(peak_values.max(initial=0.0))
        start, end = rows[0]['startSeconds'], rows[-1]['endSeconds']
        section_rows.append({'index': section + 1, 'startSeconds': start, 'endSeconds': end,
                             'rmsDbfs': round(20 * math.log10(rms), 2) if rms > 0 else None,
                             'peakDbfs': round(20 * math.log10(peak), 2) if peak > 0 else None,
                             'crestDb': round(20 * math.log10(peak / rms), 2) if peak > rms > 0 else None,
                             'transientDensity': round(float(np.mean([x.get('transientDensity', 0) for x in rows])), 4),
                             'bandEnergy': np.mean([x.get('bandEnergy', [0] * 8) for x in rows], axis=0).round(5).tolist(),
                             'chroma': np.mean([x.get('harmonicChroma', [0] * 12) for x in rows], axis=0).round(5).tolist()})
    stereo_sections = []
    with sf.SoundFile(str(p)) as audio:
        rate, channels, total = int(audio.samplerate), int(audio.channels), len(audio)
        if channels >= 2 and total:
            for i in range(8):
                center = int((i + 0.5) * total / 8)
                span = min(rate * 2, total)
                start = min(max(0, center - span // 2), max(0, total - span))
                audio.seek(start)
                x = audio.read(frames=min(span, total - start), dtype='float32', always_2d=True)
                if not x.size:
                    continue
                left, right = x[:, 0].astype(np.float64), x[:, 1].astype(np.float64)
                mid, side = (left + right) * 0.5, (left - right) * 0.5
                mid_rms = float(np.sqrt(np.mean(np.square(mid))))
                side_rms = float(np.sqrt(np.mean(np.square(side))))
                l_rms = float(np.sqrt(np.mean(np.square(left))))
                r_rms = float(np.sqrt(np.mean(np.square(right))))
                denom = math.sqrt(float(np.dot(left, left) * np.dot(right, right)))
                corr = float(np.dot(left, right) / denom) if denom > 1e-20 else 0.0
                stereo_sections.append({'section': i + 1, 'centerSeconds': round(center / rate, 3),
                                        'midRms': mid_rms, 'sideRms': side_rms,
                                        'widthDb': round(20 * math.log10((side_rms + 1e-12) / (mid_rms + 1e-12)), 2),
                                        'lrBalanceDb': round(20 * math.log10((r_rms + 1e-12) / (l_rms + 1e-12)), 2),
                                        'correlation': round(float(np.clip(corr, -1, 1)), 4)})
    flags = []
    key = profile.get('tonality', {})
    if not key.get('key'):
        flags.append({'severity': 'info', 'code': 'tonality-ambiguous', 'text': 'Tonacja nie jest jednoznaczna; materiał może być perkusyjny, atonalny lub wielotonowy.'})
    if stereo_sections:
        min_corr = min(x['correlation'] for x in stereo_sections)
        if min_corr < -0.2:
            flags.append({'severity': 'warning', 'code': 'time-varying-phase', 'text': 'W jednej lub kilku sekcjach ujemna korelacja L/R; sprawdź mono-compatibility.'})
        widths = [x['widthDb'] for x in stereo_sections]
        if max(widths) - min(widths) > 8:
            flags.append({'severity': 'info', 'code': 'stereo-width-change', 'text': 'Szerokość M/S zmienia się wyraźnie między próbkowanymi sekcjami.'})
    if len(section_rows) >= 3:
        levels = [x['rmsDbfs'] for x in section_rows if x['rmsDbfs'] is not None]
        if levels and max(levels) - min(levels) > 12:
            flags.append({'severity': 'info', 'code': 'section-dynamics', 'text': 'Energia sekcji różni się o ponad 12 dB; może to być zamierzone aranżacyjnie.'})
    if not flags:
        flags.append({'severity': 'info', 'code': 'no-obvious-flag', 'text': 'Brak oczywistych anomalii w tych pomiarach; to nie ocenia jakości artystycznej miksu.'})
    return {
        'file': p.name, 'duration': duration, 'tonality': key,
        'adaptiveSegmentCount': len(segments), 'transientCount': profile.get('transientCount', 0),
        'rhythmTempo': profile.get('rhythmTempo', {}), 'sectionDynamics': section_rows,
        'stereoField': {'sections': stereo_sections,
                        'meanWidthDb': round(float(np.mean([x['widthDb'] for x in stereo_sections])), 2) if stereo_sections else None,
                        'meanCorrelation': round(float(np.mean([x['correlation'] for x in stereo_sections])), 4) if stereo_sections else None,
                        'note': 'M/S width and correlation are time-sampled; not a mastering or phase-certification test.'},
        'flags': flags,
        'recommendations': [x['text'] for x in flags],
        'note': 'Local measurements and thresholds only: no LUFS/true-peak, source separation, listening, or generative model.',
    }


def transient_map(path: Path, profile: dict | None = None) -> dict:
    profile = profile or adaptive_fingerprint(path)
    tempo = profile.get('rhythmTempo', {})
    bpm = tempo.get('bpm')
    duration = min(float(profile.get('duration', 0.0)), float(profile.get('adaptiveCoverageSeconds', 0.0)))
    grid = []
    if bpm and 40 <= float(bpm) <= 240 and duration > 0:
        period = 60.0 / float(bpm)
        first = profile.get('transients', [{}])[0].get('time', 0.0) if profile.get('transients') else 0.0
        phase = float(first) % period
        grid = [round(phase + i * period, 4) for i in range(int(max(0.0, duration - phase) / period) + 1)]
    return {'path': Path(path).name, 'bpmSuggestion': tempo, 'transients': profile.get('transients', []),
            'beatGridSeconds': grid[:4000], 'adaptiveSegmentCount': profile.get('adaptiveSegmentCount', 0),
            'method': '20 ms spectral-flux/energy-change peaks; beat grid inherits heuristic tempo and phase',
            'writesProject': False}
