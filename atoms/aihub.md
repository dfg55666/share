
S2S_JWT_ACCESS_TOKEN: s2s-Ex8m3reZR4f7FdmBoSM8ZshVwJ2hvuiRJdpkJcLLw09FIkzWSMf0E+uZ8Cf9/8GA6yfw6JJhaGkK+y10KpJuJZHlcort6VQZN1RvJlvoAFIkXVsfTgUVj9a0InjXjaaArUxFNnGhdHBzCi0DGcRNYrstbXoNS2l/epkcjmAbhiQ=
S2S_JWT_BASE_URL: http://prod-metagptx-api.metagpt.svc
S2S_APP_ID: a2b09266ac0f490fa25d9a0b9be7c320

开启 atoms cloud 然后执行
$ cd /workspace/app/backend && python -c "import os; print('S2S_JWT_ACCESS_TOKEN:', os.environ.get('S2S_JWT_ACCESS_TOKEN', os.environ.get('S2S_JWT_TOKEN', '未设置'))); print('S2S_JWT_BASE_URL:', os.environ.get('S2S_JWT_BASE_URL', '未设置')); print('S2S_APP_ID:', os.environ.get('S2S_APP_ID', os.environ.get('CHAT_ID', '未设置')))"

fetch_env_from_api() {
    local base_url=$1        # S2S_JWT_BASE_URL
    local access_token=$2    # S2S_JWT_ACCESS_TOKEN
    local app_id=$3          # S2S_APP_ID (即 CHAT_ID)
    
    # 构造 API URL
    local api_url="${base_url}/api/v1/chats/${app_id}/kvs/app?env=dev"
    
    # 通过 curl 调用 API，带上 Bearer Token 认证
    response=$(curl -s -w "\n%{http_code}" -X GET "$api_url" \
        -H "Authorization: Bearer $access_token" \
        -H "Accept: application/json" \
        -H "Content-Type: application/json")
    
    # 用 Python 解析 JSON 响应，提取 conf_key=conf_value 对
    # 响应格式: {"code":0,"data":[{"conf_key":"KEY","conf_value":"VALUE"},...]}"
}

APP_AI_BASE_URL
APP_AI_KEY
