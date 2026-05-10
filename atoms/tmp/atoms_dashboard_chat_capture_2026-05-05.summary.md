# Network Capture Summary

- JSON: E:/Program Files (x86)/Visual Studio/project/dev/atoms/tmp/atoms_dashboard_chat_capture_2026-05-05.json
- Summary: E:\Program Files (x86)\Visual Studio\project\dev\atoms\tmp\atoms_dashboard_chat_capture_2026-05-05.summary.md
- GeneratedAt: 2026-05-05T12:31:07.352Z
- Backend: debugger
- Tab: Atoms: Build websites & apps with AI, no code needed https://atoms.dev/dashboard
- RequestCount: 33
- Settings: {"maxCaptureTime":180000,"inactivityTimeout":0,"includeStatic":false,"urlInclude":["re:/api/v1/chats","re:/api/v1/aihub"],"urlExclude":[],"bodyUrlInclude":[],"bodyUrlExclude":[],"disableCache":true,"captureAllResponseBodies":false,"maxResponseBodyBytes":0,"maxRequests":500}

## Requests (preview 30/33)

### 1. POST https://atoms.dev/api/v1/chats
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 84 chars

```
{"llm":{"default_model":"auto"},"config":{"agent_mode":"lite"},"workspace_id":77096}
```
- responseBody: 792 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:08.840879Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"New Project","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"agent_mode":"lite","template_name":null},"use_user_cov…
```

### 2. POST https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/messages
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 1287 chars (truncated)

```
{"content":[{"insert":"开启 atomscloud，做最小化后端初始化\n\n然后执行以下命令并按指定格式返回结果：\n\n```bash\ncd /workspace/app/backend\n\nS2S_JWT_ACCESS_TOKEN=\"$(python -c \"import os; print(os.environ.get('S2S_JWT_ACCESS_TOKEN', os.environ.get('S2S_JWT_TOKEN', '')))\")\"\nS2S_JWT_BASE_URL=\"$(python -c \"import os; print(os.environ.get('S2S_JWT_BASE_URL', ''))\")\"\nS2S_APP_ID=\"$(python -c \"import os; print(os.environ.g…
```
- responseBody: 1586 chars (truncated)

```
{"code":0,"message":"Success.","data":{"id":51598981,"created_at":"2026-05-05T12:29:09.201386Z","updated_at":"2026-05-05T12:29:09.201401Z","role":"User","type":"message","refer_id":null,"content":[{"insert":"开启 atomscloud，做最小化后端初始化\n\n然后执行以下命令并按指定格式返回结果：\n\n```bash\ncd /workspace/app/backend\n\nS2S_JWT_ACCESS_TOKEN=\"$(python -c \"import os; print(os.environ.get('S2S_JWT_ACCESS_TOKEN', os.environ.…
```

### 3. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 1613 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:09.208555Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"New Project","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"dr_model":"auto","agent_mode":"lite","template_name":n…
```

### 4. GET https://atoms.dev/api/v1/chats/funcseaable
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 86 chars

```
{"code":0,"message":"Success.","data":{"funcseaable":true},"now_ts":1777984150.149962}
```

### 5. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/kvs/config?read_global=true
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 67 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984150.28696}
```

### 6. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/versions?cur_page=1&page_num=9999
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 109 chars

```
{"code":0,"message":"Success.","data":{"total":0,"data_list":[],"has_more":false},"now_ts":1777984150.785312}
```

### 7. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/errors
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984150.150276}
```

### 8. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/versions?cur_page=1&page_num=9999
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 109 chars

```
{"code":0,"message":"Success.","data":{"total":0,"data_list":[],"has_more":false},"now_ts":1777984150.804845}
```

### 9. PATCH https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 107 chars

```
{"chat_id":"007f7ffac8c4435dadbd16778f33b0fa","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1666 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:09.983833Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"dr_model":"auto","agent_mode":"lite","template_name":null…
```

### 10. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/messages?chatId=007f7ffac8c4435dadbd16778f33b0fa&cur_page=1&page_num=5000
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 1965 chars (truncated)

```
{"code":0,"message":"Success.","data":{"total":2,"data_list":[{"id":51598981,"created_at":"2026-05-05T12:29:09.201386Z","updated_at":"2026-05-05T12:29:09.201401Z","role":"User","type":"message","refer_id":null,"content":[{"insert":"开启 atomscloud，做最小化后端初始化\n\n然后执行以下命令并按指定格式返回结果：\n\n```bash\ncd /workspace/app/backend\n\nS2S_JWT_ACCESS_TOKEN=\"$(python -c \"import os; print(os.environ.get('S2S_JWT_AC…
```

### 11. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/block-timelines
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 324 chars

```
{"code":0,"message":"Success.","data":{"data_list":[{"index":0,"block_type":"Browser-RT","block_owner":"","file":"","src_path":"/data/chats/007f7ffac8c4435dadbd16778f33b0fa/workspace/","content":"","content_index":null,"is_running":false,"extra_data":null,"version":"","id":null,"created_at":""}]},"now_ts":1777984151.06561}
```

### 12. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 1665 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:09.983833Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"dr_model":"auto","agent_mode":"lite","template_name":null…
```

### 13. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/errors
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984151.797611}
```

### 14. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 1641 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:13.525649Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"funcsea":{"enable":true,"use_database":true},"dr_model":"…
```

### 15. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/deployment
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 109 chars

```
{"code":0,"message":"Success.","data":{"cloud_funcs":[],"resource_deleted":false},"now_ts":1777984154.527443}
```

### 16. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 1641 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:13.525649Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"funcsea":{"enable":true,"use_database":true},"dr_model":"…
```

### 17. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/deployment
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 109 chars

```
{"code":0,"message":"Success.","data":{"cloud_funcs":[],"resource_deleted":false},"now_ts":1777984154.415825}
```

### 18. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/errors
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984154.563411}
```

### 19. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/errors
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984181.256284}
```

### 20. PATCH https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 107 chars

```
{"chat_id":"007f7ffac8c4435dadbd16778f33b0fa","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1688 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:33.442890Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":null,"status":"ready","fork_from":null,"config":{"funcsea":{"enable":true,"use_database":true},"dr_model":"…
```

### 21. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/deployment
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 109 chars

```
{"code":0,"message":"Success.","data":{"cloud_funcs":[],"resource_deleted":false},"now_ts":1777984193.842796}
```

### 22. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/security-scan-tasks?version=v1
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 70 chars

```
{"code":0,"message":"Success.","data":null,"now_ts":1777984193.915484}
```

### 23. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/security-scan-tasks?version=v1
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":null,"now_ts":1777984194.8664}
```

### 24. PATCH https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 107 chars

```
{"chat_id":"007f7ffac8c4435dadbd16778f33b0fa","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1871 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:54.573524Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":{"content":"Initialize atomscloud backend and retrieve APP_AI_KEY.","key_words":["atomscloud","backend","AP…
```

### 25. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/security-scan-tasks?version=v1
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 70 chars

```
{"code":0,"message":"Success.","data":null,"now_ts":1777984195.004459}
```

### 26. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/security-scan-tasks?version=v1
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 70 chars

```
{"code":0,"message":"Success.","data":null,"now_ts":1777984202.406983}
```

### 27. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/security-scan-tasks?version=v1
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 69 chars

```
{"code":0,"message":"Success.","data":null,"now_ts":1777984202.41503}
```

### 28. PATCH https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 107 chars

```
{"chat_id":"007f7ffac8c4435dadbd16778f33b0fa","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1803 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:54.573524Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":{"content":"Initialize atomscloud backend and retrieve APP_AI_KEY.","key_words":["atomscloud","backend","AP…
```

### 29. GET https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa/errors
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- responseBody: 68 chars

```
{"code":0,"message":"Success.","data":[],"now_ts":1777984218.532955}
```

### 30. PATCH https://atoms.dev/api/v1/chats/007f7ffac8c4435dadbd16778f33b0fa
- Meta: status=200 type=XHR mime=application/json
- keyRequestHeaders:
- `Authorization`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3ODA1NzU5MzgsInVzZXJfaWQiOjExOTE0NTgsImVtYWlsIjoiamFjazE5NzE5QGRlbHRham9obnNvbnMuY29tIiwicHYiOjB9.KL8N5Pyh3DM-pK6awjkUqJOerkRzMI3mlpTpxSjAFs4`
- requestBody: 107 chars

```
{"chat_id":"007f7ffac8c4435dadbd16778f33b0fa","metadata":{"status":"activating","activities":[],"state":1}}
```
- responseBody: 1799 chars (truncated)

```
{"code":0,"message":"Success.","data":{"created_at":"2026-05-05T12:29:08.840860Z","updated_at":"2026-05-05T12:29:54.573524Z","chat_id":"007f7ffac8c4435dadbd16778f33b0fa","title":"最小化后端初始化","access_mode":"public","workspace_id":77096,"description":null,"pinned_version":null,"pinned_highlight":{"content":"Initialize atomscloud backend and retrieve APP_AI_KEY.","key_words":["atomscloud","backend","AP…
```
