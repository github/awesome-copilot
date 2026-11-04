---
name: caption-qa
description: 'Check SRT or WebVTT captions and subtitles against published standards (Netflix English, BBC subtitle guidelines, DCMP Captioning Key) for reading speed, line length, line count, time on screen, gaps and overlaps, then fix failures by retiming before rewording. Use when asked to QA, lint or validate captions, check whether subtitles read too fast, prepare captions for Netflix, broadcast or educational delivery, or add a caption check to CI.'
license: MIT
---

# Caption QA

Captions fail delivery and accessibility review on numbers: characters a second, characters a line, time on screen and the gap between captions. Each standard publishes its own limits, and they differ, so "are these captions OK?" has no answer until you know where they are going. This skill picks the right set of limits, measures every cue the same way the published limits are written, and fixes failures without cutting the speaker's words.

## When to Use This Skill

- The user has an `.srt` or `.vtt` file and asks whether it is ready to ship, or why a platform rejected it.
- The user asks whether captions or subtitles read too fast, or have lines that are too long.
- Captions are headed for Netflix, a broadcaster, or US educational media, and must meet that spec.
- The user wants caption checks in CI so a bad file fails the build.

## Pick the Standard

If the user names no target, use Netflix English (adult) and say that you did.

| Standard | Reading speed | Line length | Lines | Time on screen | Gap between captions |
|---|---|---|---|---|---|
| Netflix English, adult | 20 characters a second | 42 characters | 2 | 5/6 s to 7 s | At least 2 frames; close gaps under 0.5 s to 2 frames |
| Netflix English, children's | 17 characters a second | 42 characters | 2 | 5/6 s to 7 s | Same as adult |
| BBC subtitle guidelines | 160-180 words a minute; aim for about 0.3 s a word | 37 characters (broadcast); online, 68% of the width of a 16:9 frame | 2 | - | If you leave a gap, at least 1 s, preferably 1.5 s |
| DCMP Captioning Key (US educational media) | 130 / 140 / 160 words a minute for lower / middle / upper level | - | 2 (preferred) | 40 frames (1 s 10 frames) to 6 s | - |

Sources: [Netflix English (USA) Timed Text Style Guide](https://partnerhelp.netflixstudios.com/hc/en-us/articles/217350977-English-USA-Timed-Text-Style-Guide), [Netflix subtitle timing guidelines](https://partnerhelp.netflixstudios.com/hc/en-us/articles/360051554394-Timed-Text-Style-Guide-Subtitle-Timing-Guidelines), [BBC subtitle guidelines](https://www.bbc.co.uk/accessibility/forproducts/guides/subtitles/), [DCMP Captioning Key: text](https://dcmp.org/learn/597-captioning-key---text) and [presentation rate](https://dcmp.org/learn/601-captioning-key---presentation-rate). The BBC's per-word time and minimum gap are guidance, so report them as suggestions, not failures.

## Measure Every Cue the Same Way

- **Characters** are letters, digits, spaces and punctuation in the displayed text. Don't count line breaks, formatting tags (`<i>`, `<b>`, `{\an8}`) or the cue number.
- **Reading speed** is characters divided by duration (out-time minus in-time), in seconds.
- **Words a minute** is words divided by duration, times 60. A word is a run of characters that holds a letter or a digit, so a lone dash isn't one.
- **Gap** runs from one cue's out-time to the next cue's in-time. Frame limits depend on the frame rate: 2 frames is 0.083 s at 24 fps but 0.067 s at 30 fps. Ask for the frame rate, or state that you assumed 24 fps.
- **Overlap**: a cue that ends after the next one starts is always a failure, under every standard.
- Read both timestamp forms: `00:00:01,000` (SRT) and `00:00:01.000` or `01.000` (WebVTT). Skip WebVTT `NOTE`, `STYLE` and `REGION` blocks, and treat cue settings after the timestamps (`align:start`) as part of the timing line.

## Workflow

1. **Find the target** (platform, broadcaster or audience level) and pick the standard from the table.
2. **Measure every cue**, or run the command-line check below and read its output.
3. **Report** with a count line first ("212 of 240 captions meet Netflix English, adult"). Then group failures by rule, with cue numbers and timecodes. Show the first few cues of each kind instead of hundreds of lines.
4. **Fix, keeping the words**, in this order:
   1. Extend the out-time into the following gap, keeping the minimum gap.
   2. Start the cue earlier if the previous cue ends well before it.
   3. Split a long cue into two at a phrase boundary, each one meeting the minimum time on screen.
   4. Merge a flash cue (under the minimum time) into its neighbor.
   5. Re-break lines: break after punctuation or before a conjunction or preposition, and keep an article with its noun and a first name with a last name.
   6. Edit the wording only when the user asks for edited (not verbatim) captions.
5. **Measure again** after fixing. A retime can create a new overlap or a gap under the minimum.

## Reference Check Script

When the user wants a repeatable check (a folder of files, or CI), write this script, or adapt it to the chosen standard. It applies the Netflix adult limits from the table, prints each failing caption and exits with 1 when any caption fails, so it can gate a build. It needs only Python 3.

```python
import re
import sys

# Netflix English, adult programs. Change these for another standard.
LIMITS = {"cps": 20, "cpl": 42, "lines": 2, "min_s": 5 / 6, "max_s": 7, "gap_frames": 2}
FPS = 24
T = r"(?:(\d+):)?(\d{1,2}):(\d{1,2})[,.](\d{1,3})"
TIMING = re.compile(T + r"\s*-->\s*" + T)
TAGS = re.compile(r"<[^>]+>|\{\\[^}]*\}")


def seconds(h, m, s, ms):
    return int(h or 0) * 3600 + int(m) * 60 + int(s) + int((ms + "00")[:3]) / 1000


def read_cues(path):
    text = open(path, encoding="utf-8-sig").read().replace("\r\n", "\n")
    for block in re.split(r"\n[ \t]*\n", text):
        lines = block.strip().split("\n")
        for i, line in enumerate(lines[:3]):
            m = TIMING.search(line)
            if m:
                body = [TAGS.sub("", t).rstrip() for t in lines[i + 1:]]
                g = m.groups()
                yield seconds(*g[:4]), seconds(*g[4:]), [t for t in body if t.strip()]
                break


def check(path, lim=LIMITS, fps=FPS):
    cues, failed = list(read_cues(path)), 0
    for n, (start, end, text) in enumerate(cues, 1):
        dur, chars, issues = end - start, sum(len(t) for t in text), []
        if dur > 0 and chars / dur > lim["cps"]:
            issues.append(f"{chars / dur:.1f} characters a second")
        issues += [f"line {j} is {len(t)} characters"
                   for j, t in enumerate(text, 1) if len(t) > lim["cpl"]]
        if len(text) > lim["lines"]:
            issues.append(f"{len(text)} lines")
        if dur < lim["min_s"] or dur > lim["max_s"]:
            issues.append(f"on screen {dur:.2f} s")
        if n < len(cues):
            gap = cues[n][0] - end
            if gap < 0:
                issues.append(f"overlaps the next caption by {-gap:.2f} s")
            elif gap * fps < lim["gap_frames"] - 0.01:
                issues.append(f"gap of {gap * fps:.0f} frames at {fps} fps")
        if issues:
            failed += 1
            print(f"{path} #{n} {start:.3f} -> {end:.3f}: " + "; ".join(issues))
    print(f"{path}: {len(cues) - failed} of {len(cues)} captions pass")
    return failed == 0


if __name__ == "__main__":
    results = [check(p) for p in sys.argv[1:]]
    sys.exit(0 if results and all(results) else 1)
```

Run it as `python3 check_captions.py captions/*.srt`. For another standard, change `LIMITS`, and add a words-a-minute check (words divided by duration, times 60) for the BBC and DCMP. The script doesn't check the advice-level rules (chaining short gaps, the BBC's per-word time); report those separately.

In GitHub Actions:

```yaml
- run: python3 check_captions.py captions/*.srt
```

## Gotchas

- Meeting these numbers doesn't certify a file. Netflix and broadcasters also review style: italics, speaker labels, sound descriptions and position.
- The limits were read from each standard's own page in October 2026. Check the source before quoting a limit as current.
- Only SRT and WebVTT are covered. Convert ASS first with `ffmpeg -i subs.ass subs.srt`, which keeps the timing and wraps the text in font tags that the character count ignores.
