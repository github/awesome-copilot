# Cross-Platform Comparison: Xiaohongshu, Douyin, Bilibili, Weibo

> **Consolidated from 20 research files across 5 sources (GitHub, Clawhub, Glama/Smithery, PyPI, npm)**
> **Date**: 2026-08-05

---

## 1. Platform-at-a-Glance

| Platform | Best Overall Method | Runner-Up | Official API Available? | Legal Risk (Aggressive) | Active Maintenance |
|----------|---------------------|-----------|------------------------|-------------------------|-------------------|
| **Xiaohongshu** | MediaCrawler (GitHub, ~30k★) | ReaJason/xhs (TS/PyPI) | ❌ No public API | High (account-ban explicit) | ✅ High (2025-2026) |
| **Douyin** | hhy5562877/douyin_mcp (GitHub, off-registry) | Evil0ctal/Douyin_API (13.5k★) | ✅ `douyin-api` (PyPI, gated) | High (X-Bogus rotation) | ⚠️ Mixed (best off-registry) |
| **Bilibili** | Iseenope/bilibili-mcp-server (Glama, 31 tools) | SMYB5431/bilibili-api-mcp-server (collections) | ❌ Canonical repos C&D'd | **Critical** (2026 lawyer letters) | ✅ High (multiple active) |
| **Weibo** | Python3WebSpider/WeiboCrawler (GitHub) | weibo-mcp (npm, official OpenAPI) | ✅ `weibo-mcp` (OAuth2, gated) | Medium (cookie rotation) | ⚠️ PyPI stale (2021), GitHub/npm active |

---

## 2. PRD Coverage Comparison

| PRD Field Group | Xiaohongshu | Douyin | Bilibili | Weibo |
|-----------------|-------------|--------|----------|-------|
| **Profile** | | | | |
| account_id | ✅ red_id | ✅ sec_uid | ✅ UID (mid) | ✅ UID |
| account_name | ✅ | ✅ | ✅ | ✅ |
| bio | ✅ | ✅ | ✅ (sign) | ✅ |
| verified | ✅ | ✅ | ✅ (official_verify) | ✅ |
| followers | ✅ | ✅ | ✅ | ✅ |
| following | ✅ | ✅ | ✅ | ✅ |
| post_count | ✅ | ✅ (aweme_count) | ✅ (archive_count) | ✅ (statuses_count) |
| platform_specific | red_id, likes_and_favorites | sec_uid, unique_id, douyin_id, total_likes | level, coins | gender, location, birthday |
| **Post** | | | | |
| post_id | ✅ note_id | ✅ aweme_id | ✅ BV/AV号 | ✅ mid |
| post_url | ✅ | ✅ /video/<id> | ✅ | ⚠️ construct |
| title | ✅ | ✅ (desc) | ✅ | ❌ |
| content_type | ✅ | ✅ | ✅ (video/dynamic/article/live) | ✅ (detect) |
| published_at | ✅ | ✅ (+08:00 conv needed) | ✅ (pubdate +08:00) | ✅ (+08:00 conv needed) |
| text | ✅ | ✅ | ✅ (desc) | ✅ (HTML-stripped) |
| hashtags | ✅ | ✅ | ✅ (tags) | ⚠️ parse from HTML |
| is_pinned | ⚠️ | ✅ | ⚠️ (dynamic_type) | ⚠️ heuristic |
| is_repost | ❌ | ✅ | ⚠️ (orig_type) | ✅ (retweeted_status) |
| is_promoted | ❌ | ✅ | ❌ | ❌ |
| collection/series | ❌ | ❌ | ✅ (season_id, ugc_season) | ❌ |
| **Metrics** | | | | |
| views | ❌ (gated) | ✅ (play_count) | ✅ | ❌ |
| likes | ✅ | ✅ (digg_count) | ✅ | ✅ (attitudes_count) |
| comments | ✅ | ✅ | ✅ (reply) | ✅ |
| shares | ✅ | ✅ | ❌ | ✅ (reposts_count) |
| favorites | ✅ | ✅ (collect_count) | ✅ (favorite) | ✅ (null per PRD) |
| coins | ❌ | ❌ | ❌ (in stat, not surfaced) | ❌ |
| danmaku | ❌ | ❌ | ✅ | ❌ |

**Legend**: ✅ Full | ⚠️ Partial/Derivable | ❌ Missing

---

## 3. Identity Resolution (Nickname → Platform ID)

| Platform | PRD Requirement | Best Available | Gap |
|----------|-----------------|----------------|-----|
| **Xiaohongshu** | `nickname` → `red_id` | MediaCrawler search / ReaJason search | No first-class resolver; all tools need red_id upfront |
| **Douyin** | `nickname` → `sec_uid` | hhy5562877 `get_user_info` needs sec_uid; @ethanchen/tikhub-client resolves | **Critical**: No OSS package wraps 302 redirect `v.douyin.com/<short>` → sec_uid |
| **Bilibili** | `space.bilibili.com/<uid>` → numeric UID | All tools accept numeric UID directly | Trivial: regex extract UID from URL; no string-input tool |
| **Weibo** | `weibo.com/<name>` → SSR → `weibo.com/u/<uid>` → domain match | Python3WebSpider container pairing (implicit); @hkai-ai `searchForUserUID()` | No explicit SSR + profile/info domain match validation |

---

## 4. Aggressiveness Spectrum

| Level | Xiaohongshu | Douyin | Bilibili | Weibo |
|-------|-------------|--------|----------|-------|
| **None (Public API)** | — | douyin-api (official) | bili-api (npm, public only) | weibo-mcp (official OpenAPI) |
| **Low (Cookie + Public Endpoints)** | — | — | bili-dl (PyPI, yt-dlp) | dataabc/weibo-crawler (browse mode) |
| **Medium (Cookie + Private Endpoints)** | ReaJason/xhs (X-s/X-t) | Evil0ctal (X-Bogus.js) | bilibili-api-python (WBI internal) | @hkai-ai/weibo-api (m.weibo.cn AJAX) |
| **High (Browser Automation / CDP)** | MediaCrawler (CDP, monkey-patch) | bigdong89 (Playwright fallback) | Iseenope/adoresever (QR + write tools) | Python3WebSpider (PWA headers, containerid) |
| **Very High (Distributed / Proxy Pool)** | MediaCrawler (proxy pool) | Evil0ctal (cookie sniffer) | — | nghuyong/WeiboSpider (master: IP pool + Redis) |

---

## 5. Registry Presence (MCP/Package Managers)

| Registry | Xiaohongshu | Douyin | Bilibili | Weibo |
|----------|-------------|--------|----------|-------|
| **Glama (MCP)** | ❌ 0 servers | 1 (downloader only) | **14 servers** (rich ecosystem) | ❌ 0 servers |
| **Smithery (MCP)** | ❌ 0 | ❌ 0 | ❌ 0 (all 404) | 3 (low confidence) |
| **PyPI** | 1 (`xhs`, ReaJason) | 5 (1 official, 1 TikTok global) | **6** (3 high-quality) | 5 (all stale 2021 except 0) |
| **npm** | ❌ 0 | **15** (1 commercial, 1 official) | **7** (3 high-quality) | **6** (1 official, 2 TS libs) |
| **Clawhub** | 2 (1 publisher, 1 ghost) | ❌ 0 verifiable | 1 (subtitle only) | 2 (1 scraper, 1 publisher) |
| **GitHub** | **8+ repos** (3 top-tier) | **12+ repos** (3 top-tier) | **9+ repos** (2 archived canonical) | **8+ repos** (3 top-tier) |

---

## 6. Legal & Sustainability Risk

| Platform | Canonical Repo Status | Legal Actions (2026) | Recommended Posture |
|----------|----------------------|---------------------|---------------------|
| **Xiaohongshu** | Active (MediaCrawler, ReaJason) | None public | Aggressive OK per PRD; expect account bans; rotate cookies/proxies |
| **Douyin** | Active (Evil0ctal, bigdong89) | None public | Private API signing breaks frequently; commercial API (TikHub) safer for prod |
| **Bilibili** | **SocialSisterYi (20.2k★) C&D 2026-01**; **Nemo2011 (4.2k★) C&D 2026-07** | 2 lawyer letters (上海市弘安律师事务所) citing "reverse-engineering non-public APIs, auth, paywall, danmaku deanonymization" | **High risk**: Prefer cookie-based narrow collectors; avoid distributed multi-account; legal review advised |
| **Weibo** | Active (Python3WebSpider, nghuyong) | OpenAPI v2 deprecated 2020; no recent C&D | Medium risk: cookie rotation sustainable; official OpenAPI (weibo-mcp) only legal path |

---

## 7. Timezone & Data Normalization Gaps

| Platform | Native Timestamp Format | PRD Requirement | Normalization Needed |
|----------|------------------------|-----------------|---------------------|
| **Xiaohongshu** | ISO-like (create_time) | ISO-8601 +08:00 | Minor (verify offset) |
| **Douyin** | Unix epoch (UTC) | ISO-8601 +08:00 | **Required**: +8 hours, format conversion |
| **Bilibili** | Unix epoch (CST, +08:00) | ISO-8601 +08:00 | **Required**: format conversion (already correct offset) |
| **Weibo** | Localized string "Wed Aug 05 09:09 +0800 2026" | ISO-8601 +08:00 | **Required**: parse → ISO with explicit offset |

---

## 8. Recommended Stack by Use Case

| Use Case | Xiaohongshu | Douyin | Bilibili | Weibo |
|----------|-------------|--------|----------|-------|
| **AI-Agent / MCP** | xpzouying/xiaohongshu-mcp (Docker) | hhy5562877/douyin_mcp (self-host → submit Glama) | Iseenope/bilibili-mcp-server (Glama) | @mseep/mcp-server-weibo (npm) |
| **Production Python Pipeline** | PyPI `xhs` + cookie rotation | Evil0ctal/Douyin_API (Docker) | bilibili-api-python (PyPI) | Python3WebSpider/WeiboCrawler |
| **CLI / Scheduled Jobs** | ReaJason/xhs CLI | bigdong89/Douyin-Downloader | bilibili-cli (PyPI) | dataabc/weibo-crawler |
| **TypeScript/Node** | ReaJason/xhs (TS) | @ethanchen/tikhub-client (commercial) | @renmu/bili-api (GPL) | @hkai-ai/weibo-api |
| **Legal/Compliance** | ❌ None | `douyin-api` (PyPI, ByteDance approval) | ❌ None (canonical dead) | weibo-mcp (npm, Weibo OpenAPI approval) |
| **Zero-Auth Public Data** | ❌ None | ❌ None | bili-api (npm) | dataabc/weibo-crawler (browse mode) |
| **Multi-Platform (Single Tool)** | — | @ethanchen/tikhub-client (XHS+Douyin+Weibo+TikTok) | — | @ethanchen/tikhub-client |

---

## 9. Critical Gaps Requiring Custom Development

| Gap | Platforms Affected | Effort | Priority |
|-----|-------------------|--------|----------|
| **Nickname → Platform ID resolver** | Xiaohongshu (red_id), Douyin (sec_uid), Weibo (UID) | Medium (scrape search/redirect) | **Critical** — PRD requirement |
| **Views field for Xiaohongshu/Weibo** | Xiaohongshu (gated), Weibo (hidden) | Low (accept null) | **Critical** — PRD nullable |
| **SSR + domain match validation** | Weibo | Medium (implement PRD identity binding) | **High** |
| **+08:00 timezone normalization** | Douyin, Bilibili, Weibo | Low (wrapper function) | **High** |
| **hashtag extraction from HTML** | Weibo, Xiaohongshu (partial) | Low (regex/parser) | **Medium** |
| **is_promoted / is_pinned detection** | All (partial) | Medium (heuristic per platform) | **Medium** |
| **Cookie rotation / session management** | All unofficial | Medium (headless login + pool) | **High** |
| **Bilibili coins/shares exposure** | Bilibili | Low (extend tool output) | **Medium** |
| **Collection/series (合集) support** | Bilibili only | Use SMYB5431 server | **Low** (platform-specific) |

---

## 10. Decision Matrix: Choose Your Stack

```
IF legal/compliance mandatory:
  → Xiaohongshu: NO OPTION
  → Douyin: douyin-api (PyPI) + ByteDance approval
  → Bilibili: NO OPTION (canonical C&D'd)
  → Weibo: weibo-mcp (npm) + Weibo OpenAPI approval

ELSE IF AI-agent / MCP workflow:
  → Xiaohongshu: xpzouying/xiaohongshu-mcp
  → Douyin: hhy5562877/douyin_mcp (submit to Glama first)
  → Bilibili: Iseenope/bilibili-mcp-server (Glama)
  → Weibo: @mseep/mcp-server-weibo (npm)

ELSE IF Python production pipeline:
  → Xiaohongshu: PyPI `xhs` (ReaJason)
  → Douyin: Evil0ctal/Douyin_API (Docker)
  → Bilibili: bilibili-api-python (PyPI)
  → Weibo: Python3WebSpider/WeiboCrawler

ELSE IF TypeScript/Node:
  → Xiaohongshu: ReaJason/xhs
  → Douyin: @ethanchen/tikhub-client (paid) or @sparanoid/eop-extractor-douyin
  → Bilibili: @renmu/bili-api (GPL) or bili-api (public only)
  → Weibo: @hkai-ai/weibo-api

ELSE IF one-off / low volume:
  → Xiaohongshu: MediaCrawler (--type creator)
  → Douyin: bigdong89/Douyin-Downloader
  → Bilibili: bili-api (npm, zero auth)
  → Weibo: dataabc/weibo-crawler

ELSE IF multi-platform single vendor:
  → @ethanchen/tikhub-client (npm) — covers XHS, Douyin, Weibo, TikTok global
```

---

## 11. Source File Index

| Platform | GitHub | Clawhub | Glama | PyPI | npm |
|----------|--------|---------|-------|------|-----|
| Xiaohongshu | `github/xiaohongshu.md` | `clawhub/xiaohongshu.md` | (none) | `pypi/xiaohongshu.md` | (none) |
| Douyin | `github/douyin.md` | `clawhub/douyin.md` | `glama/douyin.md` | `pypi/douyin.md` | `npm/douyin.md` |
| Bilibili | `github/bilibili.md` | `clawhub/bilibili.md` | `glama/bilibili.md` | `pypi/bilibili.md` | `npm/bilibili.md` |
| Weibo | `github/weibo.md` | `clawhub/weibo.md` | `glama/weibo.md` | `pypi/weibo.md` | `npm/weibo.md` |

**Research workspace**: `/Users/jack/Documents/public-social-account-analyzer-workspace/research-output/`
**Output references**: `/Users/jack/Documents/public-social-account-analyzer/docs/research/platform-methods/{xiaohongshu,douyin,bilibili,weibo}.md`
**This file**: `/Users/jack/Documents/public-social-account-analyzer/skill/references/PLATFORM_COMPARISON.md`