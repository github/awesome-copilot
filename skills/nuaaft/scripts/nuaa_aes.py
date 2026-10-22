#!/usr/bin/env python3
"""NUAA 飞天云课堂 courseId 加密 (CryptoJS AES.encrypt(id, "ivs3.0") 等价实现).

OpenSSL salted base64 格式: "Salted__" + 8字节随机盐 + AES-256-CBC(PKCS7),
密钥由 passphrase 经 EVP_BytesToKey(MD5) 派生。与页面里 CryptoJS 的
AES.encrypt(msg, passphrase) 输出一致。

用法:
  python3 nuaa_aes.py encrypt <courseId>   # 输出 URL 编码后的加密串(供 course_vod_urls 用)
  python3 nuaa_aes.py decrypt <串>          # 输出明文(也接受 URL 编码)
  python3 nuaa_aes.py self-test            # 用站点已知样本自检
"""
import hashlib, base64, os, subprocess, sys, urllib.parse

from nuaa_runtime import ensure_dependencies
ensure_dependencies(["Crypto"])
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

PASSPHRASE = b"ivs3.0"
# 站点实测样本: 加密"1674678"得到的串(原始 URL 编码形式)
KNOWN_ENCRYPTED = "U2FsdGVkX19wP9GGTrf6TJacurosp6%2FYdMkepHfDMP0%3D"
KNOWN_PLAIN = "1674678"


def _evp_bytes_to_key(passphrase: bytes, salt: bytes, key_len=32, iv_len=16):
    d = b""
    prev = b""
    while len(d) < key_len + iv_len:
        prev = hashlib.md5(prev + passphrase + salt).digest()
        d += prev
    return d[:key_len], d[key_len:key_len + iv_len]


def encrypt(plain: str, passphrase: bytes = PASSPHRASE) -> str:
    salt = os.urandom(8)
    key, iv = _evp_bytes_to_key(passphrase, salt)
    ct = AES.new(key, AES.MODE_CBC, iv).encrypt(pad(plain.encode(), 16))
    return base64.b64encode(b"Salted__" + salt + ct).decode()


def encrypt_quoted(plain: str) -> str:
    """返回可直接放进 course_vod_urls?courseId= 的 URL 编码串。

    服务端会做两次 URL 解码, 必须双重编码(页面行为一致): 否则 base64 中的
    "+" 经两次解码会变成空格, 解密失败返回 data:null。"""
    return urllib.parse.quote(urllib.parse.quote(encrypt(plain), safe=""), safe="")


def decrypt(b64: str, passphrase: bytes = PASSPHRASE) -> str:
    raw = base64.b64decode(b64)
    if raw[:8] != b"Salted__":
        raise ValueError("not OpenSSL salted format")
    salt, ct = raw[8:16], raw[16:]
    key, iv = _evp_bytes_to_key(passphrase, salt)
    return unpad(AES.new(key, AES.MODE_CBC, iv).decrypt(ct), 16).decode()


def self_test() -> bool:
    plain = decrypt(urllib.parse.unquote(KNOWN_ENCRYPTED))
    ok = plain == KNOWN_PLAIN
    print(f"decrypt known -> {plain!r} (expected {KNOWN_PLAIN!r}) {'OK' if ok else 'FAIL'}")
    encrypted = encrypt(KNOWN_PLAIN)
    roundtrip = decrypt(encrypted) == KNOWN_PLAIN
    print(f"roundtrip {'OK' if roundtrip else 'FAIL'}")
    return ok and roundtrip


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "self-test"
    if cmd == "encrypt":
        print(encrypt_quoted(sys.argv[2]))
    elif cmd == "decrypt":
        print(decrypt(urllib.parse.unquote(sys.argv[2])))
    elif cmd == "self-test":
        sys.exit(0 if self_test() else 1)
    else:
        print("unknown command", cmd)
        sys.exit(2)