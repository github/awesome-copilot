#!/usr/bin/env python3
"""飞天云课堂 API 封装 (使用 qr_login.py 产出的 state 文件里的 jwt)。

用法:
  python3 nuaa_api.py courses [关键词]         # 列出本学期全部课程(找 teclId 用), 支持子串过滤
  python3 nuaa_api.py list <teclId>            # 列出该课堂下的全部录像(id/时间/教师)
  python3 nuaa_api.py url <courseId>           # 取某节课的 mp4 播放地址(带 auth_key)
  python3 nuaa_api.py refresh <courseId>       # 同上(播放地址过期时重新签发)
  python3 nuaa_api.py subtitle <courseId> [out.srt]  # 拉 AI 字幕并转 SRT(无字幕则报错)

state 文件(默认 系统临时目录/nuaa-course-video/state.json): {"jwt": ..., "tenant": ...}
"""
import ipaddress, json, os, re, socket, sys, urllib.parse, urllib.request
from pathlib import Path

BASE = "https://ft.nuaa.edu.cn/jy-application-vod-he"
from nuaa_runtime import STATE_DEFAULT
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
HERE = os.path.dirname(os.path.abspath(__file__))


def load_state(state_path):
    """--state 来自 argv: 拒绝上跳目录, 限制在 /tmp、用户主目录或当前目录内。"""
    if ".." in state_path:
        raise SystemExit(f"拒绝包含 .. 的 state 路径: {state_path}")
    p = Path(os.path.expanduser(state_path)).resolve()
    allowed = [Path(STATE_DEFAULT).parent.resolve(), Path("/tmp").resolve(), Path("/private/tmp"), Path.home().resolve(), Path.cwd().resolve()]
    if not any(p == d or p.is_relative_to(d) for d in allowed):
        raise SystemExit(f"state 路径必须在 /tmp、用户主目录或当前目录之下: {state_path}")
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def _check_id(value, kind="id"):
    """课程/课次 id 都是纯数字; argv 注入在这里统一拦下。"""
    if not re.fullmatch(r"[0-9]{4,15}", str(value)):
        raise SystemExit(f"{kind} 必须是数字 id: {value}")
    return value


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """不跟随重定向: 重定向目标可能绕过协议/主机校验。"""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(_NoRedirect)
_ALLOWED_HOST = "ft.nuaa.edu.cn"


def _guard_url(url):
    """SSRF 防护: 仅 https + 域名白名单; 环回/链路本地/组播/保留地址一律阻断。

    私网(RFC1918)地址放行: 校内 DNS 会把 ft.nuaa.edu.cn 解析到校园网内网地址,
    校外解析为公网地址, 两种情况都属正常访问。"""
    parts = urllib.parse.urlsplit(url)
    if parts.scheme != "https" or parts.hostname != _ALLOWED_HOST:
        raise ValueError(f"unexpected api url: {url}")
    for info in socket.getaddrinfo(parts.hostname, 443, proto=socket.IPPROTO_TCP):
        ip = ipaddress.ip_address(info[4][0])
        if (ip.is_loopback or ip.is_link_local or ip.is_multicast
                or ip.is_reserved or ip.is_unspecified):
            raise ValueError(f"blocked unsafe resolved address: {ip}")


def call(path_qs, state):
    if not path_qs.startswith("/v1/"):  # 只允许本平台 API 路径前缀
        raise ValueError(f"unexpected api path: {path_qs[:60]}")
    url = BASE + path_qs  # BASE 是常量 https 主机
    _guard_url(url)
    req = urllib.request.Request(url, headers={
        "jwt-token": state["jwt"],
        "tenantid": state.get("tenant", "RBAC"),
        "User-Agent": UA,
    })
    with _OPENER.open(req, timeout=30) as r:
        data = json.loads(r.read().decode())
        code = data.get("code")
        if code not in (None, 0, 200, "0", "200") or data.get("success") is False:
            raise RuntimeError(f"平台接口返回失败 (code={code}); 检查登录态或平台状态")
        return data


def cmd_courses(keyword, state, as_json=False):
    """列出本学期的全部课程(点播分组列表), 只知道课名时用它找 teclId。

    课程发现走 /v1/group_subject_vod_list(学生视角"我的课程"分组)。
    注意 /v1/myself/curriculum 是教师侧接口, 学生账号调用返回 500, 别用。"""
    data = call("/v1/group_subject_vod_list?page.pageIndex=1&page.pageSize=1000", state)
    recs = (data.get("data") or {}).get("records") or []
    if not recs and as_json:
        print("[]")
        return
    if not recs:
        print("没有课程记录(登录态可能已失效, 重新扫码)")
        sys.exit(1)
    if keyword:
        kw = keyword.lower()
        recs = [r for r in recs if kw in (r.get("subjName") or "").lower()
                or kw in (r.get("teclName") or "").lower()]
        if not recs and not as_json:
            print(f"没有匹配「{keyword}」的课程; 不带关键词运行 courses 可看本学期全部课程")
            sys.exit(1)
    if as_json:
        print(json.dumps(recs, ensure_ascii=False))
        return
    for r in recs:
        print(f"teclId={r['teclId']} | {r.get('subjName')} | "
              f"{', '.join(r.get('teacNames') or [])} | 班级 {r.get('teclName')} | "
              f"录像 {r.get('courTimes')} 次")


def cmd_list(tecl_id, state, as_json=False):
    tecl_id = _check_id(tecl_id, "teclId")
    qs = (f"/v1/subject_vod_list?page.pageIndex=1&page.pageSize=1000"
          f"&teclIds={tecl_id}%20%20%20%20%20%20"
          f"&page.orders%5B0%5D.asc=true&page.orders%5B0%5D.field=courBeginTime")
    data = call(qs, state)
    records = (data.get("data") or {}).get("records") or []
    if as_json:
        print(json.dumps(records, ensure_ascii=False))
        return
    for r in records:
        print(f"id={r['id']} | {r.get('courBeginTime')} ~ {r.get('courEndTime')} | "
              f"{', '.join(r.get('teacNames') or [])} | "
              f"teclId={r.get('teclId')} | vodStatus={r.get('vodStatus')}")


def cmd_url(course_id, state):
    from nuaa_runtime import ensure_dependencies
    ensure_dependencies(["Crypto"])
    from nuaa_aes import encrypt_quoted
    course_id = _check_id(course_id, "courseId")
    qs = f"/v1/course_vod_urls?courseId={encrypt_quoted(str(course_id))}"
    data = call(qs, state)
    info = data.get("data") or {}
    views = info.get("courseVodViewList") or []
    if not views:
        print("no playable url; response:", json.dumps(data, ensure_ascii=False)[:300])
        return
    print(f"course: {info.get('courName')} | {info.get('tecName')} | "
          f"{info.get('classRoomName')} | vodDownloadEnable={info.get('vodDownloadEnable')}")
    for v in views:
        print(v["url"])


def _ms_to_srt_ts(ms):
    h, rem = divmod(int(ms), 3600000)
    m, rem = divmod(rem, 60000)
    s, ms2 = divmod(rem, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms2:03d}"


def _safe_out_path(course_id, out_path):
    """规范化并校验输出路径(本机 CLI, 但限制在用户目录内)。

    - 默认文件名剥离路径分隔符(course_id 来自 argv);
    - 原始输入显式拒绝上跳目录片段;
    - 最终路径必须位于用户主目录或当前工作目录之下。"""
    cid = re.sub(r"[^0-9A-Za-z_-]", "_", str(course_id))
    if not out_path:
        return os.path.abspath(f"{cid}.srt")
    if ".." in out_path:
        raise SystemExit(f"拒绝包含 .. 的输出路径: {out_path}")
    allowed = [os.path.expanduser("~"), os.getcwd()]
    p = os.path.abspath(os.path.expanduser(out_path))
    if not any(p == d or p.startswith(d.rstrip(os.sep) + os.sep) for d in allowed):
        raise SystemExit(f"输出路径必须在用户主目录或当前目录之下: {out_path}")
    return p


def cmd_subtitle(course_id, state, out_path=None):
    """拉取 AI 字幕(条目: bg/ed 毫秒时间轴 + res 文本)并转成 SRT。

    平台未生成字幕时接口返回 data:[](空), 此时打印提示并以退出码 1 结束。"""
    course_id = _check_id(course_id, "courseId")
    data = call(f"/v1/course_vod_subtitle?courseId={course_id}", state)
    entries = data.get("data") or []
    if not entries:
        print(f"courseId {course_id}: 平台上还没有字幕数据 (AI 转写可能未生成), "
              f"可过几天重试")
        sys.exit(1)
    entries.sort(key=lambda e: e.get("bg", 0))
    out_path = _safe_out_path(course_id, out_path)
    with open(out_path, "w", encoding="utf-8-sig") as f:
        for i, e in enumerate(entries, 1):
            f.write(f"{i}\n{_ms_to_srt_ts(e['bg'])} --> {_ms_to_srt_ts(e['ed'])}\n"
                    f"{e.get('res', '').strip()}\n\n")
    span = (entries[-1]["ed"] - entries[0]["bg"]) / 60000
    print(f"courseId {course_id}: {len(entries)} 条字幕 -> {out_path} "
          f"(覆盖约 {span:.0f} 分钟)")


def main():
    import argparse
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("courses", "list", "url", "refresh", "subtitle"):
        command = sub.add_parser(name)
        command.add_argument("value", nargs="?" if name == "courses" else None,
                             default="" if name == "courses" else None)
        command.add_argument("--state", default=STATE_DEFAULT)
        if name in ("courses", "list"):
            command.add_argument("--json", action="store_true")
        if name == "subtitle":
            command.add_argument("output", nargs="?")
    args = parser.parse_args()
    state = load_state(args.state)
    if args.command == "courses":
        cmd_courses(args.value, state, args.json)
    elif args.command == "list":
        cmd_list(args.value, state, args.json)
    elif args.command == "subtitle":
        cmd_subtitle(args.value, state, args.output)
    else:
        cmd_url(args.value, state)


if __name__ == "__main__":
    main()
