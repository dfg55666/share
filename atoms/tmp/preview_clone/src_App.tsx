import { createHotContext as __vite__createHotContext } from "/@vite/client";import.meta.hot = __vite__createHotContext("/src/App.tsx");import * as RefreshRuntime from "/@react-refresh";
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
  window.$RefreshReg$ = RefreshRuntime.getRefreshReg("/workspace/app/frontend/src/App.tsx");
  window.$RefreshSig$ = RefreshRuntime.createSignatureFunctionForTransform;
}

import __vite__cjsImport2_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0aaf13fe"; const _jsxDEV = __vite__cjsImport2_react_jsxDevRuntime["jsxDEV"];
import { Toaster } from "/src/components/ui/sonner.tsx";
import { TooltipProvider } from "/src/components/ui/tooltip.tsx";
import { QueryClient, QueryClientProvider } from "/node_modules/.vite/deps/@tanstack_react-query.js?v=2a854732";
import { BrowserRouter, Routes, Route } from "/node_modules/.vite/deps/react-router-dom.js?v=453b0850";
import Index from "/src/pages/Index.tsx";
import AuthCallback from "/src/pages/AuthCallback.tsx";
import AuthError from "/src/pages/AuthError.tsx";
import NotFoundPage from "/@id/__x00__virtual:404-page.tsx";
// MODULE_IMPORTS_START
// MODULE_IMPORTS_END
const queryClient = new QueryClient();
const AppRoutes = ()=>/*#__PURE__*/ _jsxDEV(Routes, {
        "data-mgx-path": "app/frontend/src/App.tsx",
        "data-mgx-line": "15",
        "data-mgx-start-column": "2",
        "data-mgx-tag": "Routes",
        "data-mgx-component": "%20%20%3CRoutes%3E",
        "data-mgx-id": "app/frontend/src/App.tsx:15:2",
        "data-mgx-project": "jsx",
        "data-mgx-text": "",
        children: [
            /*#__PURE__*/ _jsxDEV(Route, {
                path: "/",
                element: /*#__PURE__*/ _jsxDEV(Index, {
                    "data-mgx-path": "app/frontend/src/App.tsx",
                    "data-mgx-line": "16",
                    "data-mgx-start-column": "29",
                    "data-mgx-tag": "Index",
                    "data-mgx-component": "%3CIndex%20%2F%3E",
                    "data-mgx-id": "app/frontend/src/App.tsx:16:29",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": ""
                }, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 15,
                    columnNumber: 30
                }, this),
                "data-mgx-path": "app/frontend/src/App.tsx",
                "data-mgx-line": "16",
                "data-mgx-start-column": "4",
                "data-mgx-tag": "Route",
                "data-mgx-component": "%20%20%20%20%3CRoute%20path%3D%22%2F%22%20element%3D%7B%3CIndex%20%2F%3E%7D%20%2F%3E",
                "data-mgx-id": "app/frontend/src/App.tsx:16:4",
                "data-mgx-project": "jsx",
                "data-mgx-text": ""
            }, void 0, false, {
                fileName: "/workspace/app/frontend/src/App.tsx",
                lineNumber: 15,
                columnNumber: 5
            }, this),
            /*#__PURE__*/ _jsxDEV(Route, {
                path: "/auth/callback",
                element: /*#__PURE__*/ _jsxDEV(AuthCallback, {
                    "data-mgx-path": "app/frontend/src/App.tsx",
                    "data-mgx-line": "18",
                    "data-mgx-start-column": "42",
                    "data-mgx-tag": "AuthCallback",
                    "data-mgx-component": "%3CAuthCallback%20%2F%3E",
                    "data-mgx-id": "app/frontend/src/App.tsx:18:42",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": ""
                }, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 17,
                    columnNumber: 43
                }, this),
                "data-mgx-path": "app/frontend/src/App.tsx",
                "data-mgx-line": "18",
                "data-mgx-start-column": "4",
                "data-mgx-tag": "Route",
                "data-mgx-component": "%20%20%20%20%3CRoute%20path%3D%22%2Fauth%2Fcallback%22%20element%3D%7B%3CAuthCallback%20%2F%3E%7D%20%2F%3E",
                "data-mgx-id": "app/frontend/src/App.tsx:18:4",
                "data-mgx-project": "jsx",
                "data-mgx-text": ""
            }, void 0, false, {
                fileName: "/workspace/app/frontend/src/App.tsx",
                lineNumber: 17,
                columnNumber: 5
            }, this),
            /*#__PURE__*/ _jsxDEV(Route, {
                path: "/auth/error",
                element: /*#__PURE__*/ _jsxDEV(AuthError, {
                    "data-mgx-path": "app/frontend/src/App.tsx",
                    "data-mgx-line": "19",
                    "data-mgx-start-column": "39",
                    "data-mgx-tag": "AuthError",
                    "data-mgx-component": "%3CAuthError%20%2F%3E",
                    "data-mgx-id": "app/frontend/src/App.tsx:19:39",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": ""
                }, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 18,
                    columnNumber: 40
                }, this),
                "data-mgx-path": "app/frontend/src/App.tsx",
                "data-mgx-line": "19",
                "data-mgx-start-column": "4",
                "data-mgx-tag": "Route",
                "data-mgx-component": "%20%20%20%20%3CRoute%20path%3D%22%2Fauth%2Ferror%22%20element%3D%7B%3CAuthError%20%2F%3E%7D%20%2F%3E",
                "data-mgx-id": "app/frontend/src/App.tsx:19:4",
                "data-mgx-project": "jsx",
                "data-mgx-text": ""
            }, void 0, false, {
                fileName: "/workspace/app/frontend/src/App.tsx",
                lineNumber: 18,
                columnNumber: 5
            }, this),
            /*#__PURE__*/ _jsxDEV(Route, {
                path: "*",
                element: /*#__PURE__*/ _jsxDEV(NotFoundPage, {}, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 21,
                    columnNumber: 32
                }, this)
            }, void 0, false, {
                fileName: "/workspace/app/frontend/src/App.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "/workspace/app/frontend/src/App.tsx",
        lineNumber: 14,
        columnNumber: 25
    }, this);
_c = AppRoutes;
const App = ()=>/*#__PURE__*/ _jsxDEV(QueryClientProvider, {
        client: queryClient,
        "data-mgx-path": "app/frontend/src/App.tsx",
        "data-mgx-line": "26",
        "data-mgx-start-column": "2",
        "data-mgx-tag": "QueryClientProvider",
        "data-mgx-component": "%20%20%3CQueryClientProvider%20client%3D%7BqueryClient%7D%3E",
        "data-mgx-id": "app/frontend/src/App.tsx:26:2",
        "data-mgx-project": "jsx",
        "data-mgx-text": "",
        children: /*#__PURE__*/ _jsxDEV(TooltipProvider, {
            "data-mgx-path": "app/frontend/src/App.tsx",
            "data-mgx-line": "29",
            "data-mgx-start-column": "4",
            "data-mgx-tag": "TooltipProvider",
            "data-mgx-component": "%20%20%20%20%3CTooltipProvider%3E",
            "data-mgx-id": "app/frontend/src/App.tsx:29:4",
            "data-mgx-project": "jsx",
            "data-mgx-text": "",
            children: [
                /*#__PURE__*/ _jsxDEV(Toaster, {
                    "data-mgx-path": "app/frontend/src/App.tsx",
                    "data-mgx-line": "30",
                    "data-mgx-start-column": "6",
                    "data-mgx-tag": "Toaster",
                    "data-mgx-component": "%20%20%20%20%20%20%3CToaster%20%2F%3E",
                    "data-mgx-id": "app/frontend/src/App.tsx:30:6",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": ""
                }, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 27,
                    columnNumber: 7
                }, this),
                /*#__PURE__*/ _jsxDEV(BrowserRouter, {
                    "data-mgx-path": "app/frontend/src/App.tsx",
                    "data-mgx-line": "31",
                    "data-mgx-start-column": "6",
                    "data-mgx-tag": "BrowserRouter",
                    "data-mgx-component": "%20%20%20%20%20%20%3CBrowserRouter%3E",
                    "data-mgx-id": "app/frontend/src/App.tsx:31:6",
                    "data-mgx-project": "jsx",
                    "data-mgx-text": "",
                    children: /*#__PURE__*/ _jsxDEV(AppRoutes, {
                        "data-mgx-path": "app/frontend/src/App.tsx",
                        "data-mgx-line": "32",
                        "data-mgx-start-column": "8",
                        "data-mgx-tag": "AppRoutes",
                        "data-mgx-component": "%20%20%20%20%20%20%20%20%3CAppRoutes%20%2F%3E",
                        "data-mgx-id": "app/frontend/src/App.tsx:32:8",
                        "data-mgx-project": "jsx",
                        "data-mgx-text": ""
                    }, void 0, false, {
                        fileName: "/workspace/app/frontend/src/App.tsx",
                        lineNumber: 29,
                        columnNumber: 9
                    }, this)
                }, void 0, false, {
                    fileName: "/workspace/app/frontend/src/App.tsx",
                    lineNumber: 28,
                    columnNumber: 7
                }, this)
            ]
        }, void 0, true, {
            fileName: "/workspace/app/frontend/src/App.tsx",
            lineNumber: 26,
            columnNumber: 5
        }, this)
    }, void 0, false, {
        fileName: "/workspace/app/frontend/src/App.tsx",
        lineNumber: 23,
        columnNumber: 19
    }, this);
_c1 = App;
export default App;
export { AppRoutes };
var _c, _c1;
$RefreshReg$(_c, "AppRoutes");
$RefreshReg$(_c1, "App");


if (import.meta.hot && !inWebWorker) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
}


if (import.meta.hot && !inWebWorker) {
  RefreshRuntime.__hmr_import(import.meta.url).then((currentExports) => {
    RefreshRuntime.registerExportsForReactRefresh("/workspace/app/frontend/src/App.tsx", currentExports);
    import.meta.hot.accept((nextExports) => {
      if (!nextExports) return;
      const invalidateMessage = RefreshRuntime.validateRefreshBoundaryAndEnqueueUpdate("/workspace/app/frontend/src/App.tsx", currentExports, nextExports);
      if (invalidateMessage) import.meta.hot.invalidate(invalidateMessage);
    });
  });
}

//# sourceMappingURL=data:application/json;base64,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LHNCQUFtQjtvQkFBd0NDLGVBQVk7b0JBQWdDQyxvQkFBaUI7b0JBQU1DLGlCQUFjOzhCQUM1USxzQkFBQ1I7d0JBQVVDLGlCQUFjO3dCQUEyQkMsaUJBQWM7d0JBQUtDLHlCQUFzQjt3QkFBSUMsZ0JBQWE7d0JBQVlDLHNCQUFtQjt3QkFBZ0RDLGVBQVk7d0JBQWdDQyxvQkFBaUI7d0JBQU1DLGlCQUFjOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O01BTmhSSTtBQVdOLGVBQWVBLElBQUc7QUFDbEIsU0FBU1osU0FBUyxHQUFFIiwibmFtZXMiOlsiVG9hc3RlciIsIlRvb2x0aXBQcm92aWRlciIsIlF1ZXJ5Q2xpZW50IiwiUXVlcnlDbGllbnRQcm92aWRlciIsIkJyb3dzZXJSb3V0ZXIiLCJSb3V0ZXMiLCJSb3V0ZSIsIkluZGV4IiwiQXV0aENhbGxiYWNrIiwiQXV0aEVycm9yIiwicXVlcnlDbGllbnQiLCJBcHBSb3V0ZXMiLCJkYXRhLW1neC1wYXRoIiwiZGF0YS1tZ3gtbGluZSIsImRhdGEtbWd4LXN0YXJ0LWNvbHVtbiIsImRhdGEtbWd4LXRhZyIsImRhdGEtbWd4LWNvbXBvbmVudCIsImRhdGEtbWd4LWlkIiwiZGF0YS1tZ3gtcHJvamVjdCIsImRhdGEtbWd4LXRleHQiLCJwYXRoIiwiZWxlbWVudCIsIk5vdEZvdW5kUGFnZSIsIkFwcCIsImNsaWVudCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlcyI6WyJBcHAudHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRvYXN0ZXIgfSBmcm9tICdAL2NvbXBvbmVudHMvdWkvc29ubmVyJztcbmltcG9ydCB7IFRvb2x0aXBQcm92aWRlciB9IGZyb20gJ0AvY29tcG9uZW50cy91aS90b29sdGlwJztcbmltcG9ydCB7IFF1ZXJ5Q2xpZW50LCBRdWVyeUNsaWVudFByb3ZpZGVyIH0gZnJvbSAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JztcbmltcG9ydCB7IEJyb3dzZXJSb3V0ZXIsIFJvdXRlcywgUm91dGUgfSBmcm9tICdyZWFjdC1yb3V0ZXItZG9tJztcbmltcG9ydCBCbG9nUm91dGVzIGZyb20gJy4vYmxvZy1yb3V0ZXMnO1xuaW1wb3J0IEluZGV4IGZyb20gJy4vcGFnZXMvSW5kZXgnO1xuaW1wb3J0IEF1dGhDYWxsYmFjayBmcm9tICcuL3BhZ2VzL0F1dGhDYWxsYmFjayc7XG5pbXBvcnQgQXV0aEVycm9yIGZyb20gJy4vcGFnZXMvQXV0aEVycm9yJztcbi8vIE1PRFVMRV9JTVBPUlRTX1NUQVJUXG4vLyBNT0RVTEVfSU1QT1JUU19FTkRcblxuY29uc3QgcXVlcnlDbGllbnQgPSBuZXcgUXVlcnlDbGllbnQoKTtcblxuY29uc3QgQXBwUm91dGVzID0gKCkgPT4gKFxuICA8Um91dGVzPlxuICAgIDxSb3V0ZSBwYXRoPVwiL1wiIGVsZW1lbnQ9ezxJbmRleCAvPn0gLz5cbiAgICB7LyogPFJvdXRlIHBhdGg9XCIvYmxvZy8qXCIgZWxlbWVudD17PEJsb2dSb3V0ZXMgLz59IC8+ICovfVxuICAgIDxSb3V0ZSBwYXRoPVwiL2F1dGgvY2FsbGJhY2tcIiBlbGVtZW50PXs8QXV0aENhbGxiYWNrIC8+fSAvPlxuICAgIDxSb3V0ZSBwYXRoPVwiL2F1dGgvZXJyb3JcIiBlbGVtZW50PXs8QXV0aEVycm9yIC8+fSAvPlxuICAgIHsvKiBNT0RVTEVfUk9VVEVTX1NUQVJUICovfVxuICAgIHsvKiBNT0RVTEVfUk9VVEVTX0VORCAqL31cbiAgPC9Sb3V0ZXM+XG4pO1xuXG5jb25zdCBBcHAgPSAoKSA9PiAoXG4gIDxRdWVyeUNsaWVudFByb3ZpZGVyIGNsaWVudD17cXVlcnlDbGllbnR9PlxuICAgIHsvKiBNT0RVTEVfUFJPVklERVJTX1NUQVJUICovfVxuICAgIHsvKiBNT0RVTEVfUFJPVklERVJTX0VORCAqL31cbiAgICA8VG9vbHRpcFByb3ZpZGVyPlxuICAgICAgPFRvYXN0ZXIgLz5cbiAgICAgIDxCcm93c2VyUm91dGVyPlxuICAgICAgICA8QXBwUm91dGVzIC8+XG4gICAgICA8L0Jyb3dzZXJSb3V0ZXI+XG4gICAgPC9Ub29sdGlwUHJvdmlkZXI+XG4gICAgey8qIE1PRFVMRV9QUk9WSURFUlNfQ0xPU0UgKi99XG4gIDwvUXVlcnlDbGllbnRQcm92aWRlcj5cbik7XG5cbmV4cG9ydCBkZWZhdWx0IEFwcDtcbmV4cG9ydCB7IEFwcFJvdXRlcyB9O1xuIl0sImZpbGUiOiIvd29ya3NwYWNlL2FwcC9mcm9udGVuZC9zcmMvQXBwLnRzeCJ9
