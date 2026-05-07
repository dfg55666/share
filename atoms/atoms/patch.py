import sys

with open('worker.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import queue' not in content:
    content = content.replace('import sys\n', 'import sys\nimport queue\nimport threading\n')

# Find def _run_task and replace everything after it
idx = content.find('def _run_task(')
if idx != -1:
    new_tail = """class PipelineState:
    def __init__(self, target_count: int):
        self.target_count = target_count
        self.success_count = 0
        self.failure_count = 0
        self.lock = threading.Lock()
        self.done_event = threading.Event()

    def add_success(self):
        with self.lock:
            self.success_count += 1
            if self.success_count >= self.target_count:
                self.done_event.set()
                
    def add_failure(self):
        with self.lock:
            self.failure_count += 1

def turnstile_worker(mcp_url: str, args: argparse.Namespace, state: PipelineState, token_queue: queue.Queue):
    client = StreamableHttpMCPClient(str(mcp_url), timeout=float(args.mcp_timeout_s))
    try:
        client.initialize()
    except Exception as e:
        _safe_print(f"[Turnstile] MCP init failed: {e}")
        state.add_failure()
        return

    # Handle tab creation
    if int(args.tab_id) > 0 and int(args.count) <= 1:
        tab_id = int(args.tab_id)
    else:
        nav = client.call_tool_json(
            "chrome_navigate",
            {
                "url": str(args.target_url),
                "newWindow": True,
                "width": int(args.window_width),
                "height": int(args.window_height),
            },
        )
        tab_id = int(nav.get("tabId") or 0)
        if tab_id <= 0:
            tabs = nav.get("tabs")
            if isinstance(tabs, list) and tabs:
                first = tabs[0] if isinstance(tabs[0], dict) else {}
                tab_id = int((first or {}).get("tabId") or 0)
        if tab_id <= 0:
            _safe_print(f"[Turnstile] navigate did not return tabId: {nav}")
            state.add_failure()
            return

    while not state.done_event.is_set():
        try:
            if not bool(args.keep_login_state):
                _maybe_clear_atoms_site_data(client, tab_id)

            _safe_tool_call(
                client,
                "chrome_navigate",
                {"tabId": tab_id, "url": str(args.target_url), "background": False},
            )
            _wait_register_home(client, tab_id=tab_id, timeout_s=float(args.wait_step1_s))

            captcha = _get_turnstile_token_injected(
                client=client,
                tab_id=tab_id,
                sitekey=str(args.turnstile_sitekey),
                click_x=float(args.turnstile_click_x),
                click_y=float(args.turnstile_click_y),
                wait_token_s=float(args.wait_turnstile_s),
                max_clicks=max(1, int(args.turnstile_max_clicks)),
                first_click_delay_s=float(args.turnstile_first_click_delay_s),
            )
            
            _safe_print(f"[Turnstile] Produced token (len={len(captcha)})")
            # Loop to put until accepted or done
            while not state.done_event.is_set():
                try:
                    token_queue.put(captcha, timeout=1.0)
                    break
                except queue.Full:
                    continue
        except Exception as e:
            _safe_print(f"[Turnstile] Error: {e}")
            time.sleep(2)

def register_worker(worker_id: int, args: argparse.Namespace, state: PipelineState, token_queue: queue.Queue, jwt_queue: queue.Queue):
    s = c_requests.Session()
    
    while not state.done_event.is_set():
        try:
            captcha = token_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        try:
            inbox = MailTMInbox(password=args.password, logger=lambda m: None)
            email = inbox.generate_email()
            password = str(args.password)
            
            _safe_print(f"[Register-{worker_id}] Using token for {email}")

            send_retries = max(1, int(args.send_magic_link_retries) + 1)
            send_magic = {}
            for attempt in range(1, send_retries + 1):
                send_magic = _atoms_send_magic_link(
                    s,
                    email=email,
                    password=password,
                    captcha=captcha,
                    device_fingerprint=KNOWN_GOOD_DEVICE_FINGERPRINT,
                    impersonate=str(args.impersonate),
                    timeout_s=int(args.http_timeout_s),
                    redirect="/",
                )
                code = _api_code(send_magic)
                if code == 0:
                    break
                if code == 5007 and attempt < send_retries:
                    _safe_print(f"[Register-{worker_id}] send-magic-link got 5007, retrying with fresh token")
                    try:
                        captcha = token_queue.get(timeout=10.0) # Need a fresh token
                    except queue.Empty:
                        break
                    continue
                break

            if _api_code(send_magic) != 0:
                _safe_print(f"[Register-{worker_id}] send_magic failed: {send_magic}")
                continue

            verification_token = inbox.wait_for_verification_token(timeout_s=float(args.mail_timeout_s), debug=False)
            if not verification_token:
                _safe_print(f"[Register-{worker_id}] verification token missing")
                continue

            verified = _atoms_verify_magic_link(
                s,
                email=email,
                verification_token=verification_token,
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )
            
            if _api_code(verified) != 0:
                _safe_print(f"[Register-{worker_id}] verify magic link failed: {verified}")
                continue

            verified_data = verified.get("data") if isinstance(verified.get("data"), dict) else {}
            token = str((verified_data or {}).get("token") or "").strip()
            
            if not token:
                continue

            jwt_info = {
                "email": email,
                "password": password,
                "token": token,
                "jwt": token,
                "balance": _atoms_balance(s, token=token, impersonate=str(args.impersonate), timeout_s=int(args.http_timeout_s))
            }
            
            _safe_print(f"[Register-{worker_id}] Generated JWT for {email}")
            while not state.done_event.is_set():
                try:
                    jwt_queue.put(jwt_info, timeout=1.0)
                    break
                except queue.Full:
                    continue

        except Exception as e:
            _safe_print(f"[Register-{worker_id}] Error: {e}")
        finally:
            token_queue.task_done()

def apikey_worker(worker_id: int, args: argparse.Namespace, state: PipelineState, jwt_queue: queue.Queue, output_path: Path, output_mode: str):
    s = c_requests.Session()
    
    try:
        message_file = Path(str(args.agent_message_file)).expanduser().resolve()
        prompt = message_file.read_text(encoding="utf-8")
    except Exception as e:
        _safe_print(f"[APIKey-{worker_id}] Failed to read prompt: {e}")
        state.done_event.set()
        return

    while not state.done_event.is_set():
        try:
            jwt_info = jwt_queue.get(timeout=1.0)
        except queue.Empty:
            continue

        try:
            token = jwt_info["token"]
            email = jwt_info["email"]
            
            workspace_id = _atoms_get_workspace_id(
                s=s,
                token=token,
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )

            chat_id = _atoms_create_chat(
                s=s,
                token=token,
                model=str(args.agent_model),
                chat_agent_mode=str(args.chat_agent_mode),
                workspace_id=int(workspace_id),
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )

            sent = _atoms_send_chat_message(
                s=s,
                token=token,
                chat_id=chat_id,
                message=prompt,
                message_agent_mode=str(args.message_agent_mode),
                default_model=str(args.agent_model),
                impersonate=str(args.impersonate),
                timeout_s=int(args.http_timeout_s),
            )

            if _api_code(sent) != 0:
                raise RuntimeError(f"send chat message failed: {sent}")

            app_ai_key = _poll_app_ai_key_from_chat(
                s=s,
                token=token,
                chat_id=chat_id,
                timeout_s=float(args.agent_timeout_s),
                poll_interval_s=float(args.agent_poll_interval_s),
                first_poll_delay_s=float(args.agent_first_poll_delay_s),
                impersonate=str(args.impersonate),
                http_timeout_s=int(args.http_timeout_s),
            )

            jwt_info.update({
                "provider_type": "atoms",
                "success": True,
                "app_id": chat_id,
                "chat_id": chat_id,
                "app_ai_key": app_ai_key,
                "app_ai_key_masked": _mask_secret(app_ai_key),
                "app_ai_key_sha256": _sha256_hex(app_ai_key) if bool(args.output_key_sha256) else ""
            })

            with state.lock:
                if state.success_count >= state.target_count:
                    break
                task_id = state.success_count + 1
                state.success_count += 1
                
                if output_mode == "dir":
                    saved = output_path / f"atoms_{task_id:03d}.json"
                    _write_json(saved, jwt_info)
                elif output_mode == "jsonl":
                    _append_jsonl(output_path, jwt_info)
                elif output_mode == "summary":
                    _append_summary_text(output_path, jwt_info, task_id=task_id)
                else:
                    _write_json(output_path, jwt_info)
                    
                _safe_print(f"[APIKey-{worker_id}] Task {task_id} success! Key: {jwt_info['app_ai_key_masked']}")
                _emit_task_result(task_id, jwt_info)
                
                if state.success_count >= state.target_count:
                    state.done_event.set()

        except Exception as e:
            _safe_print(f"[APIKey-{worker_id}] Error: {e}")
            state.add_failure()
        finally:
            jwt_queue.task_done()

def main() -> int:
    args = _parse_args()
    count = max(1, int(args.count))
    workers = max(1, min(int(args.workers), count))
    mcp_url_pool = _build_mcp_url_pool(args, workers)

    output_mode = str(args.output_mode or "summary").strip().lower() or "summary"

    output_path = Path(args.output).expanduser().resolve()
    if count > 1 and args.output == str(Path(__file__).resolve().parent / "atoms_account_key_summary.txt") and output_mode == "jsonl":
        output_path = Path(__file__).resolve().parent / "atoms_accounts.jsonl"

    if output_mode == "dir":
        output_path.mkdir(parents=True, exist_ok=True)
    else:
        output_path.parent.mkdir(parents=True, exist_ok=True)

    state = PipelineState(target_count=count)
    
    # Limit queue size to prevent token expiration
    token_queue = queue.Queue(maxsize=3)
    jwt_queue = queue.Queue(maxsize=10)

    # Start pipeline threads
    # Turnstile Producers
    for i, mcp_url in enumerate(mcp_url_pool):
        threading.Thread(target=turnstile_worker, args=(mcp_url, args, state, token_queue), daemon=True).start()

    # Register Consumers/Producers
    # Default to 3 registration threads for concurrency
    reg_workers = max(3, workers) if count > 1 else workers
    for i in range(reg_workers):
        threading.Thread(target=register_worker, args=(i+1, args, state, token_queue, jwt_queue), daemon=True).start()

    # API Key Consumers
    api_workers = max(3, workers) if count > 1 else workers
    for i in range(api_workers):
        threading.Thread(target=apikey_worker, args=(i+1, args, state, jwt_queue, output_path, output_mode), daemon=True).start()

    # Block main thread until finished
    try:
        while not state.done_event.is_set():
            time.sleep(1)
            
        _safe_print(f"Done. success={state.success_count} failure={state.failure_count} output={output_path}")
    except KeyboardInterrupt:
        _safe_print("Interrupted by user.")
    
    return 0

if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
"""
    content = content[:idx] + new_tail
    with open('worker.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated worker.py')
else:
    print('Could not find _run_task')
