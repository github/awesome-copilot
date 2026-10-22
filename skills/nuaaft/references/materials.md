# 资料获取

命令从 Skill 根目录执行，或使用脚本绝对路径。Python 3.10+，平台登录需要
Chrome、curl；CHROME_BIN 可指定浏览器。缺少依赖时在独立 venv 安装
websockets/pycryptodome。只读字幕无需下载视频。

## 获取流程

1. 已有用户材料可直接使用，不强制登录；没有课堂资料时不能声称符合老师讲法。
2. 有本轮有效登录态先复用，否则后台运行 `python scripts/qr_login.py`。
   看到 QR_PNG_PATH 后展示该绝对路径的图片，请用户扫码确认；刷新时展示新图。
   等成功退出后继续，不读取/输出 JWT、二维码令牌或登录跳转票据。
3. `python scripts/nuaa_api.py courses --json`：登录后列出课程名称、教师、班级与录像数。
   按真实列表匹配简称，同名班级请用户选择。
4. `python scripts/nuaa_api.py list <teclId> --json`：按起止时间匹配课次。
   teclId 是教学班，记录 id 是课次 courseId。相对日期按用户时区解释。
5. `python scripts/study_material.py <courseId> <新资料目录>`：得到 manifest.json。
   按索引分批读取 chunk 文件，保留 start_ms/end_ms/text；约6000字或8分钟一块，
   单条字幕不拆分。知识点可能跨块，整课任务要读完整个选定范围。

临时材料放用户工作区 work/，持久笔记遵循宿主输出约定，不写 Skill 目录。
引用使用“课程/日期及课次/HH:MM:SS–HH:MM:SS”；上传材料用文件名和页码。
多课次分开存，不能仅凭首尾时间戳宣称中间内容完整。

## 异常与清理

- 401/明确登录过期：重登一次，仍失败则暂停；空列表也可能确实无课程记录。
- 无字幕/内容缺失：说明覆盖缺口，提供其他课次、补充资料或通用辅导选项，不编造。
- 网络错误、提交两次失败或连续两轮二维码过期：停止本次登录进程并报告阻碍，
  保留学习选择；不无限重试，只停止本次启动的进程。
- 无内置音频转写/OCR。宿主有相应工具且任务需要时才另行使用并说明来源。

内部默认目录仍为系统临时目录下 nuaa-course-video/，含 state.json、qr.png、login.log。
--state 可独立指定凭据，但二维码与日志仍共享，所以不能并发登录。
材料取齐或学习结束时，仅删除本次生成且其他会话未使用的临时文件，不删学习资料。
Windows 继承用户临时目录 ACL，POSIX 创建权限为0600；不向对话贴原始登录日志。
原有录像/SRT下载和接口契约见 [platform.md](platform.md)。
