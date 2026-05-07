import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'atoms'))

from curl_cffi import requests
from proxy_pool import working_proxy_urls, mask_proxy_url
import time
import random

def test_proxy_rate_limit():
    proxies = working_proxy_urls()
    print(f"Loaded {len(proxies)} proxies.")

    def try_request(proxy=None):
        s = requests.Session()
        if proxy:
            s.proxies = {"http": proxy, "https": proxy}
        
        email = f"test_{random.randint(100000, 999999)}@test.com"
        headers = {
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://atoms.dev/zh/register",
            "X-Locale": "en",
            "X-Request-ID": f"{random.getrandbits(64):016x}{random.getrandbits(64):016x}",
            "version": "atoms",
            "Content-Type": "application/json"
        }
        
        payload = {
            "email": email,
            "password": "Password123!",
            "captcha": "dummy_captcha_" + str(random.randint(1000, 9999)),
            "device_fingerprint": "dummy_fp",
            "redirect": "/"
        }
        
        start = time.time()
        try:
            resp = s.post("https://atoms.dev/api/v1/user/send-magic-link", headers=headers, json=payload, impersonate="chrome120", timeout=10)
            elapsed = time.time() - start
            print(f"[{'Proxy: ' + mask_proxy_url(proxy) if proxy else 'Direct'}] HTTP {resp.status_code} | {resp.text[:100]} | {elapsed:.2f}s")
            return resp.status_code, resp.json() if resp.status_code == 200 else resp.text
        except Exception as e:
            print(f"[{'Proxy: ' + mask_proxy_url(proxy) if proxy else 'Direct'}] Error: {e}")
            return 0, str(e)

    print("Testing direct...")
    for i in range(2):
        try_request(None)
        
    print("\nTesting proxies...")
    for p in proxies:
        try_request(p)

if __name__ == "__main__":
    test_proxy_rate_limit()
