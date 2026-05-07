# Network Capture Summary

- JSON: E:\Program Files (x86)\Visual Studio\project\Sbird\tmp\atoms_filtered_full_chain_after_clear_2026-05-05.json
- Summary: E:\Program Files (x86)\Visual Studio\project\Sbird\tmp\atoms_filtered_full_chain_after_clear_2026-05-05.summary.md
- GeneratedAt: 2026-05-05T04:38:56.166Z
- Backend: debugger
- Tab: Log In | Atoms - Your AI Vibe Business Team https://atoms.dev/zh/login?redirect=/zh
- RequestCount: 65
- Settings: {"maxCaptureTime":1200000,"inactivityTimeout":0,"includeStatic":false,"urlInclude":["re:^https://(atoms\\.dev|[a-z0-9-]+\\.preview\\.app\\.atoms\\.dev|[a-z0-9-]+-v1-dev\\.dev\\.atoms\\.dev)/api/"],"urlExclude":[],"bodyUrlInclude":[],"bodyUrlExclude":[],"disableCache":true,"captureAllResponseBodies":true,"maxResponseBodyBytes":0,"maxRequests":3000}

## Requests (preview 30/65)

### 1. POST https://atoms.dev/api/v1/user/check-email
- Meta: status=200 type=XHR mime=application/json
- requestBody: 39 chars

```
{"email":"larry22582817+f@hotmail.com"}
```
- responseBody: 80 chars

```
{"code":0,"message":"成功。","data":{"registered":true},"now_ts":1777955898.552756}
```

### 2. POST https://atoms.dev/api/v1/user/login
- Meta: status=200 type=XHR mime=application/json
- requestBody: 63 chars

```
{"email":"larry22582817+f@hotmail.com","password":"@#Dfg55666"}
```
- responseBody: 516 chars (truncated)

```
{"code":0,"message":"成功。","data":{"id":1189907,"username":"Atoms_LOR7WSNY","avatar":null,"email":"larry22582817+f@hotmail.com","status":"active","role":"regular","created_at":"2026-05-05T03:06:39.136034Z","updated_at":"2026-05-05T04:24:08.635000Z","disk_quota_exceeded":false,"lang":"zh","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycn…
```

### 3. GET https://atoms.dev/api/v1/user/detail
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 620 chars (truncated)

```
{"code":0,"message":"成功。","data":{"id":1189907,"username":"Atoms_LOR7WSNY","email":"larry22582817+f@hotmail.com","status":"active","role":"regular","lang":"zh","created_at":"2026-05-05T03:06:39.136034Z","updated_at":"2026-05-05T04:24:08.635Z","runtime_deploy_status":"init","runtime_deploy_msg":"","runtime_deploy_queue":1,"intercom_token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImxhcnJ5Mj…
```

### 4. GET https://atoms.dev/api/v1/transaction/balance
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 1046 chars (truncated)

```
{"code":0,"message":"成功。","data":{"plan":"free","is_restricted":true,"start_at":"2026-05-05T03:06:39Z","end_at":"2026-06-05T03:06:39Z","status":"subscribed","billing_period":"month","bonus_quota":0,"bonus_used":0,"paid_monthly_quota_total":0,"paid_monthly_quota_used":0,"daily_free_quota_used":413675,"daily_free_quota_limit":1500000,"next_plan":null,"reset_at":"2026-05-05T03:06:39Z","free_monthly_q…
```

### 5. GET https://atoms.dev/api/v1/stripe/accounts
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 73 chars

```
{"code":0,"message":"成功。","data":{"items":[]},"now_ts":1777955901.930506}
```

### 6. PATCH https://atoms.dev/api/v1/user/me
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- requestBody: 13 chars

```
{"lang":"zh"}
```
- responseBody: 348 chars

```
{"code":0,"message":"成功。","data":{"id":1189907,"username":"Atoms_LOR7WSNY","email":"larry22582817+f@hotmail.com","status":"active","role":"regular","lang":"zh","created_at":"2026-05-05T03:06:39.136034Z","updated_at":"2026-05-05T04:38:21.944Z","runtime_deploy_msg":"","runtime_deploy_queue":0,"disk_quota_exceeded":false},"now_ts":1777955901.946066}
```

### 7. GET https://atoms.dev/api/v1/configs/general
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 976 chars (truncated)

```
{"code":0,"message":"成功。","data":{"config":{"default_chat_access_mode":"public","discount_context":{"first_preview_at":"2026-05-05T03:11:36.326000Z","chat_high_active_at":null,"chat_high_active_reason":null},"enable_extra_storage":false,"is_auto":false,"adv_model":"deepseek-v4-pro","agent_mode":"","basic_model":"","boost_models":[],"badge_visible":true,"default_model":"claude-opus-4.6","channelVis…
```

### 8. GET https://atoms.dev/api/v1/workspaces
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 343 chars

```
{"code":0,"message":"成功。","data":{"workspaces":[{"workspace":{"id":75407,"name":"Atoms_LOR7WSNY's Atoms","owner_id":1189907,"status":"active","created_at":{"seconds":1777950401},"updated_at":{"seconds":1777950401},"plan":"free"},"role":"owner","is_current":true,"member_count":1,"joined_at":{"seconds":1777950401}}]},"now_ts":1777955902.78081}
```

### 9. GET https://atoms.dev/api/v1/transaction/balance
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 1046 chars (truncated)

```
{"code":0,"message":"成功。","data":{"plan":"free","is_restricted":true,"start_at":"2026-05-05T03:06:39Z","end_at":"2026-06-05T03:06:39Z","status":"subscribed","billing_period":"month","bonus_quota":0,"bonus_used":0,"paid_monthly_quota_total":0,"paid_monthly_quota_used":0,"daily_free_quota_used":413675,"daily_free_quota_limit":1500000,"next_plan":null,"reset_at":"2026-05-05T03:06:39Z","free_monthly_q…
```

### 10. GET https://atoms.dev/api/v1/chats?page_num=999
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 1772 chars (truncated)

```
{"code":0,"message":"成功。","data":{"total":1,"data_list":[{"created_at":"2026-05-05T03:08:35.116075Z","updated_at":"2026-05-05T03:11:14.315624Z","chat_id":"f97f84b26aac434f94c1c208d97b969c","title":"聊天页面接入opus4.6","access_mode":"public","workspace_id":75407,"description":null,"pinned_version":null,"pinned_highlight":{"content":"Create a chat page with Atoms cloud's Opus 4.6 model.","key_words":["ch…
```

### 11. GET https://atoms.dev/api/v1/configs/general
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 976 chars (truncated)

```
{"code":0,"message":"成功。","data":{"config":{"default_chat_access_mode":"public","discount_context":{"first_preview_at":"2026-05-05T03:11:36.326000Z","chat_high_active_at":null,"chat_high_active_reason":null},"enable_extra_storage":false,"is_auto":false,"adv_model":"deepseek-v4-pro","agent_mode":"","basic_model":"","boost_models":[],"badge_visible":true,"default_model":"claude-opus-4.6","channelVis…
```

### 12. GET https://atoms.dev/api/v1/mcp/servers
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 595 chars (truncated)

```
{"code":0,"message":"成功。","data":{"servers":[{"mcp_server_id":"linear","name":"Linear","description":"Connect Linear issues, projects, teams, and workflow data through MCP.","url":"https://mcp.linear.app/mcp","icon_url":"https://public-frontend-1300249583.cos.ap-nanjing.myqcloud.com/commonfile/logo-linear-color.svg","auth_type":"oauth","connection_status":"not_connected","token_expires_at":null,"p…
```

### 13. GET https://atoms.dev/api/v1/github/account
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 164 chars

```
{"code":0,"message":"成功。","data":{"status":"unconnected","github_user_id":null,"github_username":null,"avatar_url":null,"html_url":null},"now_ts":1777955902.801316}
```

### 14. GET https://atoms.dev/api/v1/supabase/projects?need_chat_data=true
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 77 chars

```
{"code":0,"message":"成功。","data":{"data_list":[]},"now_ts":1777955902.832305}
```

### 15. GET https://atoms.dev/api/v1/stripe/accounts
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 73 chars

```
{"code":0,"message":"成功。","data":{"items":[]},"now_ts":1777955902.799788}
```

### 16. GET https://atoms.dev/api/v1/growth/oauth/status
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 187 chars

```
{"code":0,"message":"成功。","data":{"gsc":{"is_connected":false,"google_email":null,"scopes":null},"ga4":{"is_connected":false,"google_email":null,"scopes":null}},"now_ts":1777955902.99587}
```

### 17. GET https://atoms.dev/api/v1/google-ads/accounts
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 73 chars

```
{"code":0,"message":"成功。","data":{"items":[]},"now_ts":1777955902.805612}
```

### 18. GET https://atoms.dev/api/v1/mcp/servers
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 595 chars (truncated)

```
{"code":0,"message":"成功。","data":{"servers":[{"mcp_server_id":"linear","name":"Linear","description":"Connect Linear issues, projects, teams, and workflow data through MCP.","url":"https://mcp.linear.app/mcp","icon_url":"https://public-frontend-1300249583.cos.ap-nanjing.myqcloud.com/commonfile/logo-linear-color.svg","auth_type":"oauth","connection_status":"not_connected","token_expires_at":null,"p…
```

### 19. GET https://atoms.dev/api/v1/github/account
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 164 chars

```
{"code":0,"message":"成功。","data":{"status":"unconnected","github_user_id":null,"github_username":null,"avatar_url":null,"html_url":null},"now_ts":1777955903.009234}
```

### 20. GET https://atoms.dev/api/v1/supabase/projects?need_chat_data=true
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 77 chars

```
{"code":0,"message":"成功。","data":{"data_list":[]},"now_ts":1777955903.199567}
```

### 21. GET https://atoms.dev/api/v1/stripe/accounts
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 73 chars

```
{"code":0,"message":"成功。","data":{"items":[]},"now_ts":1777955903.178733}
```

### 22. GET https://atoms.dev/api/v1/growth/oauth/status
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 186 chars

```
{"code":0,"message":"成功。","data":{"gsc":{"is_connected":false,"google_email":null,"scopes":null},"ga4":{"is_connected":false,"google_email":null,"scopes":null}},"now_ts":1777955903.1445}
```

### 23. GET https://atoms.dev/api/v1/google-ads/accounts
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 73 chars

```
{"code":0,"message":"成功。","data":{"items":[]},"now_ts":1777955903.012272}
```

### 24. GET https://atoms.dev/api/v1/themes?cur_page=1&page_num=100
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 46506 chars (truncated)

```
{"code":0,"message":"成功。","data":{"total":14,"data_list":[{"id":24,"created_at":"2026-03-23T14:47:38.355538Z","updated_at":"2026-04-30T12:51:58.610609Z","deleted_at":null,"user_id":0,"name":"Zen","description":"","theme_type":"preset","config":{"css":{"@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap')":{},"@import url('https://fonts.googleapis.com/css2…
```

### 25. GET https://atoms.dev/api/v1/themes?cur_page=1&page_num=100
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 46506 chars (truncated)

```
{"code":0,"message":"成功。","data":{"total":14,"data_list":[{"id":24,"created_at":"2026-03-23T14:47:38.355538Z","updated_at":"2026-04-30T12:51:58.610609Z","deleted_at":null,"user_id":0,"name":"Zen","description":"","theme_type":"preset","config":{"css":{"@import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap')":{},"@import url('https://fonts.googleapis.com/css2…
```

### 26. GET https://atoms.dev/api/v1/public/announcement
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 1666 chars (truncated)

```
{"code":0,"message":"成功。","data":{"enabled":true,"type":"Updated","title":"GPT 5.5 and DeepSeek-V4-Pro are now live!","content":"## Atoms Model Update\n\nWe’ve added **GPT-5.5** and **DeepSeek-V4 Preview** to Atoms.\n\nYou can now access both models directly from the model picker for faster execution, stronger reasoning, better coding performance, and smoother long-task workflows.\n\n- **GPT-5.5:*…
```

### 27. GET https://atoms.dev/api/v1/public/chat/ids?cur_page=1&page_num=36&is_user_like=true&shared=true
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- responseBody: 104 chars

```
{"code":0,"message":"成功。","data":{"total":0,"data_list":[],"has_more":false},"now_ts":1777955904.236548}
```

### 28. POST https://atoms.dev/api/v1/feeds/items/
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- requestBody: 467 chars (truncated)

```
{"rec_num":36,"page_name":"appworld","user_id":"1189907","is_first":true,"req_id":"019df66e-11ff-724a-a36b-c015cb26ac22","context":{"device":"{}","os":"{\"osType\":\"Windows\",\"osVersion\":\"10\",\"browser\":\"Edge\",\"browserVer\":\"147.0.0.0\",\"ua\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0\",\"language\":\"z…
```
- responseBody: 3774 chars (truncated)

```
{"code":0,"message":"SUCCESS","data":{"total":36,"data_list":[{"chat_id":"e207c351c5c84e159ab1f330cc9e9c1b","score":0.539500892162323,"strategy":"sty_appworld1"},{"chat_id":"c47cb53c5fb6439d8ddb21909c517d2c","score":0.20698142051696777,"strategy":"sty_appworld1"},{"chat_id":"8e01028da115458c9a89f6bbd2c9f565","score":0.14670193195343018,"strategy":"sty_appworld1"},{"chat_id":"1df123010fec4144ab273b…
```

### 29. POST https://atoms.dev/api/v1/workspaces/75407/rbac/batch-check
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- requestBody: 174 chars

```
{"permission_names":["workspace:write","member:manage","chat:write","chat:delete","billing:manage","integration:manage","settings:write","deployment:manage","public:manage"]}
```
- responseBody: 291 chars

```
{"code":0,"message":"成功。","data":{"results":{"billing:manage":true,"chat:delete":true,"chat:write":true,"deployment:manage":true,"integration:manage":true,"member:manage":true,"public:manage":true,"settings:write":true,"workspace:write":true},"role_name":"owner"},"now_ts":1777955907.462708}
```

### 30. PATCH https://atoms.dev/api/v1/chats/f97f84b26aac434f94c1c208d97b969c
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NDc5MDEsInVzZXJfaWQiOjExODk5MDcsImVtYWlsIjoibGFycnkyMjU4MjgxNytmQGhvdG1haWwuY29tIiwicHYiOjB9.An73gm2L9b6u1-fwYrkLx6g4ZwjpZSGGeF1_OjiC07w`
- requestBody: 107 chars

```
{"chat_id":"f97f84b26aac434f94c1c208d97b969c","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1800 chars (truncated)

```
{"code":0,"message":"成功。","data":{"created_at":"2026-05-05T03:08:35.116075Z","updated_at":"2026-05-05T03:11:14.315624Z","chat_id":"f97f84b26aac434f94c1c208d97b969c","title":"聊天页面接入opus4.6","access_mode":"public","workspace_id":75407,"description":null,"pinned_version":null,"pinned_highlight":{"content":"Create a chat page with Atoms cloud's Opus 4.6 model.","key_words":["chat page","Atoms cloud","…
```
