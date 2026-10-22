# 录像下载与平台细节

学习不必下载视频。用户要求录像/SRT 时使用：

```text
python scripts/nuaa_api.py url <courseId>
python scripts/download_mp4.py "<mp4_url>" "<输出.mp4>"
python scripts/nuaa_api.py subtitle <courseId> "<输出.srt>"
```

录像下载保留上游实现，ffprobe 校验需安装 ffmpeg。字幕输出限制在用户主目录或
当前工作目录内。API 子命令及 study_material.py 都接受 --state <路径>。

上游接口契约（2026-09 实测，站点变化时以实际结果为准）：

- 基址 https://ft.nuaa.edu.cn/jy-application-vod-he。
- 鉴权为 jwt-token、tenantid 请求头，不是 cookie。
- /v1/group_subject_vod_list 返回课程分组 teclId/subjName/teacNames/teclName。
  /v1/myself/curriculum 为教师侧接口，不用于学生课程发现。
- /v1/subject_vod_list?teclIds=... 返回课次 id/courBeginTime/courEndTime。
- /v1/course_vod_subtitle?courseId=... 使用明文课次 ID，data 为 bg/ed/res 数组，毫秒时间轴。
- /v1/course_vod_urls 的 ID 需 AES 加密后双重 URL 编码，使用 nuaa_aes.py。
  `python scripts/nuaa_aes.py self-test` 提供已知样本校验。
- 上游观察到 MP4 带时效签名，需 Referer 和浏览器 UA；403 时重取地址。
  当前具体课次是否能下载仍以平台返回为准。
- 扫码确认后需刷新登录页再提交 CAS 表单，qr_login.py 已实现一次重试。

系统临时目录下 nuaa-course-video/ 包含 state.json、qr.png、login.log。
日志仅用于本机诊断，不把包含登录跳转票据的原始日志贴进对话或上传。
