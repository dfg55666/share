import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/pages/Index.tsx");import * as RefreshRuntime from "/@react-refresh";
const inWebWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope;

let prevRefreshReg;
let prevRefreshSig;

if (import.meta.hot && !inWebWorker) {
  if (!window.$RefreshReg$) {
    throw new Error(
      "@vitejs/plugin-react-swc can't detect preamble. Something is wrong."
    );
  }

  prevRefreshReg = window.$RefreshReg$;
  prevRefreshSig = window.$RefreshSig$;
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/workspace/app/frontend/src/pages/Index.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}

import __vite__cjsImport2_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0aaf13fe"; const _jsxDEV = __vite__cjsImport2_react_jsxDevRuntime["jsxDEV"];
var _s = $RefreshSig$();
import __vite__cjsImport3_react from "/node_modules/.vite/deps/react.js?v=25dfb002"; const useState = __vite__cjsImport3_react["useState"]; const useRef = __vite__cjsImport3_react["useRef"]; const useEffect = __vite__cjsImport3_react["useEffect"];
import { createClient } from "/node_modules/.vite/deps/@metagptx_web-sdk.js?v=ba0f810c";
import { Button } from "/src/components/ui/button.tsx";
import { Input } from "/src/components/ui/input.tsx";
import { ScrollArea } from "/src/components/ui/scroll-area.tsx";
import { Send, Bot, User, Loader2 } from "/node_modules/.vite/deps/lucide-react.js?v=f9e80897";
const client = createClient();
export default function Index() {
    _s();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    useEffect(()=>{
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [
        messages
    ]);
    const handleSend = async ()=>{
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: trimmed
        };
        setMessages((prev)=>[
                ...prev,
                userMessage
            ]);
        setInput('');
        setIsLoading(true);
        const assistantId = (Date.now() + 1).toString();
        const assistantMessage = {
            id: assistantId,
            role: 'assistant',
            content: ''
        };
        setMessages((prev)=>[
                ...prev,
                assistantMessage
            ]);
        const chatHistory = [
            ...messages,
            userMessage
        ].map((m)=>({
                role: m.role,
                content: m.content
            }));
        try {
            await client.ai.gentxt({
                messages: chatHistory,
                model: 'claude-opus-4.6',
                stream: true,
                onChunk: (chunk)=>{
                    if (chunk.content) {
                        setMessages((prev)=>prev.map((m)=>m.id === assistantId ? {
                                    ...m,
                                    content: m.content + chunk.content
                                } : m));
                    }
                },
                onComplete: ()=>{
                    setIsLoading(false);
                    inputRef.current?.focus();
                },
                onError: (error)=>{
                    setMessages((prev)=>prev.map((m)=>m.id === assistantId ? {
                                ...m,
                                content: `Error: ${error?.message || '请求失败，请重试'}`
                            } : m));
                    setIsLoading(false);
                },
                timeout: 60000
            });
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : '请求失败，请重试';
            setMessages((prev)=>prev.map((m)=>m.id === assistantId ? {
                        ...m,
                        content: `Error: ${errorMsg}`
                    } : m));
            setIsLoading(false);
        }
    };
    const handleKeyDown = (e)=>{
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };
    return /*#__PURE__*/ _jsxDEV("div", {
        className: "flex flex-col h-screen bg-[#1a1a2e]",
        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
        "data-mgx-line": "109",
        "data-mgx-start-column": "4",
        "data-mgx-tag": "div",
        "data-mgx-component": "%20%20%20%20%3Cdiv%20className%3D%22flex%20flex-col%20h-screen%20bg-%5B%231a1a2e%5D%22%3E",
        "data-mgx-id": "app/frontend/src/pages/Index.tsx:109:4",
        "data-mgx-project": "jsx",
        "data-mgx-text": "",
        children: [
            /*#__PURE__*/ _jsxDEV("header", {
                className: "flex items-center gap-3 px-6 py-4 border-b border-white/10 bg-[#16213e]",
                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                "data-mgx-line": "111",
                "data-mgx-start-column": "6",
                "data-mgx-tag": "header",
                "data-mgx-component": "%20%20%20%20%20%20%3Cheader%20className%3D%22flex%20items-center%20gap-3%20px-6%20py-4%20border-b%20border-white%2F10%20bg-%5B%2316213e%5D%22%3E",
                "data-mgx-id": "app/frontend/src/pages/Index.tsx:111:6",
                "data-mgx-project": "jsx",
                "data-mgx-text": "",
                children: [
                    /*#__PURE__*/ _jsxDEV("div", {
                        className: "flex items-center justify-center w-9 h-9 rounded-full bg-[#e94560]",
                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                        "data-mgx-line": "112",
                        "data-mgx-start-column": "8",
                        "data-mgx-tag": "div",
                        "data-mgx-component": "%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22flex%20items-center%20justify-center%20w-9%20h-9%20rounded-full%20bg-%5B%23e94560%5D%22%3E",
                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:112:8",
                        "data-mgx-project": "jsx",
                        "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20",
                        children: /*#__PURE__*/ _jsxDEV(Bot, {
                            className: "w-5 h-5 text-white",
                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                            "data-mgx-line": "113",
                            "data-mgx-start-column": "10",
                            "data-mgx-tag": "Bot",
                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3CBot%20className%3D%22w-5%20h-5%20text-white%22%20%2F%3E",
                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:113:10",
                            "data-mgx-project": "jsx",
                            "data-mgx-text": ""
                        }, void 0, false, {
                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                            lineNumber: 95,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("div", {
                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                        "data-mgx-line": "115",
                        "data-mgx-start-column": "8",
                        "data-mgx-tag": "div",
                        "data-mgx-component": "%20%20%20%20%20%20%20%20%3Cdiv%3E",
                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:115:8",
                        "data-mgx-project": "jsx",
                        "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20",
                        children: [
                            /*#__PURE__*/ _jsxDEV("h1", {
                                className: "text-lg font-semibold text-white",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "116",
                                "data-mgx-start-column": "10",
                                "data-mgx-tag": "h1",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3Ch1%20className%3D%22text-lg%20font-semibold%20text-white%22%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:116:10",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": "AI%20Chat",
                                children: "AI Chat"
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 98,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("p", {
                                className: "text-xs text-white/50",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "117",
                                "data-mgx-start-column": "10",
                                "data-mgx-tag": "p",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3Cp%20className%3D%22text-xs%20text-white%2F50%22%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:117:10",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": "Powered%20by%20Claude%20Opus%204.6",
                                children: "Powered by Claude Opus 4.6"
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 99,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                        lineNumber: 97,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV(ScrollArea, {
                className: "flex-1 px-4 py-6",
                ref: scrollRef,
                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                "data-mgx-line": "122",
                "data-mgx-start-column": "6",
                "data-mgx-tag": "ScrollArea",
                "data-mgx-component": "%20%20%20%20%20%20%3CScrollArea%20className%3D%22flex-1%20px-4%20py-6%22%20ref%3D%7BscrollRef%7D%3E",
                "data-mgx-id": "app/frontend/src/pages/Index.tsx:122:6",
                "data-mgx-project": "jsx",
                "data-mgx-text": "",
                children: [
                    messages.length === 0 && /*#__PURE__*/ _jsxDEV("div", {
                        className: "flex flex-col items-center justify-center h-full text-center text-white/40 mt-32",
                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                        "data-mgx-line": "124",
                        "data-mgx-start-column": "10",
                        "data-mgx-tag": "div",
                        "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22flex%20flex-col%20items-center%20justify-center%20h-full%20text-center%20text-white%2F40%20mt-32%22%3E",
                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:124:10",
                        "data-mgx-project": "jsx",
                        "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20",
                        children: [
                            /*#__PURE__*/ _jsxDEV(Bot, {
                                className: "w-16 h-16 mb-4 opacity-30",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "125",
                                "data-mgx-start-column": "12",
                                "data-mgx-tag": "Bot",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%3CBot%20className%3D%22w-16%20h-16%20mb-4%20opacity-30%22%20%2F%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:125:12",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": ""
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 106,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ _jsxDEV("p", {
                                className: "text-lg font-medium",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "126",
                                "data-mgx-start-column": "12",
                                "data-mgx-tag": "p",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%3Cp%20className%3D%22text-lg%20font-medium%22%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:126:12",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": "%E5%BC%80%E5%A7%8B%E5%AF%B9%E8%AF%9D",
                                children: "开始对话"
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 107,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ _jsxDEV("p", {
                                className: "text-sm mt-1",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "127",
                                "data-mgx-start-column": "12",
                                "data-mgx-tag": "p",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%3Cp%20className%3D%22text-sm%20mt-1%22%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:127:12",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": "%E8%BE%93%E5%85%A5%E6%B6%88%E6%81%AF%EF%BC%8C%E4%B8%8E%20AI%20%E5%8A%A9%E6%89%8B%E4%BA%A4%E6%B5%81",
                                children: "输入消息，与 AI 助手交流"
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 108,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                        lineNumber: 105,
                        columnNumber: 35
                    }, this),
                    /*#__PURE__*/ _jsxDEV("div", {
                        className: "max-w-3xl mx-auto space-y-4",
                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                        "data-mgx-line": "130",
                        "data-mgx-start-column": "8",
                        "data-mgx-tag": "div",
                        "data-mgx-component": "%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22max-w-3xl%20mx-auto%20space-y-4%22%3E",
                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:130:8",
                        "data-mgx-project": "jsx",
                        "data-mgx-text": "",
                        children: messages.map((message)=>/*#__PURE__*/ _jsxDEV("div", {
                                className: `flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`,
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "132",
                                "data-mgx-start-column": "12",
                                "data-mgx-tag": "div",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20key%3D%7Bmessage.id%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20className%3D%7B%60flex%20gap-3%20%24%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20message.role%20%3D%3D%3D%20'user'%20%3F%20'justify-end'%20%3A%20'justify-start'%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%60%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:132:12",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": "",
                                children: [
                                    message.role === 'assistant' && /*#__PURE__*/ _jsxDEV("div", {
                                        className: "flex-shrink-0 w-8 h-8 rounded-full bg-[#e94560] flex items-center justify-center mt-1",
                                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                        "data-mgx-line": "139",
                                        "data-mgx-start-column": "16",
                                        "data-mgx-tag": "div",
                                        "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22flex-shrink-0%20w-8%20h-8%20rounded-full%20bg-%5B%23e94560%5D%20flex%20items-center%20justify-center%20mt-1%22%3E",
                                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:139:16",
                                        "data-mgx-project": "jsx",
                                        "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20",
                                        children: /*#__PURE__*/ _jsxDEV(Bot, {
                                            className: "w-4 h-4 text-white",
                                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                            "data-mgx-line": "140",
                                            "data-mgx-start-column": "18",
                                            "data-mgx-tag": "Bot",
                                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CBot%20className%3D%22w-4%20h-4%20text-white%22%20%2F%3E",
                                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:140:18",
                                            "data-mgx-project": "jsx",
                                            "data-mgx-text": ""
                                        }, void 0, false, {
                                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                            lineNumber: 113,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                        lineNumber: 112,
                                        columnNumber: 48
                                    }, this),
                                    /*#__PURE__*/ _jsxDEV("div", {
                                        className: `max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'bg-[#0f3460] text-white rounded-br-md' : 'bg-[#16213e] text-white/90 rounded-bl-md border border-white/5'}`,
                                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                        "data-mgx-line": "143",
                                        "data-mgx-start-column": "14",
                                        "data-mgx-tag": "div",
                                        "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20className%3D%7B%60max-w-%5B75%25%5D%20rounded-2xl%20px-4%20py-3%20text-sm%20leading-relaxed%20whitespace-pre-wrap%20%24%7B%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20message.role%20%3D%3D%3D%20'user'%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3F%20'bg-%5B%230f3460%5D%20text-white%20rounded-br-md'%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3A%20'bg-%5B%2316213e%5D%20text-white%2F90%20rounded-bl-md%20border%20border-white%2F5'%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%7D%60%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3E",
                                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:143:14",
                                        "data-mgx-project": "jsx",
                                        "data-mgx-text": "",
                                        children: message.content || /*#__PURE__*/ _jsxDEV("span", {
                                            className: "flex items-center gap-2 text-white/50",
                                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                            "data-mgx-line": "151",
                                            "data-mgx-start-column": "18",
                                            "data-mgx-tag": "span",
                                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3Cspan%20className%3D%22flex%20items-center%20gap-2%20text-white%2F50%22%3E",
                                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:151:18",
                                            "data-mgx-project": "jsx",
                                            "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%E6%80%9D%E8%80%83%E4%B8%AD...%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20",
                                            children: [
                                                /*#__PURE__*/ _jsxDEV(Loader2, {
                                                    className: "w-3 h-3 animate-spin",
                                                    "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                                    "data-mgx-line": "152",
                                                    "data-mgx-start-column": "20",
                                                    "data-mgx-tag": "Loader2",
                                                    "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CLoader2%20className%3D%22w-3%20h-3%20animate-spin%22%20%2F%3E",
                                                    "data-mgx-id": "app/frontend/src/pages/Index.tsx:152:20",
                                                    "data-mgx-project": "jsx",
                                                    "data-mgx-text": ""
                                                }, void 0, false, {
                                                    fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                                    lineNumber: 117,
                                                    columnNumber: 21
                                                }, this),
                                                "思考中..."
                                            ]
                                        }, void 0, true, {
                                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                            lineNumber: 116,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                        lineNumber: 115,
                                        columnNumber: 15
                                    }, this),
                                    message.role === 'user' && /*#__PURE__*/ _jsxDEV("div", {
                                        className: "flex-shrink-0 w-8 h-8 rounded-full bg-[#0f3460] flex items-center justify-center mt-1 border border-white/10",
                                        "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                        "data-mgx-line": "158",
                                        "data-mgx-start-column": "16",
                                        "data-mgx-tag": "div",
                                        "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22flex-shrink-0%20w-8%20h-8%20rounded-full%20bg-%5B%230f3460%5D%20flex%20items-center%20justify-center%20mt-1%20border%20border-white%2F10%22%3E",
                                        "data-mgx-id": "app/frontend/src/pages/Index.tsx:158:16",
                                        "data-mgx-project": "jsx",
                                        "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20",
                                        children: /*#__PURE__*/ _jsxDEV(User, {
                                            className: "w-4 h-4 text-white",
                                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                            "data-mgx-line": "159",
                                            "data-mgx-start-column": "18",
                                            "data-mgx-tag": "User",
                                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CUser%20className%3D%22w-4%20h-4%20text-white%22%20%2F%3E",
                                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:159:18",
                                            "data-mgx-project": "jsx",
                                            "data-mgx-text": ""
                                        }, void 0, false, {
                                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                            lineNumber: 122,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                        lineNumber: 121,
                                        columnNumber: 43
                                    }, this)
                                ]
                            }, message.id, true, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 111,
                                columnNumber: 36
                            }, this))
                    }, void 0, false, {
                        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                        lineNumber: 110,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                className: "border-t border-white/10 bg-[#16213e] px-4 py-4",
                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                "data-mgx-line": "168",
                "data-mgx-start-column": "6",
                "data-mgx-tag": "div",
                "data-mgx-component": "%20%20%20%20%20%20%3Cdiv%20className%3D%22border-t%20border-white%2F10%20bg-%5B%2316213e%5D%20px-4%20py-4%22%3E",
                "data-mgx-id": "app/frontend/src/pages/Index.tsx:168:6",
                "data-mgx-project": "jsx",
                "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20",
                children: /*#__PURE__*/ _jsxDEV("div", {
                    className: "max-w-3xl mx-auto flex gap-3",
                    "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                    "data-mgx-line": "169",
                    "data-mgx-start-column": "8",
                    "data-mgx-tag": "div",
                    "data-mgx-component": "%20%20%20%20%20%20%20%20%3Cdiv%20className%3D%22max-w-3xl%20mx-auto%20flex%20gap-3%22%3E",
                    "data-mgx-id": "app/frontend/src/pages/Index.tsx:169:8",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": "%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20%20%20%0A%20%20%20%20%20%20%20%20",
                    children: [
                        /*#__PURE__*/ _jsxDEV(Input, {
                            ref: inputRef,
                            value: input,
                            onChange: (e)=>setInput(e.target.value),
                            onKeyDown: handleKeyDown,
                            placeholder: "输入消息...",
                            disabled: isLoading,
                            className: "flex-1 bg-[#1a1a2e] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#e94560] focus-visible:ring-1 rounded-xl h-11",
                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                            "data-mgx-line": "170",
                            "data-mgx-start-column": "10",
                            "data-mgx-tag": "Input",
                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3CInput%0A%20%20%20%20%20%20%20%20%20%20%20%20ref%3D%7BinputRef%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20value%3D%7Binput%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20onChange%3D%7B(e)%20%3D%3E%20setInput(e.target.value)%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20onKeyDown%3D%7BhandleKeyDown%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20placeholder%3D%22%E8%BE%93%E5%85%A5%E6%B6%88%E6%81%AF...%22%0A%20%20%20%20%20%20%20%20%20%20%20%20disabled%3D%7BisLoading%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20className%3D%22flex-1%20bg-%5B%231a1a2e%5D%20border-white%2F10%20text-white%20placeholder%3Atext-white%2F30%20focus-visible%3Aring-%5B%23e94560%5D%20focus-visible%3Aring-1%20rounded-xl%20h-11%22%0A%20%20%20%20%20%20%20%20%20%20%2F%3E",
                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:170:10",
                            "data-mgx-project": "jsx",
                            "data-mgx-text": ""
                        }, void 0, false, {
                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                            lineNumber: 131,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ _jsxDEV(Button, {
                            onClick: handleSend,
                            disabled: !input.trim() || isLoading,
                            className: "bg-[#e94560] hover:bg-[#d63851] text-white rounded-xl h-11 w-11 p-0 flex items-center justify-center disabled:opacity-40",
                            "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                            "data-mgx-line": "179",
                            "data-mgx-start-column": "10",
                            "data-mgx-tag": "Button",
                            "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%3CButton%0A%20%20%20%20%20%20%20%20%20%20%20%20onClick%3D%7BhandleSend%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20disabled%3D%7B!input.trim()%20%7C%7C%20isLoading%7D%0A%20%20%20%20%20%20%20%20%20%20%20%20className%3D%22bg-%5B%23e94560%5D%20hover%3Abg-%5B%23d63851%5D%20text-white%20rounded-xl%20h-11%20w-11%20p-0%20flex%20items-center%20justify-center%20disabled%3Aopacity-40%22%0A%20%20%20%20%20%20%20%20%20%20%3E",
                            "data-mgx-id": "app/frontend/src/pages/Index.tsx:179:10",
                            "data-mgx-project": "jsx",
                            "data-mgx-text": "",
                            children: isLoading ? /*#__PURE__*/ _jsxDEV(Loader2, {
                                className: "w-4 h-4 animate-spin",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "185",
                                "data-mgx-start-column": "14",
                                "data-mgx-tag": "Loader2",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CLoader2%20className%3D%22w-4%20h-4%20animate-spin%22%20%2F%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:185:14",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": ""
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 133,
                                columnNumber: 26
                            }, this) : /*#__PURE__*/ _jsxDEV(Send, {
                                className: "w-4 h-4",
                                "data-mgx-path": "app/frontend/src/pages/Index.tsx",
                                "data-mgx-line": "187",
                                "data-mgx-start-column": "14",
                                "data-mgx-tag": "Send",
                                "data-mgx-component": "%20%20%20%20%20%20%20%20%20%20%20%20%20%20%3CSend%20className%3D%22w-4%20h-4%22%20%2F%3E",
                                "data-mgx-id": "app/frontend/src/pages/Index.tsx:187:14",
                                "data-mgx-project": "jsx",
                                "data-mgx-text": ""
                            }, void 0, false, {
                                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                                lineNumber: 133,
                                columnNumber: 414
                            }, this)
                        }, void 0, false, {
                            fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                            lineNumber: 132,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                    lineNumber: 130,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "/workspace/app/frontend/src/pages/Index.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "/workspace/app/frontend/src/pages/Index.tsx",
        lineNumber: 91,
        columnNumber: 10
    }, this);
}
_s(Index, "fx9WjfIMz9oNB5eUibeWGRPWGCM=");
_c = Index;
var _c;
$RefreshReg$(_c, "Index");


if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}


if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/workspace/app/frontend/src/pages/Index.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/workspace/app/frontend/src/pages/Index.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkluZGV4LnRzeCJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyB1c2VTdGF0ZSwgdXNlUmVmLCB1c2VFZmZlY3QgfSBmcm9tICdyZWFjdCc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAbWV0YWdwdHgvd2ViLXNkayc7XG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tICdAL2NvbXBvbmVudHMvdWkvYnV0dG9uJztcbmltcG9ydCB7IElucHV0IH0gZnJvbSAnQC9jb21wb25lbnRzL3VpL2lucHV0JztcbmltcG9ydCB7IFNjcm9sbEFyZWEgfSBmcm9tICdAL2NvbXBvbmVudHMvdWkvc2Nyb2xsLWFyZWEnO1xuaW1wb3J0IHsgU2VuZCwgQm90LCBVc2VyLCBMb2FkZXIyIH0gZnJvbSAnbHVjaWRlLXJlYWN0JztcbmNvbnN0IGNsaWVudCA9IGNyZWF0ZUNsaWVudCgpO1xuaW50ZXJmYWNlIE1lc3NhZ2Uge1xuICBpZDogc3RyaW5nO1xuICByb2xlOiAndXNlcicgfCAnYXNzaXN0YW50JztcbiAgY29udGVudDogc3RyaW5nO1xufVxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gSW5kZXgoKSB7XG4gIGNvbnN0IFttZXNzYWdlcywgc2V0TWVzc2FnZXNdID0gdXNlU3RhdGU8TWVzc2FnZVtdPihbXSk7XG4gIGNvbnN0IFtpbnB1dCwgc2V0SW5wdXRdID0gdXNlU3RhdGUoJycpO1xuICBjb25zdCBbaXNMb2FkaW5nLCBzZXRJc0xvYWRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBzY3JvbGxSZWYgPSB1c2VSZWY8SFRNTERpdkVsZW1lbnQ+KG51bGwpO1xuICBjb25zdCBpbnB1dFJlZiA9IHVzZVJlZjxIVE1MSW5wdXRFbGVtZW50PihudWxsKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoc2Nyb2xsUmVmLmN1cnJlbnQpIHtcbiAgICAgIHNjcm9sbFJlZi5jdXJyZW50LnNjcm9sbFRvcCA9IHNjcm9sbFJlZi5jdXJyZW50LnNjcm9sbEhlaWdodDtcbiAgICB9XG4gIH0sIFttZXNzYWdlc10pO1xuICBjb25zdCBoYW5kbGVTZW5kID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHRyaW1tZWQgPSBpbnB1dC50cmltKCk7XG4gICAgaWYgKCF0cmltbWVkIHx8IGlzTG9hZGluZykgcmV0dXJuO1xuICAgIGNvbnN0IHVzZXJNZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IERhdGUubm93KCkudG9TdHJpbmcoKSxcbiAgICAgIHJvbGU6ICd1c2VyJyxcbiAgICAgIGNvbnRlbnQ6IHRyaW1tZWRcbiAgICB9O1xuICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gWy4uLnByZXYsIHVzZXJNZXNzYWdlXSk7XG4gICAgc2V0SW5wdXQoJycpO1xuICAgIHNldElzTG9hZGluZyh0cnVlKTtcbiAgICBjb25zdCBhc3Npc3RhbnRJZCA9IChEYXRlLm5vdygpICsgMSkudG9TdHJpbmcoKTtcbiAgICBjb25zdCBhc3Npc3RhbnRNZXNzYWdlOiBNZXNzYWdlID0ge1xuICAgICAgaWQ6IGFzc2lzdGFudElkLFxuICAgICAgcm9sZTogJ2Fzc2lzdGFudCcsXG4gICAgICBjb250ZW50OiAnJ1xuICAgIH07XG4gICAgc2V0TWVzc2FnZXMocHJldiA9PiBbLi4ucHJldiwgYXNzaXN0YW50TWVzc2FnZV0pO1xuICAgIGNvbnN0IGNoYXRIaXN0b3J5ID0gWy4uLm1lc3NhZ2VzLCB1c2VyTWVzc2FnZV0ubWFwKG0gPT4gKHtcbiAgICAgIHJvbGU6IG0ucm9sZSBhcyAndXNlcicgfCAnYXNzaXN0YW50JyxcbiAgICAgIGNvbnRlbnQ6IG0uY29udGVudFxuICAgIH0pKTtcbiAgICB0cnkge1xuICAgICAgYXdhaXQgY2xpZW50LmFpLmdlbnR4dCh7XG4gICAgICAgIG1lc3NhZ2VzOiBjaGF0SGlzdG9yeSxcbiAgICAgICAgbW9kZWw6ICdjbGF1ZGUtb3B1cy00LjYnLFxuICAgICAgICBzdHJlYW06IHRydWUsXG4gICAgICAgIG9uQ2h1bms6IChjaHVuazoge1xuICAgICAgICAgIGNvbnRlbnQ/OiBzdHJpbmc7XG4gICAgICAgIH0pID0+IHtcbiAgICAgICAgICBpZiAoY2h1bmsuY29udGVudCkge1xuICAgICAgICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBwcmV2Lm1hcChtID0+IG0uaWQgPT09IGFzc2lzdGFudElkID8ge1xuICAgICAgICAgICAgICAuLi5tLFxuICAgICAgICAgICAgICBjb250ZW50OiBtLmNvbnRlbnQgKyBjaHVuay5jb250ZW50XG4gICAgICAgICAgICB9IDogbSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25Db21wbGV0ZTogKCkgPT4ge1xuICAgICAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgICAgICAgaW5wdXRSZWYuY3VycmVudD8uZm9jdXMoKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcjogKGVycm9yOiB7XG4gICAgICAgICAgbWVzc2FnZT86IHN0cmluZztcbiAgICAgICAgfSkgPT4ge1xuICAgICAgICAgIHNldE1lc3NhZ2VzKHByZXYgPT4gcHJldi5tYXAobSA9PiBtLmlkID09PSBhc3Npc3RhbnRJZCA/IHtcbiAgICAgICAgICAgIC4uLm0sXG4gICAgICAgICAgICBjb250ZW50OiBgRXJyb3I6ICR7ZXJyb3I/Lm1lc3NhZ2UgfHwgJ+ivt+axguWksei0pe+8jOivt+mHjeivlSd9YFxuICAgICAgICAgIH0gOiBtKSk7XG4gICAgICAgICAgc2V0SXNMb2FkaW5nKGZhbHNlKTtcbiAgICAgICAgfSxcbiAgICAgICAgdGltZW91dDogNjBfMDAwXG4gICAgICB9KTtcbiAgICB9IGNhdGNoIChlOiB1bmtub3duKSB7XG4gICAgICBjb25zdCBlcnJvck1zZyA9IGUgaW5zdGFuY2VvZiBFcnJvciA/IGUubWVzc2FnZSA6ICfor7fmsYLlpLHotKXvvIzor7fph43or5UnO1xuICAgICAgc2V0TWVzc2FnZXMocHJldiA9PiBwcmV2Lm1hcChtID0+IG0uaWQgPT09IGFzc2lzdGFudElkID8ge1xuICAgICAgICAuLi5tLFxuICAgICAgICBjb250ZW50OiBgRXJyb3I6ICR7ZXJyb3JNc2d9YFxuICAgICAgfSA6IG0pKTtcbiAgICAgIHNldElzTG9hZGluZyhmYWxzZSk7XG4gICAgfVxuICB9O1xuICBjb25zdCBoYW5kbGVLZXlEb3duID0gKGU6IFJlYWN0LktleWJvYXJkRXZlbnQpID0+IHtcbiAgICBpZiAoZS5rZXkgPT09ICdFbnRlcicgJiYgIWUuc2hpZnRLZXkpIHtcbiAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGhhbmRsZVNlbmQoKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImZsZXggZmxleC1jb2wgaC1zY3JlZW4gYmctWyMxYTFhMmVdXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjEwOVwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjRcIiBkYXRhLW1neC10YWc9XCJkaXZcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlM0NkaXYlMjBjbGFzc05hbWUlM0QlMjJmbGV4JTIwZmxleC1jb2wlMjBoLXNjcmVlbiUyMGJnLSU1QiUyMzFhMWEyZSU1RCUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTA5OjRcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiPlxuICAgICAgey8qIEhlYWRlciAqL31cbiAgICAgIDxoZWFkZXIgY2xhc3NOYW1lPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTMgcHgtNiBweS00IGJvcmRlci1iIGJvcmRlci13aGl0ZS8xMCBiZy1bIzE2MjEzZV1cIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTExXCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiNlwiIGRhdGEtbWd4LXRhZz1cImhlYWRlclwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUzQ2hlYWRlciUyMGNsYXNzTmFtZSUzRCUyMmZsZXglMjBpdGVtcy1jZW50ZXIlMjBnYXAtMyUyMHB4LTYlMjBweS00JTIwYm9yZGVyLWIlMjBib3JkZXItd2hpdGUlMkYxMCUyMGJnLSU1QiUyMzE2MjEzZSU1RCUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTExOjZcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiPlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyIHctOSBoLTkgcm91bmRlZC1mdWxsIGJnLVsjZTk0NTYwXVwiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxMTJcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI4XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTIwY2xhc3NOYW1lJTNEJTIyZmxleCUyMGl0ZW1zLWNlbnRlciUyMGp1c3RpZnktY2VudGVyJTIwdy05JTIwaC05JTIwcm91bmRlZC1mdWxsJTIwYmctJTVCJTIzZTk0NTYwJTVEJTIyJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxMTI6OFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwXCI+XG4gICAgICAgICAgPEJvdCBjbGFzc05hbWU9XCJ3LTUgaC01IHRleHQtd2hpdGVcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTEzXCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTBcIiBkYXRhLW1neC10YWc9XCJCb3RcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NCb3QlMjBjbGFzc05hbWUlM0QlMjJ3LTUlMjBoLTUlMjB0ZXh0LXdoaXRlJTIyJTIwJTJGJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxMTM6MTBcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiIC8+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxMTVcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI4XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxMTU6OFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwXCI+XG4gICAgICAgICAgPGgxIGNsYXNzTmFtZT1cInRleHQtbGcgZm9udC1zZW1pYm9sZCB0ZXh0LXdoaXRlXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjExNlwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjEwXCIgZGF0YS1tZ3gtdGFnPVwiaDFcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NoMSUyMGNsYXNzTmFtZSUzRCUyMnRleHQtbGclMjBmb250LXNlbWlib2xkJTIwdGV4dC13aGl0ZSUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTE2OjEwXCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJBSSUyMENoYXRcIj5BSSBDaGF0PC9oMT5cbiAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LXhzIHRleHQtd2hpdGUvNTBcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTE3XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTBcIiBkYXRhLW1neC10YWc9XCJwXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDcCUyMGNsYXNzTmFtZSUzRCUyMnRleHQteHMlMjB0ZXh0LXdoaXRlJTJGNTAlMjIlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjExNzoxMFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiUG93ZXJlZCUyMGJ5JTIwQ2xhdWRlJTIwT3B1cyUyMDQuNlwiPlBvd2VyZWQgYnkgQ2xhdWRlIE9wdXMgNC42PC9wPlxuICAgICAgICA8L2Rpdj5cbiAgICAgIDwvaGVhZGVyPlxuXG4gICAgICB7LyogTWVzc2FnZXMgKi99XG4gICAgICA8U2Nyb2xsQXJlYSBjbGFzc05hbWU9XCJmbGV4LTEgcHgtNCBweS02XCIgcmVmPXtzY3JvbGxSZWZ9IGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxMjJcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI2XCIgZGF0YS1tZ3gtdGFnPVwiU2Nyb2xsQXJlYVwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUzQ1Njcm9sbEFyZWElMjBjbGFzc05hbWUlM0QlMjJmbGV4LTElMjBweC00JTIwcHktNiUyMiUyMHJlZiUzRCU3QnNjcm9sbFJlZiU3RCUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTIyOjZcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiPlxuICAgICAgICB7bWVzc2FnZXMubGVuZ3RoID09PSAwICYmIDxkaXYgY2xhc3NOYW1lPVwiZmxleCBmbGV4LWNvbCBpdGVtcy1jZW50ZXIganVzdGlmeS1jZW50ZXIgaC1mdWxsIHRleHQtY2VudGVyIHRleHQtd2hpdGUvNDAgbXQtMzJcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTI0XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTBcIiBkYXRhLW1neC10YWc9XCJkaXZcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NkaXYlMjBjbGFzc05hbWUlM0QlMjJmbGV4JTIwZmxleC1jb2wlMjBpdGVtcy1jZW50ZXIlMjBqdXN0aWZ5LWNlbnRlciUyMGgtZnVsbCUyMHRleHQtY2VudGVyJTIwdGV4dC13aGl0ZSUyRjQwJTIwbXQtMzIlMjIlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjEyNDoxMFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwXCI+XG4gICAgICAgICAgICA8Qm90IGNsYXNzTmFtZT1cInctMTYgaC0xNiBtYi00IG9wYWNpdHktMzBcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTI1XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTJcIiBkYXRhLW1neC10YWc9XCJCb3RcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NCb3QlMjBjbGFzc05hbWUlM0QlMjJ3LTE2JTIwaC0xNiUyMG1iLTQlMjBvcGFjaXR5LTMwJTIyJTIwJTJGJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxMjU6MTJcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiIC8+XG4gICAgICAgICAgICA8cCBjbGFzc05hbWU9XCJ0ZXh0LWxnIGZvbnQtbWVkaXVtXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjEyNlwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjEyXCIgZGF0YS1tZ3gtdGFnPVwicFwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ3AlMjBjbGFzc05hbWUlM0QlMjJ0ZXh0LWxnJTIwZm9udC1tZWRpdW0lMjIlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjEyNjoxMlwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJUU1JUJDJTgwJUU1JUE3JThCJUU1JUFGJUI5JUU4JUFGJTlEXCI+5byA5aeL5a+56K+dPC9wPlxuICAgICAgICAgICAgPHAgY2xhc3NOYW1lPVwidGV4dC1zbSBtdC0xXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjEyN1wiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjEyXCIgZGF0YS1tZ3gtdGFnPVwicFwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ3AlMjBjbGFzc05hbWUlM0QlMjJ0ZXh0LXNtJTIwbXQtMSUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTI3OjEyXCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCIlRTglQkUlOTMlRTUlODUlQTUlRTYlQjYlODglRTYlODElQUYlRUYlQkMlOEMlRTQlQjglOEUlMjBBSSUyMCVFNSU4QSVBOSVFNiU4OSU4QiVFNCVCQSVBNCVFNiVCNSU4MVwiPui+k+WFpea2iOaBr++8jOS4jiBBSSDliqnmiYvkuqTmtYE8L3A+XG4gICAgICAgICAgPC9kaXY+fVxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cIm1heC13LTN4bCBteC1hdXRvIHNwYWNlLXktNFwiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxMzBcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI4XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTIwY2xhc3NOYW1lJTNEJTIybWF4LXctM3hsJTIwbXgtYXV0byUyMHNwYWNlLXktNCUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTMwOjhcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiPlxuICAgICAgICAgIHttZXNzYWdlcy5tYXAobWVzc2FnZSA9PiA8ZGl2IGtleT17bWVzc2FnZS5pZH0gY2xhc3NOYW1lPXtgZmxleCBnYXAtMyAke21lc3NhZ2Uucm9sZSA9PT0gJ3VzZXInID8gJ2p1c3RpZnktZW5kJyA6ICdqdXN0aWZ5LXN0YXJ0J31gfSBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTMyXCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTJcIiBkYXRhLW1neC10YWc9XCJkaXZcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NkaXYlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBrZXklM0QlN0JtZXNzYWdlLmlkJTdEJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwY2xhc3NOYW1lJTNEJTdCJTYwZmxleCUyMGdhcC0zJTIwJTI0JTdCJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwbWVzc2FnZS5yb2xlJTIwJTNEJTNEJTNEJTIwJ3VzZXInJTIwJTNGJTIwJ2p1c3RpZnktZW5kJyUyMCUzQSUyMCdqdXN0aWZ5LXN0YXJ0JyUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCU3RCU2MCU3RCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTMyOjEyXCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJcIj5cbiAgICAgICAgICAgICAge21lc3NhZ2Uucm9sZSA9PT0gJ2Fzc2lzdGFudCcgJiYgPGRpdiBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIHctOCBoLTggcm91bmRlZC1mdWxsIGJnLVsjZTk0NTYwXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtdC0xXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjEzOVwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjE2XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTIwY2xhc3NOYW1lJTNEJTIyZmxleC1zaHJpbmstMCUyMHctOCUyMGgtOCUyMHJvdW5kZWQtZnVsbCUyMGJnLSU1QiUyM2U5NDU2MCU1RCUyMGZsZXglMjBpdGVtcy1jZW50ZXIlMjBqdXN0aWZ5LWNlbnRlciUyMG10LTElMjIlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjEzOToxNlwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwXCI+XG4gICAgICAgICAgICAgICAgICA8Qm90IGNsYXNzTmFtZT1cInctNCBoLTQgdGV4dC13aGl0ZVwiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxNDBcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCIxOFwiIGRhdGEtbWd4LXRhZz1cIkJvdFwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ0JvdCUyMGNsYXNzTmFtZSUzRCUyMnctNCUyMGgtNCUyMHRleHQtd2hpdGUlMjIlMjAlMkYlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjE0MDoxOFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiXCIgLz5cbiAgICAgICAgICAgICAgICA8L2Rpdj59XG4gICAgICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPXtgbWF4LXctWzc1JV0gcm91bmRlZC0yeGwgcHgtNCBweS0zIHRleHQtc20gbGVhZGluZy1yZWxheGVkIHdoaXRlc3BhY2UtcHJlLXdyYXAgJHttZXNzYWdlLnJvbGUgPT09ICd1c2VyJyA/ICdiZy1bIzBmMzQ2MF0gdGV4dC13aGl0ZSByb3VuZGVkLWJyLW1kJyA6ICdiZy1bIzE2MjEzZV0gdGV4dC13aGl0ZS85MCByb3VuZGVkLWJsLW1kIGJvcmRlciBib3JkZXItd2hpdGUvNSd9YH0gZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjE0M1wiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjE0XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwY2xhc3NOYW1lJTNEJTdCJTYwbWF4LXctJTVCNzUlMjUlNUQlMjByb3VuZGVkLTJ4bCUyMHB4LTQlMjBweS0zJTIwdGV4dC1zbSUyMGxlYWRpbmctcmVsYXhlZCUyMHdoaXRlc3BhY2UtcHJlLXdyYXAlMjAlMjQlN0IlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBtZXNzYWdlLnJvbGUlMjAlM0QlM0QlM0QlMjAndXNlciclMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0YlMjAnYmctJTVCJTIzMGYzNDYwJTVEJTIwdGV4dC13aGl0ZSUyMHJvdW5kZWQtYnItbWQnJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNBJTIwJ2JnLSU1QiUyMzE2MjEzZSU1RCUyMHRleHQtd2hpdGUlMkY5MCUyMHJvdW5kZWQtYmwtbWQlMjBib3JkZXIlMjBib3JkZXItd2hpdGUlMkY1JyUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCU3RCU2MCU3RCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTQzOjE0XCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJcIj5cbiAgICAgICAgICAgICAgICB7bWVzc2FnZS5jb250ZW50IHx8IDxzcGFuIGNsYXNzTmFtZT1cImZsZXggaXRlbXMtY2VudGVyIGdhcC0yIHRleHQtd2hpdGUvNTBcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTUxXCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMThcIiBkYXRhLW1neC10YWc9XCJzcGFuXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDc3BhbiUyMGNsYXNzTmFtZSUzRCUyMmZsZXglMjBpdGVtcy1jZW50ZXIlMjBnYXAtMiUyMHRleHQtd2hpdGUlMkY1MCUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTUxOjE4XCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCIlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlRTYlODAlOUQlRTglODAlODMlRTQlQjglQUQuLi4lMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBcIj5cbiAgICAgICAgICAgICAgICAgICAgPExvYWRlcjIgY2xhc3NOYW1lPVwidy0zIGgtMyBhbmltYXRlLXNwaW5cIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTUyXCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMjBcIiBkYXRhLW1neC10YWc9XCJMb2FkZXIyXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDTG9hZGVyMiUyMGNsYXNzTmFtZSUzRCUyMnctMyUyMGgtMyUyMGFuaW1hdGUtc3BpbiUyMiUyMCUyRiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTUyOjIwXCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJcIiAvPlxuICAgICAgICAgICAgICAgICAgICDmgJ3ogIPkuK0uLi5cbiAgICAgICAgICAgICAgICAgIDwvc3Bhbj59XG4gICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICB7bWVzc2FnZS5yb2xlID09PSAndXNlcicgJiYgPGRpdiBjbGFzc05hbWU9XCJmbGV4LXNocmluay0wIHctOCBoLTggcm91bmRlZC1mdWxsIGJnLVsjMGYzNDYwXSBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBtdC0xIGJvcmRlciBib3JkZXItd2hpdGUvMTBcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTU4XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTZcIiBkYXRhLW1neC10YWc9XCJkaXZcIiBkYXRhLW1neC1jb21wb25lbnQ9XCIlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0NkaXYlMjBjbGFzc05hbWUlM0QlMjJmbGV4LXNocmluay0wJTIwdy04JTIwaC04JTIwcm91bmRlZC1mdWxsJTIwYmctJTVCJTIzMGYzNDYwJTVEJTIwZmxleCUyMGl0ZW1zLWNlbnRlciUyMGp1c3RpZnktY2VudGVyJTIwbXQtMSUyMGJvcmRlciUyMGJvcmRlci13aGl0ZSUyRjEwJTIyJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxNTg6MTZcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIiUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMFwiPlxuICAgICAgICAgICAgICAgICAgPFVzZXIgY2xhc3NOYW1lPVwidy00IGgtNCB0ZXh0LXdoaXRlXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjE1OVwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjE4XCIgZGF0YS1tZ3gtdGFnPVwiVXNlclwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUzQ1VzZXIlMjBjbGFzc05hbWUlM0QlMjJ3LTQlMjBoLTQlMjB0ZXh0LXdoaXRlJTIyJTIwJTJGJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxNTk6MThcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIlwiIC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+fVxuICAgICAgICAgICAgPC9kaXY+KX1cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L1Njcm9sbEFyZWE+XG5cbiAgICAgIHsvKiBJbnB1dCBBcmVhICovfVxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJib3JkZXItdCBib3JkZXItd2hpdGUvMTAgYmctWyMxNjIxM2VdIHB4LTQgcHktNFwiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxNjhcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI2XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTIwY2xhc3NOYW1lJTNEJTIyYm9yZGVyLXQlMjBib3JkZXItd2hpdGUlMkYxMCUyMGJnLSU1QiUyMzE2MjEzZSU1RCUyMHB4LTQlMjBweS00JTIyJTNFXCIgZGF0YS1tZ3gtaWQ9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeDoxNjg6NlwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTBBJTIwJTIwJTIwJTIwJTIwJTIwXCI+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibWF4LXctM3hsIG14LWF1dG8gZmxleCBnYXAtM1wiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxNjlcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI4XCIgZGF0YS1tZ3gtdGFnPVwiZGl2XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDZGl2JTIwY2xhc3NOYW1lJTNEJTIybWF4LXctM3hsJTIwbXgtYXV0byUyMGZsZXglMjBnYXAtMyUyMiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTY5OjhcIiBkYXRhLW1neC1wcm9qZWN0PVwianN4XCIgZGF0YS1tZ3gtdGV4dD1cIiUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMFwiPlxuICAgICAgICAgIDxJbnB1dCByZWY9e2lucHV0UmVmfSB2YWx1ZT17aW5wdXR9IG9uQ2hhbmdlPXtlID0+IHNldElucHV0KGUudGFyZ2V0LnZhbHVlKX0gb25LZXlEb3duPXtoYW5kbGVLZXlEb3dufSBwbGFjZWhvbGRlcj1cIui+k+WFpea2iOaBry4uLlwiIGRpc2FibGVkPXtpc0xvYWRpbmd9IGNsYXNzTmFtZT1cImZsZXgtMSBiZy1bIzFhMWEyZV0gYm9yZGVyLXdoaXRlLzEwIHRleHQtd2hpdGUgcGxhY2Vob2xkZXI6dGV4dC13aGl0ZS8zMCBmb2N1cy12aXNpYmxlOnJpbmctWyNlOTQ1NjBdIGZvY3VzLXZpc2libGU6cmluZy0xIHJvdW5kZWQteGwgaC0xMVwiIGRhdGEtbWd4LXBhdGg9XCJhcHAvZnJvbnRlbmQvc3JjL3BhZ2VzL0luZGV4LnRzeFwiIGRhdGEtbWd4LWxpbmU9XCIxNzBcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCIxMFwiIGRhdGEtbWd4LXRhZz1cIklucHV0XCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDSW5wdXQlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjByZWYlM0QlN0JpbnB1dFJlZiU3RCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMHZhbHVlJTNEJTdCaW5wdXQlN0QlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBvbkNoYW5nZSUzRCU3QihlKSUyMCUzRCUzRSUyMHNldElucHV0KGUudGFyZ2V0LnZhbHVlKSU3RCUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMG9uS2V5RG93biUzRCU3QmhhbmRsZUtleURvd24lN0QlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBwbGFjZWhvbGRlciUzRCUyMiVFOCVCRSU5MyVFNSU4NSVBNSVFNiVCNiU4OCVFNiU4MSVBRi4uLiUyMiUwQSUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMCUyMGRpc2FibGVkJTNEJTdCaXNMb2FkaW5nJTdEJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwY2xhc3NOYW1lJTNEJTIyZmxleC0xJTIwYmctJTVCJTIzMWExYTJlJTVEJTIwYm9yZGVyLXdoaXRlJTJGMTAlMjB0ZXh0LXdoaXRlJTIwcGxhY2Vob2xkZXIlM0F0ZXh0LXdoaXRlJTJGMzAlMjBmb2N1cy12aXNpYmxlJTNBcmluZy0lNUIlMjNlOTQ1NjAlNUQlMjBmb2N1cy12aXNpYmxlJTNBcmluZy0xJTIwcm91bmRlZC14bCUyMGgtMTElMjIlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMkYlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjE3MDoxMFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiXCIgLz5cbiAgICAgICAgICA8QnV0dG9uIG9uQ2xpY2s9e2hhbmRsZVNlbmR9IGRpc2FibGVkPXshaW5wdXQudHJpbSgpIHx8IGlzTG9hZGluZ30gY2xhc3NOYW1lPVwiYmctWyNlOTQ1NjBdIGhvdmVyOmJnLVsjZDYzODUxXSB0ZXh0LXdoaXRlIHJvdW5kZWQteGwgaC0xMSB3LTExIHAtMCBmbGV4IGl0ZW1zLWNlbnRlciBqdXN0aWZ5LWNlbnRlciBkaXNhYmxlZDpvcGFjaXR5LTQwXCIgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4XCIgZGF0YS1tZ3gtbGluZT1cIjE3OVwiIGRhdGEtbWd4LXN0YXJ0LWNvbHVtbj1cIjEwXCIgZGF0YS1tZ3gtdGFnPVwiQnV0dG9uXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDQnV0dG9uJTBBJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwb25DbGljayUzRCU3QmhhbmRsZVNlbmQlN0QlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBkaXNhYmxlZCUzRCU3QiFpbnB1dC50cmltKCklMjAlN0MlN0MlMjBpc0xvYWRpbmclN0QlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjBjbGFzc05hbWUlM0QlMjJiZy0lNUIlMjNlOTQ1NjAlNUQlMjBob3ZlciUzQWJnLSU1QiUyM2Q2Mzg1MSU1RCUyMHRleHQtd2hpdGUlMjByb3VuZGVkLXhsJTIwaC0xMSUyMHctMTElMjBwLTAlMjBmbGV4JTIwaXRlbXMtY2VudGVyJTIwanVzdGlmeS1jZW50ZXIlMjBkaXNhYmxlZCUzQW9wYWNpdHktNDAlMjIlMEElMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlMjAlM0VcIiBkYXRhLW1neC1pZD1cImFwcC9mcm9udGVuZC9zcmMvcGFnZXMvSW5kZXgudHN4OjE3OToxMFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiXCI+XG4gICAgICAgICAgICB7aXNMb2FkaW5nID8gPExvYWRlcjIgY2xhc3NOYW1lPVwidy00IGgtNCBhbmltYXRlLXNwaW5cIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTg1XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTRcIiBkYXRhLW1neC10YWc9XCJMb2FkZXIyXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDTG9hZGVyMiUyMGNsYXNzTmFtZSUzRCUyMnctNCUyMGgtNCUyMGFuaW1hdGUtc3BpbiUyMiUyMCUyRiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTg1OjE0XCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJcIiAvPiA6IDxTZW5kIGNsYXNzTmFtZT1cInctNCBoLTRcIiBkYXRhLW1neC1wYXRoPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3hcIiBkYXRhLW1neC1saW5lPVwiMTg3XCIgZGF0YS1tZ3gtc3RhcnQtY29sdW1uPVwiMTRcIiBkYXRhLW1neC10YWc9XCJTZW5kXCIgZGF0YS1tZ3gtY29tcG9uZW50PVwiJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTIwJTNDU2VuZCUyMGNsYXNzTmFtZSUzRCUyMnctNCUyMGgtNCUyMiUyMCUyRiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9wYWdlcy9JbmRleC50c3g6MTg3OjE0XCIgZGF0YS1tZ3gtcHJvamVjdD1cImpzeFwiIGRhdGEtbWd4LXRleHQ9XCJcIiAvPn1cbiAgICAgICAgICA8L0J1dHRvbj5cbiAgICAgICAgPC9kaXY+XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj47XG59Il0sIm5hbWVzIjpbInVzZVN0YXRlIiwidXNlUmVmIiwidXNlRWZmZWN0IiwiY3JlYXRlQ2xpZW50IiwiQnV0dG9uIiwiSW5wdXQiLCJTY3JvbGxBcmVhIiwiU2VuZCIsIkJvdCIsIlVzZXIiLCJMb2FkZXIyIiwiY2xpZW50IiwiSW5kZXgiLCJtZXNzYWdlcyIsInNldE1lc3NhZ2VzIiwiaW5wdXQiLCJzZXRJbnB1dCIsImlzTG9hZGluZyIsInNldElzTG9hZGluZyIsInNjcm9sbFJlZiIsImlucHV0UmVmIiwiY3VycmVudCIsInNjcm9sbFRvcCIsInNjcm9sbEhlaWdodCIsImhhbmRsZVNlbmQiLCJ0cmltbWVkIiwidHJpbSIsInVzZXJNZXNzYWdlIiwiaWQiLCJEYXRlIiwibm93IiwidG9TdHJpbmciLCJyb2xlIiwiY29udGVudCIsInByZXYiLCJhc3Npc3RhbnRJZCIsImFzc2lzdGFudE1lc3NhZ2UiLCJjaGF0SGlzdG9yeSIsIm1hcCIsIm0iLCJhaSIsImdlbnR4dCIsIm1vZGVsIiwic3RyZWFtIiwib25DaHVuayIsImNodW5rIiwib25Db21wbGV0ZSIsImZvY3VzIiwib25FcnJvciIsImVycm9yIiwibWVzc2FnZSIsInRpbWVvdXQiLCJlIiwiZXJyb3JNc2ciLCJFcnJvciIsImhhbmRsZUtleURvd24iLCJrZXkiLCJzaGlmdEtleSIsInByZXZlbnREZWZhdWx0IiwiZGl2IiwiY2xhc3NOYW1lIiwiZGF0YS1tZ3gtcGF0aCIsImRhdGEtbWd4LWxpbmUiLCJkYXRhLW1neC1zdGFydC1jb2x1bW4iLCJkYXRhLW1neC10YWciLCJkYXRhLW1neC1jb21wb25lbnQiLCJkYXRhLW1neC1pZCIsImRhdGEtbWd4LXByb2plY3QiLCJkYXRhLW1neC10ZXh0IiwiaGVhZGVyIiwiaDEiLCJwIiwicmVmIiwibGVuZ3RoIiwic3BhbiIsInZhbHVlIiwib25DaGFuZ2UiLCJ0YXJnZXQiLCJvbktleURvd24iLCJwbGFjZWhvbGRlciIsImRpc2FibGVkIiwib25DbGljayJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsU0FBU0EsUUFBUSxFQUFFQyxNQUFNLEVBQUVDLFNBQVMsUUFBUSxRQUFRO0FBQ3BELFNBQVNDLFlBQVksUUFBUSxvQkFBb0I7QUFDakQsU0FBU0MsTUFBTSxRQUFRLHlCQUF5QjtBQUNoRCxTQUFTQyxLQUFLLFFBQVEsd0JBQXdCO0FBQzlDLFNBQVNDLFVBQVUsUUFBUSw4QkFBOEI7QUFDekQsU0FBU0MsSUFBSSxFQUFFQyxHQUFHLEVBQUVDLElBQUks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
