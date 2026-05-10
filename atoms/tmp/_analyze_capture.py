import json, re
p = r"E:/Program Files (x86)/Visual Studio/project/dev/atoms/tmp/atoms_dashboard_chat_capture_2026-05-05.json"
with open(p, encoding='utf-8') as f:
    d = json.load(f)
reqs = d.get('requests', [])
for i, r in enumerate(reqs, 1):
    u = str(r.get('url', ''))
    m = str(r.get('method', ''))
    rb = str(r.get('responseBody', '') or '')
    rq = str(r.get('requestBody', '') or '')
    hit = ('APP_AI_KEY' in rb) or ('APP_AI_KEY' in rq)
    cond = ('/api/v1/chats/' in u and (
        '/messages' in u or '/errors' in u or m == 'PATCH' or u.endswith('/deployment') or
        '/security-scan-tasks' in u or u.endswith('/versions?cur_page=1&page_num=9999') or
        u.endswith('/kvs/config?read_global=true') or u.endswith('/block-timelines') or
        re.search(r'/api/v1/chats/[a-f0-9]{32}$', u)
    ))
    if not cond:
        continue
    print('%02d %-5s rt=%s rsp=%s hit=%s %s' % (i, m, r.get('requestTime'), r.get('responseTime'), hit, u))
    if '/messages' in u and rb:
        print('   rb_has_key=', 'APP_AI_KEY' in rb, 'len=', len(rb))
        if 'APP_AI_KEY' in rb:
            idx = rb.find('APP_AI_KEY')
            s = rb[max(0, idx-120):idx+220].replace('\n', ' ')
            print('   snippet=', s)
