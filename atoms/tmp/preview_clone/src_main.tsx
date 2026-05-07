import "/@id/__x00__virtual:routes-manifest";
import __vite__cjsImport1_react_jsxDevRuntime from "/node_modules/.vite/deps/react_jsx-dev-runtime.js?v=0aaf13fe"; const _jsxDEV = __vite__cjsImport1_react_jsxDevRuntime["jsxDEV"];
import __vite__cjsImport2_reactDom_client from "/node_modules/.vite/deps/react-dom_client.js?v=85ab6a30"; const createRoot = __vite__cjsImport2_reactDom_client["createRoot"];
import App from "/src/App.tsx";
import "/src/index.css";
import { loadRuntimeConfig } from "/src/lib/config.ts";
// Load runtime configuration before rendering the app
async function initializeApp() {
    // Prerendered blog pages are served as pure static HTML for SEO.
    // Intentionally skip React mounting so the crawler-facing markup stays
    // lightweight and self-contained — no client-side hydration needed.
    if (document.querySelector('meta[name="prerender-static-page"]')?.getAttribute('content') === 'blog') {
        return;
    }
    try {
        await loadRuntimeConfig();
        console.log('Runtime configuration loaded successfully');
    } catch (error) {
        console.warn('Failed to load runtime configuration, using defaults:', error);
    }
    // Render the app
    createRoot(document.getElementById('root')).render(/*#__PURE__*/ _jsxDEV(App, {
        "data-mgx-path": "app/frontend/src/main.tsx",
        "data-mgx-line": "30",
        "data-mgx-start-column": "54",
        "data-mgx-tag": "App",
        "data-mgx-component": "%3CApp%20%2F%3E",
        "data-mgx-id": "app/frontend/src/main.tsx:30:54",
        "data-mgx-project": "jsx",
        "data-mgx-text": ""
    }, void 0, false, {
        fileName: "/workspace/app/frontend/src/main.tsx",
        lineNumber: 22,
        columnNumber: 55
    }, this));
}
// Initialize the app
initializeApp();

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4udHN4Il0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZVJvb3QgfSBmcm9tICdyZWFjdC1kb20vY2xpZW50JztcbmltcG9ydCBBcHAgZnJvbSAnLi9BcHAudHN4JztcbmltcG9ydCAnLi9pbmRleC5jc3MnO1xuaW1wb3J0IHsgbG9hZFJ1bnRpbWVDb25maWcgfSBmcm9tICcuL2xpYi9jb25maWcudHMnO1xuXG4vLyBMb2FkIHJ1bnRpbWUgY29uZmlndXJhdGlvbiBiZWZvcmUgcmVuZGVyaW5nIHRoZSBhcHBcbmFzeW5jIGZ1bmN0aW9uIGluaXRpYWxpemVBcHAoKSB7XG4gIC8vIFByZXJlbmRlcmVkIGJsb2cgcGFnZXMgYXJlIHNlcnZlZCBhcyBwdXJlIHN0YXRpYyBIVE1MIGZvciBTRU8uXG4gIC8vIEludGVudGlvbmFsbHkgc2tpcCBSZWFjdCBtb3VudGluZyBzbyB0aGUgY3Jhd2xlci1mYWNpbmcgbWFya3VwIHN0YXlzXG4gIC8vIGxpZ2h0d2VpZ2h0IGFuZCBzZWxmLWNvbnRhaW5lZCDigJQgbm8gY2xpZW50LXNpZGUgaHlkcmF0aW9uIG5lZWRlZC5cbiAgaWYgKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21ldGFbbmFtZT1cInByZXJlbmRlci1zdGF0aWMtcGFnZVwiXScpPy5nZXRBdHRyaWJ1dGUoJ2NvbnRlbnQnKSA9PT0gJ2Jsb2cnKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgYXdhaXQgbG9hZFJ1bnRpbWVDb25maWcoKTtcbiAgICBjb25zb2xlLmxvZygnUnVudGltZSBjb25maWd1cmF0aW9uIGxvYWRlZCBzdWNjZXNzZnVsbHknKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBsb2FkIHJ1bnRpbWUgY29uZmlndXJhdGlvbiwgdXNpbmcgZGVmYXVsdHM6JywgZXJyb3IpO1xuICB9XG5cbiAgLy8gUmVuZGVyIHRoZSBhcHBcbiAgY3JlYXRlUm9vdChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncm9vdCcpISkucmVuZGVyKDxBcHAgZGF0YS1tZ3gtcGF0aD1cImFwcC9mcm9udGVuZC9zcmMvbWFpbi50c3hcIiBkYXRhLW1neC1saW5lPVwiMzBcIiBkYXRhLW1neC1zdGFydC1jb2x1bW49XCI1NFwiIGRhdGEtbWd4LXRhZz1cIkFwcFwiIGRhdGEtbWd4LWNvbXBvbmVudD1cIiUzQ0FwcCUyMCUyRiUzRVwiIGRhdGEtbWd4LWlkPVwiYXBwL2Zyb250ZW5kL3NyYy9tYWluLnRzeDozMDo1NFwiIGRhdGEtbWd4LXByb2plY3Q9XCJqc3hcIiBkYXRhLW1neC10ZXh0PVwiXCIgLz4pO1xufVxuXG4vLyBJbml0aWFsaXplIHRoZSBhcHBcbmluaXRpYWxpemVBcHAoKTsiXSwibmFtZXMiOlsiY3JlYXRlUm9vdCIsIkFwcCIsImxvYWRSdW50aW1lQ29uZmlnIiwiaW5pdGlhbGl6ZUFwcCIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciIsImdldEF0dHJpYnV0ZSIsImNvbnNvbGUiLCJsb2ciLCJlcnJvciIsIndhcm4iLCJnZXRFbGVtZW50QnlJZCIsInJlbmRlciIsImRhdGEtbWd4LXBhdGgiLCJkYXRhLW1neC1saW5lIiwiZGF0YS1tZ3gtc3RhcnQtY29sdW1uIiwiZGF0YS1tZ3gtdGFnIiwiZGF0YS1tZ3gtY29tcG9uZW50IiwiZGF0YS1tZ3gtaWQiLCJkYXRhLW1neC1wcm9qZWN0IiwiZGF0YS1tZ3gtdGV4dCJdLCJtYXBwaW5ncyI6IjtBQUFBLFNBQVNBLFVBQVUsUUFBUSxtQkFBbUI7QUFDOUMsT0FBT0MsU0FBUyxZQUFZO0FBQzVCLE9BQU8sY0FBYztBQUNyQixTQUFTQyxpQkFBaUIsUUFBUSxrQkFBa0I7QUFFcEQsc0RBQXNEO0FBQ3RELGVBQWVDO0lBQ2IsaUVBQWlFO0lBQ2pFLHVFQUF1RTtJQUN2RSxvRUFBb0U7SUFDcEUsSUFBSUMsU0FBU0MsYUFBYSxDQUFDLHVDQUF1Q0MsYUFBYSxlQUFlLFFBQVE7UUFDcEc7SUFDRjtJQUNBLElBQUk7UUFDRixNQUFNSjtRQUNOSyxRQUFRQyxHQUFHLENBQUM7SUFDZCxFQUFFLE9BQU9DLE9BQU87UUFDZEYsUUFBUUcsSUFBSSxDQUFDLHlEQUF5REQ7SUFDeEU7SUFFQSxpQkFBaUI7SUFDakJULFdBQVdJLFNBQVNPLGNBQWMsQ0FBQyxTQUFVQyxNQUFNLGVBQUMsUUFBQ1g7UUFBSVksaUJBQWM7UUFBNEJDLGlCQUFjO1FBQUtDLHlCQUFzQjtRQUFLQyxnQkFBYTtRQUFNQyxzQkFBbUI7UUFBa0JDLGVBQVk7UUFBa0NDLG9CQUFpQjtRQUFNQyxpQkFBYzs7Ozs7O0FBQzlSO0FBRUEscUJBQXFCO0FBQ3JCakIifQ==
