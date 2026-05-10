# Network Capture Summary

- JSON: E:\Program Files (x86)\Visual Studio\project\dev\atoms\tmp\atoms_turnstile_injected_c1_flow_2026-05-05.json
- Summary: E:\Program Files (x86)\Visual Studio\project\dev\atoms\tmp\atoms_turnstile_injected_c1_flow_2026-05-05.summary.md
- GeneratedAt: 2026-05-05T09:34:40.292Z
- Backend: debugger
- Tab: 立即注册 | 使用 Atoms AI 团队开始构建 https://atoms.dev/zh/register
- RequestCount: 2
- Settings: {"maxCaptureTime":900000,"inactivityTimeout":0,"includeStatic":false,"urlInclude":["/api/v1/user/send-magic-link","/api/v1/user/check-email","/api/v1/user/verify-magic-link","turnstile","challenges.cloudflare.com","/api/v1/user/register","/api/v1/user/activation"],"urlExclude":[],"bodyUrlInclude":[],"bodyUrlExclude":[],"disableCache":false,"captureAllResponseBodies":true,"maxResponseBodyBytes":0,"maxRequests":3000}

## Requests (preview 2/2)

### 1. GET https://challenges.cloudflare.com/cdn-cgi/challenge-platform/h/g/turnstile/f/ov2/av0/rch/ha4mo/0x4AAAAAABm2ODs7WKuQtDuP/light/fbE/new/normal?lang=auto
- Meta: status=200 type=Document mime=text/html

### 2. POST https://atoms.dev/api/v1/user/send-magic-link
- Meta: status=200 type=Fetch mime=application/json
- requestBody: 1465 chars (truncated)

```
{"email":"ymghfssach+c1@hotmail.com","password":"@#Dfg55666","captcha":"0.RiSFWDK-KvwotObfBaOah80-GpX7MoacijUls06Aq0a2cRmk6b6WMcWc621ztmPa7ht0KYmfEd4vzyfOrEsAW_qSK0R0AnTOlAQLFbnG5X-YmZ5Q8M8YR_0QW9EJr7pvFwvqtRRH6bFci6TBFOkS4t24222jilWNW6-3J_MeG5yCpMD02h6E4Xnr33GZFtd07fmdminhR2Wrgth1FtoEN6RubtWJJguL-rDF0_2hEDwY4X9a-NLln8_WgXpGoSPf9bIS_pbBOTrhnYRSLxloSnQGiRze6z3x-RPcIsqz_F2eT01I56GAhfUGplfqDIbW1PxjfU…
```
- responseBody: 77 chars

```
{"code":0,"message":"成功。","data":{"success":true},"now_ts":1777973674.010101}
```
