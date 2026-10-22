#!/usr/bin/env python3
"""飞天云课堂 (ft.nuaa.edu.cn) 统一身份认证扫码登录。

启动一个全新的无头 Chrome(独立临时配置,与用户的 Chrome 互不影响),
打开目标页面 -> 被重定向到统一身份认证登录页 -> 通过后端接口生成二维码
(保存到 系统临时目录/nuaa-course-video/qr.png, 默认不弹窗) -> 轮询扫码状态 -> 确认后页面内提交表单
完成登录 -> 读出 sessionStorage 中的 jwt/tenant 写入 state 文件。

用法:
  python3 qr_login.py <video_page_url> [--state <json_path>] [--keep] [--open]

要点(踩坑记录):
- 页面前端代码的 getQrCode() 可能因 QR_LOGIN_ENABLED 关闭而不工作,
  必须直接调后端接口: /authserver/qrCode/getToken -> getCode -> getStatus.htl
- 二维码必须校验 PNG 魔数再展示, 否则可能把 HTML 占位页当二维码给用户
- 二维码默认不弹窗(只打印路径, 供对话内展示); 独立终端需要弹出时加 --open
- 登录提交必须在浏览器页面会话内完成(form.submit()), 用 curl 单独 POST 会失败
- 登录成功后 sessionStorage 键: jy-application-vod-he-ui_STORAGE_KEY_JWT_TOKEN
                            与 jy-application-vod-he-ui_STORAGE_KEY_TENANT_ID
"""
import asyncio, json, os, signal, socket, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

from nuaa_runtime import STATE_DEFAULT, QR_PNG, LOGIN_LOG, SESSION_DIR, chrome_binary, ensure_dependencies
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")


def free_port():
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def is_png(path):
    try:
        with open(path, "rb") as f:
            return f.read(8) == b"\x89PNG\r\n\x1a\n"
    except OSError:
        return False


def show_qr(path):
    """默认只打印二维码路径(供对话内/ZCode 内联展示), 不弹任何窗口;

    显式传 --open 时, macOS 才经 Preview 弹出(独立终端场景可选)。
    历史参数 --no-open 仍接受, 行为与默认一致, 已有调用不受影响。"""
    if "--open" in sys.argv and sys.platform == "darwin":
        subprocess.run(["open", path])
    else:
        print("QR_PNG_PATH=" + path)


async def cdp_eval(ws, n, expr):
    await ws.send(json.dumps({"id": n, "method": "Runtime.evaluate",
                              "params": {"expression": expr, "returnByValue": True}}))
    while True:
        msg = json.loads(await ws.recv())
        if msg.get("id") == n:
            return msg.get("result", {}).get("result", {}).get("value")


async def wait_for_target(port, timeout=90):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            targets = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{port}/json/list",
                                                        timeout=3).read())
            pages = [t for t in targets if t["type"] == "page"]
            # 只认 http(s) 页面: 机器上若装过浏览器扩展, 扩展的后台页
            # (chrome-extension://...) 可能先于目标标签页出现, 附着上去
            # 就会永远等不到 SSO 跳转。必须按 URL 挑课程标签页。
            good = [t for t in pages if t["url"].startswith(("http://", "https://"))]
            if good:
                return good
            if pages:
                return [t for t in pages if not t["url"].startswith("chrome://")] or pages
        except Exception:
            pass
        await asyncio.sleep(1)
    raise RuntimeError("CDP target not available in time")


async def qr_loop(ws):
    """生成二维码(curl 直连后端) -> 展示 -> 轮询, 直到用户扫码确认。

    令牌/图片/状态接口一律走 curl(无会话即可用, 实测可靠);
    页面内 fetch 会被登录页 JS 补丁干扰返回 {}, 不要用。
    只有最后的登录提交必须在页面会话内完成(form.submit())。"""
    counter = [1]

    async def ev(expr):
        r = await cdp_eval(ws, counter[0], expr)
        counter[0] += 1
        return r

    def curl_get(path):
        url = "https://authserver.nuaa.edu.cn" + path
        return subprocess.run(["curl", "-s", "--max-time", "10", url],
                              capture_output=True, text=True).stdout

    async def new_qr():
        token = curl_get(f"/authserver/qrCode/getToken?ts={int(time.time()*1000)}")
        if not token or token.startswith("{"):
            raise RuntimeError("getToken failed: " + str(token)[:100])
        qr_png = Path(QR_PNG).resolve()  # 常量路径, 仍显式限制在系统临时目录内
        if not any(qr_png == d or qr_png.is_relative_to(d)
                   for d in (SESSION_DIR.resolve(),)):
            raise RuntimeError(f"unexpected qr path: {qr_png}")
        with open(qr_png, "wb") as f:
            subprocess.run(["curl", "-s", "--max-time", "15",
                            f"https://authserver.nuaa.edu.cn/authserver/qrCode/getCode?uuid={token}"],
                           stdout=f)
        if not is_png(QR_PNG):
            raise RuntimeError("QR endpoint returned non-PNG (likely an HTML page); refresh and retry")
        show_qr(QR_PNG)
        print("QR generated. Scan the displayed image and confirm on your phone.")
        return token

    # 生成二维码(页面可能已经带着未过期 token, 直接重新取一个最稳)
    token = await new_qr()
    last_status = None
    while True:
        await asyncio.sleep(2)
        st = curl_get(f"/authserver/qrCode/getStatus.htl?ts={int(time.time()*1000)}&uuid={token}")
        if st != last_status:
            print("scan status:", st)
            last_status = st
        if st == "3":  # 过期
            token = await new_qr()
            last_status = None
        elif st == "1":  # 已确认, 刷新登录页拿新 execution 后立刻提交
            # 关键: 登录页若开了太久, CAS 的 execution 会话过期, 提交会被弹回。
            # 实测确认后的 uuid 在几分钟内仍有效, 所以先 location.reload()
            # 拿全新会话, 再写入 uuid 并提交, 全程控制在几秒内。
            for attempt in range(2):
                try:
                    await ev("location.reload()")
                except Exception:
                    pass  # reload 期间执行上下文会销毁, 忽略
                form_ok = False
                for _ in range(15):
                    await asyncio.sleep(1)
                    try:
                        if await ev("!!document.getElementById('qrLoginForm')"):
                            form_ok = True
                            break
                    except Exception:
                        continue  # 页面跳转中, 下次再查
                if not form_ok:
                    raise RuntimeError("qrLoginForm not found after reload")
                ok = await ev(f"""(() => {{
                  const inp = document.getElementById('uuid');
                  if (!inp) return false;
                  inp.value = '{token}';
                  document.getElementById('qrLoginForm').submit();
                  return true;
                }})()""")
                if not ok:
                    raise RuntimeError("uuid input missing at submit")
                print("confirmed, login form submitted (attempt %d)" % (attempt + 1))
                # 等跳转: 落到 ft.nuaa 即成功; 还停在 authserver 说明被弹回, 重试一次
                landed = False
                for _ in range(20):
                    await asyncio.sleep(2)
                    try:
                        href = await ev("location.href") or ""
                    except Exception:
                        continue
                    if "ft.nuaa.edu.cn" in href:
                        landed = True
                        break
                    if "authserver" not in href:
                        break
                if landed:
                    return True
                print("submit bounced back, retrying with fresh page...")
            raise RuntimeError("login submit bounced twice; QR token likely expired, restart the skill")


async def main():
    sys.stdout.reconfigure(line_buffering=True, encoding="utf-8")  # 后台运行时日志实时可见
    import argparse
    parser = argparse.ArgumentParser(description="飞天云课堂扫码登录")
    parser.add_argument("target", nargs="?", default="https://ft.nuaa.edu.cn/jy-application-vod-he-ui/")
    parser.add_argument("--state", default=STATE_DEFAULT)
    parser.add_argument("--open", action="store_true")
    parser.add_argument("--keep", action="store_true")
    parser.add_argument("--no-open", action="store_true", help=argparse.SUPPRESS)
    args = parser.parse_args()
    from urllib.parse import urlsplit
    target = args.target
    parts = urlsplit(target)
    if parts.scheme != "https" or parts.hostname != "ft.nuaa.edu.cn":
        parser.error("target must be an https://ft.nuaa.edu.cn/ URL")
    state_path, keep = args.state, args.keep
    ensure_dependencies(["websockets"])
    global websockets
    import websockets
    SESSION_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    chrome_path = chrome_binary()
    prof = tempfile.mkdtemp(prefix="nuaa-skill-prof-")
    port = free_port()
    logf = open(LOGIN_LOG, "a", encoding="utf-8")
    chrome = subprocess.Popen(
        [chrome_path, f"--user-data-dir={prof}", "--headless=new", "--disable-gpu",
         "--no-first-run", "--no-default-browser-check",
         f"--remote-debugging-port={port}", f"--user-agent={UA}", target],
        stdout=logf, stderr=logf, start_new_session=True)
    print(f"headless chrome pid={chrome.pid} port={port}")

    try:
        pages = await wait_for_target(port)
        page = pages[0]
        ws = await websockets.connect(page["webSocketDebuggerUrl"], max_size=80 * 1024 * 1024)
        ii = [1]

        async def ev(expr):
            r = await cdp_eval(ws, ii[0], expr)
            ii[0] += 1
            return r

        # 等待页面跳转: SPA 先加载自身框架, 随后才会重定向到统一身份认证。
        # 不能在 href 一出现 ft.nuaa.edu.cn 就判定已登录——目标 URL 本身就是
        # ft.nuaa.domain, 首帧必然匹配。必须等够窗口期, 确认它"没有"跳登录页。
        href = ""
        redirected_to_sso = False
        for _ in range(25):
            await asyncio.sleep(1)
            href = await ev("location.href") or ""
            if "authserver.nuaa.edu.cn" in href:
                redirected_to_sso = True
                break
        if not redirected_to_sso:
            # 25 秒内从未出现登录页: 视为已持有会话(如复用带登录态复用的场景),
            # 但仍校验 jwt, 缺失则报错要求扫码。
            print("no SSO redirect; assuming existing session")
        else:
            print("redirected to SSO")
            await qr_loop(ws)
            # 登录提交后等 SPA 跳回
            for _ in range(60):
                await asyncio.sleep(2)
                href = await ev("location.href") or ""
                if "ft.nuaa.edu.cn" in href:
                    break
            print("login navigation finished")
            if "ft.nuaa.edu.cn" not in href:
                raise RuntimeError("login did not land on ft.nuaa.edu.cn")

        # 等 SPA 完成初始化并写入 sessionStorage(轮询至多 20s)
        tokens = None
        for _ in range(10):
            await asyncio.sleep(2)
            tokens = await ev("""JSON.stringify({
              jwt: sessionStorage.getItem('jy-application-vod-he-ui_STORAGE_KEY_JWT_TOKEN'),
              refresh: sessionStorage.getItem('jy-application-vod-he-ui_STORAGE_KEY_REFRESH_TOKEN'),
              tenant: sessionStorage.getItem('jy-application-vod-he-ui_STORAGE_KEY_TENANT_ID') || 'RBAC'
            })""")
            if tokens and json.loads(tokens).get("jwt"):
                break
        if not tokens or not json.loads(tokens).get("jwt"):
            raise RuntimeError("jwt not found in sessionStorage after login")
        data = json.loads(tokens)
        state = {"jwt": data["jwt"], "tenant": data["tenant"], "page_url": href,
                 "created": time.time()}
        sp = Path(os.path.expanduser(state_path)).resolve()  # --state 来自 argv, 限制写入范围
        sp_allowed = [SESSION_DIR.resolve(), Path("/tmp").resolve(), Path("/private/tmp"),
                      Path.home().resolve(), Path.cwd().resolve()]
        if ".." in state_path or not any(
                sp == d or sp.is_relative_to(d) for d in sp_allowed):
            raise RuntimeError(f"refusing state path: {state_path}")
        # state 里是登录 jwt, 限制为仅文件主可读写(0600), 防同机其他用户读取
        fd = os.open(sp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(state, f)
        print("state saved to", sp, "| jwt len", len(data["jwt"]),
              "| tenant", data["tenant"])
        await ws.close()
    finally:
        if not keep:
            if chrome.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(chrome.pid), "/T", "/F"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    os.killpg(os.getpgid(chrome.pid), signal.SIGTERM)
                try:
                    chrome.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    chrome.kill()
            import shutil
            shutil.rmtree(prof, ignore_errors=True)
        logf.close()


if __name__ == "__main__":
    asyncio.run(main())
