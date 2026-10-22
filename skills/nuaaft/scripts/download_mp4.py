#!/usr/bin/env python3
"""并行分段下载直链 mp4 并合并校验。

用法:
  python3 download_mp4.py <mp4_url> <out_path> [--segments 4] [--rate 1024k]

流程: HEAD 拿 Content-Length -> 按段并行 curl -r -> 校验各段大小 -> cat 合并
-> ffprobe 打印时长(可选)。播放地址带 auth_key 时效, 尽快下载; 中途 403
说明地址过期, 先用 nuaa_api.py refresh <courseId> 换新地址再续跑(会跳过已有部分)。
--rate 传给 curl --limit-rate(如 1024k/2m), 配合 --segments 1 即整条限速。
"""
import concurrent.futures, os, shutil, subprocess, sys, tempfile, urllib.request

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
REFERER = "https://ft.nuaa.edu.cn/"
MAX_RETRY = 3


def head_size(url):
    """curl -sI 拿 Content-Length(有些 CDN HEAD 返回 HTML, 需要过滤)。"""
    for _ in range(3):
        out = subprocess.run(
            ["curl", "-sI", "--max-time", "20", "-H", f"Referer: {REFERER}",
             "-H", f"User-Agent: {UA}", url],
            capture_output=True, text=True).stdout
        for line in out.splitlines():
            if line.lower().startswith("content-length:"):
                return int(line.split(":", 1)[1].strip())
    raise RuntimeError("HEAD failed to get Content-Length")


def dl_range(url, start, end, tmp, seg_i, rate=None):
    out = os.path.join(tmp, f"part_{seg_i}.mp4")
    cmd = ["curl", "-sL", "--max-time", "5400", "--retry", str(MAX_RETRY),
           "-H", f"Referer: {REFERER}", "-H", f"User-Agent: {UA}",
           "-r", f"{start}-{end}", url, "-o", out]
    if rate:
        cmd.insert(2, "--limit-rate")
        cmd.insert(3, rate)
    for _ in range(MAX_RETRY):
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode == 0 and os.path.exists(out) and os.path.getsize(out) == end - start + 1:
            return out
    raise RuntimeError(f"segment {seg_i} failed")


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    url, out_path = sys.argv[1], sys.argv[2]
    nseg = 4
    if "--segments" in sys.argv:
        nseg = int(sys.argv[sys.argv.index("--segments") + 1])
    rate = None
    if "--rate" in sys.argv:
        rate = sys.argv[sys.argv.index("--rate") + 1]

    # out_path 来自 argv: 拒绝上跳目录, 限制在用户主目录或当前目录内
    if ".." in out_path:
        raise SystemExit(f"拒绝包含 .. 的输出路径: {out_path}")
    from pathlib import Path
    out_p = Path(os.path.expanduser(out_path)).resolve()
    out_allowed = [Path.home().resolve(), Path.cwd().resolve()]
    if not any(out_p == d or out_p.is_relative_to(d) for d in out_allowed):
        raise SystemExit(f"输出路径必须在用户主目录或当前目录之下: {out_path}")
    out_path = str(out_p)

    total = head_size(url)
    print(f"Content-Length: {total} bytes (~{total/1048576:.0f} MB)")

    # 已有部分(续跑场景): 检查 out_path 已下载多少
    have = os.path.getsize(out_path) if os.path.exists(out_path) else 0
    if have >= total:
        print("file already complete")
    else:
        seg_size = (total + nseg - 1) // nseg
        tmp = tempfile.mkdtemp(prefix="nuaa-dl-")
        ranges = [(i * seg_size, min((i + 1) * seg_size - 1, total - 1)) for i in range(nseg)]
        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=nseg) as ex:
                futures = [ex.submit(dl_range, url, s, e, tmp, i, rate) for i, (s, e) in enumerate(ranges)]
                for f in concurrent.futures.as_completed(futures):
                    f.result()  # 抛错即失败
            parts = sorted(os.listdir(tmp))
            with open(out_path, "wb") as out:
                for p in parts:
                    with open(os.path.join(tmp, p), "rb") as src:
                        shutil.copyfileobj(src, out)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    final = os.path.getsize(out_path)
    print(f"merged {out_path}: {final} bytes ({final/1048576:.0f} MB) "
          f"| complete: {final == total}")
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=noprint_wrappers=1:nokey=1", out_path],
                         capture_output=True, text=True)
    if dur.returncode == 0:
        secs = float(dur.stdout.strip())
        print(f"duration: {int(secs//60)}:{int(secs%60):02d} "
              f"({secs:.1f}s) | size {final/1048576:.0f} MB")
    else:
        print("ffprobe unavailable/not a media file; size check only")


if __name__ == "__main__":
    main()