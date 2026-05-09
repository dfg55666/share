const MATCH_PATTERNS = [
  "https://*.nodeops.network/*",
  "https://*.nodeops.xyz/*",
  "https://*.syra.nodeops.app/*"
];

const SEED_ORIGINS = [
  "https://nodeops.network",
  "https://www.nodeops.network",
  "https://createos.nodeops.network",
  "https://nodeops.xyz",
  "https://www.nodeops.xyz",
  "https://syra.nodeops.app"
];

const LOGIN_URL = "https://createos.nodeops.network/";
const LOGIN_EMAIL_PREFIX = "feijidfg55";
const OTP_BRIDGE_URL = "http://127.0.0.1:17897/otp/latest";
const OTP_BRIDGE_APP_PASSWORD = "maqk srdy ucjq bsby";
const OTP_WAIT_TIMEOUT_MS = 5 * 60 * 1000; // bridge long-poll max wait
const OTP_BRIDGE_BUFFER_MS = 15 * 1000;

let lastLoginEmail = null;

async function saveLastLoginEmail(email) {
  lastLoginEmail = email;
  await chrome.storage.local.set({ nodeops_last_login_email: email });
}

async function getLastLoginEmail() {
  if (lastLoginEmail) return lastLoginEmail;
  const data = await chrome.storage.local.get("nodeops_last_login_email");
  const email = data?.nodeops_last_login_email || null;
  if (email) {
    lastLoginEmail = email;
  }
  return email;
}

function normalizeOrigin(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

async function getNodeOpsTabs() {
  const tabMap = new Map();
  for (const pattern of MATCH_PATTERNS) {
    const tabs = await chrome.tabs.query({ url: pattern });
    for (const tab of tabs) {
      if (tab.id) {
        tabMap.set(tab.id, tab);
      }
    }
  }
  return [...tabMap.values()];
}

async function clearStorageInTab(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        try {
          localStorage.clear();
        } catch {}
        try {
          sessionStorage.clear();
        } catch {}
      }
    });
    return true;
  } catch {
    return false;
  }
}

async function clearNodeOpsSession() {
  const tabs = await getNodeOpsTabs();

  const origins = new Set(SEED_ORIGINS);
  for (const tab of tabs) {
    if (tab.url) {
      const origin = normalizeOrigin(tab.url);
      if (origin) {
        origins.add(origin);
      }
    }
  }

  // Also try to clear cookies by domain to be more thorough
  const domains = ["nodeops.network", "nodeops.xyz", "syra.nodeops.app"];
  for (const domain of domains) {
    try {
      const cookies = await chrome.cookies.getAll({ domain });
      for (const cookie of cookies) {
        const protocol = cookie.secure ? "https:" : "http:";
        const url = `${protocol}//${cookie.domain}${cookie.path}`;
        await chrome.cookies.remove({ name: cookie.name, url });
      }
    } catch (err) {
      console.error(`Failed to clear cookies for ${domain}:`, err);
    }
  }

  await chrome.browsingData.remove(
    { origins: [...origins] },
    {
      appcache: true,
      cache: true,
      cacheStorage: true,
      cookies: true,
      fileSystems: true,
      indexedDB: true,
      localStorage: true,
      serviceWorkers: true,
      webSQL: true
    }
  );

  let storageClearedTabCount = 0;
  for (const tab of tabs) {
    const ok = await clearStorageInTab(tab.id);
    if (ok) {
      storageClearedTabCount += 1;
    }
    await chrome.tabs.reload(tab.id);
  }

  return {
    ok: true,
    originCount: origins.size,
    tabCount: tabs.length,
    storageClearedTabCount
  };
}

function waitForTabComplete(tabId, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, timeoutMs);

    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function navigateAndLogin() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { ok: false, error: "No active tab found" };

  await chrome.tabs.update(tab.id, { url: LOGIN_URL });
  await waitForTabComplete(tab.id);

  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [LOGIN_EMAIL_PREFIX],
      func: async (emailPrefix) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const textOf = (el) => (el?.innerText || el?.textContent || "").trim();
        const findButtonBy = (regex) =>
          Array.from(document.querySelectorAll("button, [role='button'], input[type='submit']")).find((el) =>
            regex.test(textOf(el) || el.value || "")
          );
        const waitFor = async (getter, timeoutMs, name) => {
          const deadline = Date.now() + timeoutMs;
          while (Date.now() < deadline) {
            const el = getter();
            if (el) return el;
            await sleep(200);
          }
          throw new Error(`${name} not found`);
        };
        const setInput = (input, value) => {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
          if (setter) setter.call(input, value);
          else input.value = value;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
        };
        const randomString = (length) => {
          const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
          let out = "";
          for (let i = 0; i < length; i++) {
            out += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          return out;
        };

        const loginBtn = await waitFor(
          () => findButtonBy(/login/i),
          15000,
          "login button"
        );
        loginBtn.click();
        await sleep(500);

        const emailInput = await waitFor(
          () =>
            document.querySelector("input[type='email']") ||
            document.querySelector("input[placeholder*='email' i]"),
          15000,
          "email input"
        );
        const continueBtn = await waitFor(
          () =>
            findButtonBy(/continue with email/i) ||
            findButtonBy(/continue/i) ||
            findButtonBy(/next/i),
          15000,
          "continue button"
        );

        const usedEmail = `${emailPrefix}+${randomString(6)}@gmail.com`;
        setInput(emailInput, usedEmail);
        await sleep(350);
        continueBtn.click();

        return { ok: true, usedEmail };
      }
    });
    const result = injected?.result || { ok: false, error: "No script result" };
    if (result.ok && result.usedEmail) {
      await saveLastLoginEmail(result.usedEmail);
    }
    return result;
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function fetchLatestCodeFromBridge() {
  const loginEmail = await getLastLoginEmail();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OTP_WAIT_TIMEOUT_MS + OTP_BRIDGE_BUFFER_MS);
  try {
    const resp = await fetch(OTP_BRIDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to_email_contains: loginEmail || undefined,
        app_password: OTP_BRIDGE_APP_PASSWORD,
        delete_best: true,
        wait_timeout_s: Math.floor(OTP_WAIT_TIMEOUT_MS / 1000),
        poll_interval_s: 5,
        command_timeout_s: 90
      }),
      signal: controller.signal
    });
    let data = null;
    try {
      data = await resp.json();
    } catch {
      data = null;
    }
    if (!resp.ok) {
      const bridgeErr = data?.error || `Bridge HTTP ${resp.status}`;
      return { ok: false, error: bridgeErr };
    }
    if (!data?.ok || !data?.code) {
      const msg = data?.error || "Bridge returned no code";
      return { ok: false, error: msg, bridge: data || undefined };
    }
    return {
      ok: true,
      code: String(data.code),
      matchedTo: data.to || "",
      matchedSubject: data.subject || "",
      matchedDate: data.date || "",
      deleted: Boolean(data.deleted)
    };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { ok: false, error: `OTP wait timeout (${Math.floor(OTP_WAIT_TIMEOUT_MS / 1000)}s)` };
    }
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchAndFillVerificationCode() {
  const loginEmail = await getLastLoginEmail();
  if (!loginEmail) {
    return {
      ok: false,
      error: "No login alias found. Please run step 2 first."
    };
  }
  const fetched = await fetchLatestCodeFromBridge();
  if (!fetched.ok) return fetched;

  const filled = await fillVerificationCode(fetched.code);
  if (!filled.ok) {
    return {
      ok: false,
      error: filled.error,
      fetchedCode: fetched.code
    };
  }

  return {
    ok: true,
    oneClick: true,
    fetchedCode: fetched.code,
    fillMode: filled.fillMode,
    submitClicked: filled.submitClicked,
    matchedTo: fetched.matchedTo,
    matchedSubject: fetched.matchedSubject,
    matchedDate: fetched.matchedDate,
    deleted: fetched.deleted
  };
}

async function fillVerificationCode(code) {
  const digits = String(code || "").replace(/\D/g, "");
  if (digits.length < 4 || digits.length > 8) {
    return { ok: false, error: "Verification code must be 4-8 digits." };
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { ok: false, error: "No active tab found" };

  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [digits],
      func: async (codeValue) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const isVisible = (el) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
        };
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        const setInput = (input, value) => {
          input.focus();
          if (nativeSetter) nativeSetter.call(input, value);
          else input.value = value;
          input.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: value }));
        };
        const textOf = (el) => (el?.innerText || el?.textContent || el?.value || "").trim();
        const allInputs = Array.from(document.querySelectorAll("input")).filter(
          (el) => !el.disabled && el.type !== "hidden" && isVisible(el)
        );

        let fillMode = "";
        const splitInputs = allInputs.filter(
          (el) =>
            el.maxLength === 1 ||
            /otp|code|verification/i.test(`${el.name || ""} ${el.id || ""} ${el.autocomplete || ""}`)
        );

        const orderedSplitInputs = splitInputs
          .slice()
          .sort((a, b) => {
            const ar = a.getBoundingClientRect();
            const br = b.getBoundingClientRect();
            if (Math.abs(ar.top - br.top) > 6) return ar.top - br.top;
            return ar.left - br.left;
          });

        if (orderedSplitInputs.length >= codeValue.length) {
          // Focus first input, then fill one digit at a time with delay
          orderedSplitInputs[0].focus();
          await sleep(50);
          for (let idx = 0; idx < codeValue.length; idx++) {
            const char = codeValue[idx];
            const currentInput = orderedSplitInputs[idx];
            currentInput.focus();
            await sleep(30);
            if (nativeSetter) nativeSetter.call(currentInput, char);
            else currentInput.value = char;
            currentInput.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: char }));
            currentInput.dispatchEvent(new Event("change", { bubbles: true }));
            currentInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: char }));
            await sleep(100);
          }
          fillMode = "split-inputs";
        } else {
          const single =
            allInputs.find((el) => (el.maxLength <= 0 || el.maxLength >= codeValue.length) && /otp|code|verification/i.test(`${el.name || ""} ${el.id || ""} ${el.placeholder || ""}`)) ||
            allInputs.find((el) => el.maxLength <= 0 || el.maxLength >= codeValue.length) ||
            null;
          if (!single) {
            return { ok: false, error: "No verification input found" };
          }
          setInput(single, codeValue);
          fillMode = "single-input";
        }

        // After filling all digits, press Enter on the focused last input
        await sleep(500);
        let submitClicked = false;
        const beforeHref = location.href;

        const activeEl = document.activeElement;
        const enterOpts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
        if (activeEl) {
          activeEl.dispatchEvent(new KeyboardEvent("keydown", enterOpts));
          activeEl.dispatchEvent(new KeyboardEvent("keypress", enterOpts));
          activeEl.dispatchEvent(new KeyboardEvent("keyup", { ...enterOpts, cancelable: false }));
          submitClicked = true;
        }

        // Fallback: if Enter didn't work, try clicking submit button
        await sleep(1000);
        if (location.href === beforeHref) {
          const form = document.querySelector("form");
          const submitBtn = form && form.querySelector("button[type='submit']");
          if (submitBtn && !submitBtn.disabled) {
            submitBtn.click();
          }
        }

        await sleep(500);

        return {
          ok: true,
          fillMode,
          submitClicked,
          navigated: location.href !== beforeHref
        };
      }
    });
    return injected?.result || { ok: false, error: "No script result" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const CHAT_URL = "https://createos.nodeops.network/chat";

async function addCredits() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { ok: false, error: "No active tab found" };

  // Navigate to chat page
  await chrome.tabs.update(tab.id, { url: CHAT_URL });
  await waitForTabComplete(tab.id);

  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
        const textOf = (el) => (el?.innerText || el?.textContent || "").trim();
        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set;

        // Wait for and click "Manage Credits" button
        const deadline1 = Date.now() + 15000;
        let manageBtn = null;
        while (Date.now() < deadline1) {
          manageBtn = Array.from(
            document.querySelectorAll("button")
          ).find((el) => /manage\s*credits/i.test(textOf(el)));
          if (manageBtn) break;
          await sleep(300);
        }
        if (!manageBtn) {
          return { ok: false, error: "Manage Credits button not found" };
        }
        manageBtn.click();
        await sleep(1000);

        // Find the credits input and set to 200
        const deadline2 = Date.now() + 10000;
        let creditsInput = null;
        while (Date.now() < deadline2) {
          creditsInput = document.querySelector("input#add-credits")
            || document.querySelector("input[type='number']");
          if (creditsInput) break;
          await sleep(300);
        }
        if (!creditsInput) {
          return { ok: false, error: "Credits input not found" };
        }
        creditsInput.focus();
        if (nativeSetter) nativeSetter.call(creditsInput, "200");
        else creditsInput.value = "200";
        creditsInput.dispatchEvent(new InputEvent("input", {
          bubbles: true, inputType: "insertText", data: "200"
        }));
        creditsInput.dispatchEvent(new Event("change", { bubbles: true }));
        await sleep(500);

        // Find and click the "Add 200 create credits" button
        const deadline3 = Date.now() + 5000;
        let addBtn = null;
        while (Date.now() < deadline3) {
          addBtn = Array.from(
            document.querySelectorAll("button")
          ).find((el) => /add\s+\d+\s+create\s+credits/i.test(textOf(el)));
          if (addBtn && !addBtn.disabled) break;
          addBtn = null;
          await sleep(300);
        }
        if (!addBtn) {
          return { ok: false, error: "Add credits button not found or disabled" };
        }
        addBtn.click();

        return { ok: true, credits: 200 };
      }
    });
    return injected?.result || { ok: false, error: "No script result" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function sendChatMessage(text) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { ok: false, error: "No active tab found" };

  // Make sure we're on the chat page
  if (!tab.url || !tab.url.includes("createos.nodeops.network")) {
    await chrome.tabs.update(tab.id, { url: CHAT_URL });
    await waitForTabComplete(tab.id);
  }

  try {
    const [injected] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      args: [text],
      func: async (message) => {
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        // Wait for the contenteditable input to appear
        const deadline = Date.now() + 15000;
        let editor = null;
        while (Date.now() < deadline) {
          editor = document.querySelector("div[contenteditable='true'][aria-label='Message input']");
          if (editor) break;
          await sleep(300);
        }
        if (!editor) {
          return { ok: false, error: "Chat input not found" };
        }

        // Focus and type message
        editor.focus();
        await sleep(100);
        editor.textContent = message;
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: message }));
        await sleep(300);

        // Press Enter to send
        const enterOpts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true, cancelable: true };
        editor.dispatchEvent(new KeyboardEvent("keydown", enterOpts));
        editor.dispatchEvent(new KeyboardEvent("keypress", enterOpts));
        editor.dispatchEvent(new KeyboardEvent("keyup", { ...enterOpts, cancelable: false }));

        return { ok: true, message };
      }
    });
    return injected?.result || { ok: false, error: "No script result" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "clear_nodeops_session") {
    clearNodeOpsSession()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === "navigate_and_login") {
    navigateAndLogin()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === "fill_verification_code") {
    fillVerificationCode(message.code)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === "fetch_and_fill_verification_code") {
    fetchAndFillVerificationCode()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === "add_credits") {
    addCredits()
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }

  if (message.type === "send_chat_message") {
    sendChatMessage(message.text)
      .then((result) => sendResponse(result))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error)
        })
      );
    return true;
  }
}
);
