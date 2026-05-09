const resetCreditsBtn = document.getElementById("resetCreditsBtn");
const sendChatBtn = document.getElementById("sendChatBtn");
const chatMsgInput = document.getElementById("chatMsgInput");
const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
}

function sendMsg(type, extra = {}) {
  return chrome.runtime.sendMessage({ type, ...extra });
}

// 一键重置额度：清理 → 登录 → 取件填码 → 兑换积分
resetCreditsBtn.addEventListener("click", async () => {
  resetCreditsBtn.disabled = true;
  try {
    setStatus("① 清理登录态...");
    const clearResult = await sendMsg("clear_nodeops_session");
    if (!clearResult?.ok) {
      setStatus(`清理失败: ${clearResult?.error || "unknown"}`);
      return;
    }

    setStatus("② 自动登录中...");
    const loginResult = await sendMsg("navigate_and_login");
    if (!loginResult?.ok) {
      setStatus(`登录失败: ${loginResult?.error || "unknown"}`);
      return;
    }

    setStatus("③ 等待验证码并填入...");
    const fillResult = await sendMsg("fetch_and_fill_verification_code");
    if (!fillResult?.ok) {
      setStatus(`验证码失败: ${fillResult?.error || "unknown"}`);
      return;
    }

    // Wait for login to complete and page to redirect
    setStatus("④ 等待登录跳转...");
    await new Promise((r) => setTimeout(r, 3000));

    setStatus("⑤ 兑换积分中...");
    const creditsResult = await sendMsg("add_credits");
    if (!creditsResult?.ok) {
      setStatus(`兑换失败: ${creditsResult?.error || "unknown"}`);
      return;
    }

    setStatus("✅ 全部完成！已兑换 200 积分");
  } catch (error) {
    setStatus(`失败: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    resetCreditsBtn.disabled = false;
  }
});

// 发送聊天消息
sendChatBtn.addEventListener("click", async () => {
  const text = (chatMsgInput.value || "").trim();
  if (!text) {
    setStatus("请输入要发送的消息");
    return;
  }
  sendChatBtn.disabled = true;
  setStatus("发送中...");
  try {
    const result = await sendMsg("send_chat_message", { text });
    setStatus(result?.ok ? "✅ 消息已发送" : `失败: ${result?.error || "unknown"}`);
  } catch (error) {
    setStatus(`失败: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    sendChatBtn.disabled = false;
  }
});
