import.meta.env = {"BASE_URL": "/", "DEV": true, "MODE": "development", "PROD": false, "SSR": false, "VITE_API_BASE_URL": "https://8awg8-f97f84b26aac434f94c1c208d97b969c-preview.app.atoms.dev", "VITE_APP_DESCRIPTION": "Atoms Generated Project", "VITE_APP_LOGO_URL": "https://public-frontend-1300249583.cos.ap-nanjing.myqcloud.com/commonfile/DefaultAppLogo.png", "VITE_APP_TITLE": "shadcnui"};// Runtime configuration
let runtimeConfig = null;
// Configuration loading state
let configLoading = true;
// Default fallback configuration
const defaultConfig = {
    API_BASE_URL: 'http://127.0.0.1:8000' // Only used if runtime config fails to load
};
// Function to load runtime configuration
export async function loadRuntimeConfig() {
    try {
        console.log('🔧 DEBUG: Starting to load runtime config...');
        // Try to load configuration from a config endpoint
        const response = await fetch('/api/config');
        if (response.ok) {
            const contentType = response.headers.get('content-type');
            // Only parse as JSON if the response is actually JSON
            if (contentType && contentType.includes('application/json')) {
                runtimeConfig = await response.json();
                console.log('Runtime config loaded successfully');
            } else {
                console.log('Config endpoint returned non-JSON response, skipping runtime config');
            }
        } else {
            console.log('🔧 DEBUG: Config fetch failed with status:', response.status);
        }
    } catch (error) {
        console.log('Failed to load runtime config, using defaults:', error);
    } finally{
        configLoading = false;
        console.log('🔧 DEBUG: Config loading finished, configLoading set to false');
    }
}
// Get current configuration
export function getConfig() {
    // If config is still loading, return default config to avoid using stale Vite env vars
    if (configLoading) {
        console.log('Config still loading, using default config');
        return defaultConfig;
    }
    // First try runtime config (for Lambda)
    if (runtimeConfig) {
        console.log('Using runtime config');
        return runtimeConfig;
    }
    // Then try Vite environment variables (for local development)
    if (import.meta.env.VITE_API_BASE_URL) {
        const viteConfig = {
            API_BASE_URL: import.meta.env.VITE_API_BASE_URL
        };
        console.log('Using Vite environment config');
        return viteConfig;
    }
    // Finally fall back to default
    console.log('Using default config');
    return defaultConfig;
}
// Dynamic API_BASE_URL getter - this will always return the current config
export function getAPIBaseURL() {
    return getConfig().API_BASE_URL;
}
// For backward compatibility, but this should be avoided
// Removed static export to prevent using stale config values
// export const API_BASE_URL = getAPIBaseURL();
export const config = {
    get API_BASE_URL () {
        return getAPIBaseURL();
    }
};

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbmZpZy50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBSdW50aW1lIGNvbmZpZ3VyYXRpb25cbmxldCBydW50aW1lQ29uZmlnOiB7XG4gIEFQSV9CQVNFX1VSTDogc3RyaW5nO1xufSB8IG51bGwgPSBudWxsO1xuXG4vLyBDb25maWd1cmF0aW9uIGxvYWRpbmcgc3RhdGVcbmxldCBjb25maWdMb2FkaW5nID0gdHJ1ZTtcblxuLy8gRGVmYXVsdCBmYWxsYmFjayBjb25maWd1cmF0aW9uXG5jb25zdCBkZWZhdWx0Q29uZmlnID0ge1xuICBBUElfQkFTRV9VUkw6ICdodHRwOi8vMTI3LjAuMC4xOjgwMDAnIC8vIE9ubHkgdXNlZCBpZiBydW50aW1lIGNvbmZpZyBmYWlscyB0byBsb2FkXG59O1xuXG4vLyBGdW5jdGlvbiB0byBsb2FkIHJ1bnRpbWUgY29uZmlndXJhdGlvblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRSdW50aW1lQ29uZmlnKCk6IFByb21pc2U8dm9pZD4ge1xuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKCfwn5SnIERFQlVHOiBTdGFydGluZyB0byBsb2FkIHJ1bnRpbWUgY29uZmlnLi4uJyk7XG4gICAgLy8gVHJ5IHRvIGxvYWQgY29uZmlndXJhdGlvbiBmcm9tIGEgY29uZmlnIGVuZHBvaW50XG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnL2FwaS9jb25maWcnKTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHtcbiAgICAgIGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ2NvbnRlbnQtdHlwZScpO1xuICAgICAgLy8gT25seSBwYXJzZSBhcyBKU09OIGlmIHRoZSByZXNwb25zZSBpcyBhY3R1YWxseSBKU09OXG4gICAgICBpZiAoY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgICAgICBydW50aW1lQ29uZmlnID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgICAgICBjb25zb2xlLmxvZygnUnVudGltZSBjb25maWcgbG9hZGVkIHN1Y2Nlc3NmdWxseScpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coJ0NvbmZpZyBlbmRwb2ludCByZXR1cm5lZCBub24tSlNPTiByZXNwb25zZSwgc2tpcHBpbmcgcnVudGltZSBjb25maWcnKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coJ/CflKcgREVCVUc6IENvbmZpZyBmZXRjaCBmYWlsZWQgd2l0aCBzdGF0dXM6JywgcmVzcG9uc2Uuc3RhdHVzKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5sb2coJ0ZhaWxlZCB0byBsb2FkIHJ1bnRpbWUgY29uZmlnLCB1c2luZyBkZWZhdWx0czonLCBlcnJvcik7XG4gIH0gZmluYWxseSB7XG4gICAgY29uZmlnTG9hZGluZyA9IGZhbHNlO1xuICAgIGNvbnNvbGUubG9nKCfwn5SnIERFQlVHOiBDb25maWcgbG9hZGluZyBmaW5pc2hlZCwgY29uZmlnTG9hZGluZyBzZXQgdG8gZmFsc2UnKTtcbiAgfVxufVxuXG4vLyBHZXQgY3VycmVudCBjb25maWd1cmF0aW9uXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29uZmlnKCkge1xuICAvLyBJZiBjb25maWcgaXMgc3RpbGwgbG9hZGluZywgcmV0dXJuIGRlZmF1bHQgY29uZmlnIHRvIGF2b2lkIHVzaW5nIHN0YWxlIFZpdGUgZW52IHZhcnNcbiAgaWYgKGNvbmZpZ0xvYWRpbmcpIHtcbiAgICBjb25zb2xlLmxvZygnQ29uZmlnIHN0aWxsIGxvYWRpbmcsIHVzaW5nIGRlZmF1bHQgY29uZmlnJyk7XG4gICAgcmV0dXJuIGRlZmF1bHRDb25maWc7XG4gIH1cblxuICAvLyBGaXJzdCB0cnkgcnVudGltZSBjb25maWcgKGZvciBMYW1iZGEpXG4gIGlmIChydW50aW1lQ29uZmlnKSB7XG4gICAgY29uc29sZS5sb2coJ1VzaW5nIHJ1bnRpbWUgY29uZmlnJyk7XG4gICAgcmV0dXJuIHJ1bnRpbWVDb25maWc7XG4gIH1cblxuICAvLyBUaGVuIHRyeSBWaXRlIGVudmlyb25tZW50IHZhcmlhYmxlcyAoZm9yIGxvY2FsIGRldmVsb3BtZW50KVxuICBpZiAoaW1wb3J0Lm1ldGEuZW52LlZJVEVfQVBJX0JBU0VfVVJMKSB7XG4gICAgY29uc3Qgdml0ZUNvbmZpZyA9IHtcbiAgICAgIEFQSV9CQVNFX1VSTDogaW1wb3J0Lm1ldGEuZW52LlZJVEVfQVBJX0JBU0VfVVJMXG4gICAgfTtcbiAgICBjb25zb2xlLmxvZygnVXNpbmcgVml0ZSBlbnZpcm9ubWVudCBjb25maWcnKTtcbiAgICByZXR1cm4gdml0ZUNvbmZpZztcbiAgfVxuXG4gIC8vIEZpbmFsbHkgZmFsbCBiYWNrIHRvIGRlZmF1bHRcbiAgY29uc29sZS5sb2coJ1VzaW5nIGRlZmF1bHQgY29uZmlnJyk7XG4gIHJldHVybiBkZWZhdWx0Q29uZmlnO1xufVxuXG4vLyBEeW5hbWljIEFQSV9CQVNFX1VSTCBnZXR0ZXIgLSB0aGlzIHdpbGwgYWx3YXlzIHJldHVybiB0aGUgY3VycmVudCBjb25maWdcbmV4cG9ydCBmdW5jdGlvbiBnZXRBUElCYXNlVVJMKCk6IHN0cmluZyB7XG4gIHJldHVybiBnZXRDb25maWcoKS5BUElfQkFTRV9VUkw7XG59XG5cbi8vIEZvciBiYWNrd2FyZCBjb21wYXRpYmlsaXR5LCBidXQgdGhpcyBzaG91bGQgYmUgYXZvaWRlZFxuLy8gUmVtb3ZlZCBzdGF0aWMgZXhwb3J0IHRvIHByZXZlbnQgdXNpbmcgc3RhbGUgY29uZmlnIHZhbHVlc1xuLy8gZXhwb3J0IGNvbnN0IEFQSV9CQVNFX1VSTCA9IGdldEFQSUJhc2VVUkwoKTtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZyA9IHtcbiAgZ2V0IEFQSV9CQVNFX1VSTCgpIHtcbiAgICByZXR1cm4gZ2V0QVBJQmFzZVVSTCgpO1xuICB9XG59OyJdLCJuYW1lcyI6WyJydW50aW1lQ29uZmlnIiwiY29uZmlnTG9hZGluZyIsImRlZmF1bHRDb25maWciLCJBUElfQkFTRV9VUkwiLCJsb2FkUnVudGltZUNvbmZpZyIsImNvbnNvbGUiLCJsb2ciLCJyZXNwb25zZSIsImZldGNoIiwib2siLCJjb250ZW50VHlwZSIsImhlYWRlcnMiLCJnZXQiLCJpbmNsdWRlcyIsImpzb24iLCJzdGF0dXMiLCJlcnJvciIsImdldENvbmZpZyIsImVudiIsIlZJVEVfQVBJX0JBU0VfVVJMIiwidml0ZUNvbmZpZyIsImdldEFQSUJhc2VVUkwiLCJjb25maWciXSwibWFwcGluZ3MiOiJBQUFBLHdCQUF3QjtBQUN4QixJQUFJQSxnQkFFTztBQUVYLDhCQUE4QjtBQUM5QixJQUFJQyxnQkFBZ0I7QUFFcEIsaUNBQWlDO0FBQ2pDLE1BQU1DLGdCQUFnQjtJQUNwQkMsY0FBYyx3QkFBd0IsNENBQTRDO0FBQ3BGO0FBRUEseUNBQXlDO0FBQ3pDLE9BQU8sZUFBZUM7SUFDcEIsSUFBSTtRQUNGQyxRQUFRQyxHQUFHLENBQUM7UUFDWixtREFBbUQ7UUFDbkQsTUFBTUMsV0FBVyxNQUFNQyxNQUFNO1FBQzdCLElBQUlELFNBQVNFLEVBQUUsRUFBRTtZQUNmLE1BQU1DLGNBQWNILFNBQVNJLE9BQU8sQ0FBQ0MsR0FBRyxDQUFDO1lBQ3pDLHNEQUFzRDtZQUN0RCxJQUFJRixlQUFlQSxZQUFZRyxRQUFRLENBQUMscUJBQXFCO2dCQUMzRGIsZ0JBQWdCLE1BQU1PLFNBQVNPLElBQUk7Z0JBQ25DVCxRQUFRQyxHQUFHLENBQUM7WUFDZCxPQUFPO2dCQUNMRCxRQUFRQyxHQUFHLENBQUM7WUFDZDtRQUNGLE9BQU87WUFDTEQsUUFBUUMsR0FBRyxDQUFDLDhDQUE4Q0MsU0FBU1EsTUFBTTtRQUMzRTtJQUNGLEVBQUUsT0FBT0MsT0FBTztRQUNkWCxRQUFRQyxHQUFHLENBQUMsa0RBQWtEVTtJQUNoRSxTQUFVO1FBQ1JmLGdCQUFnQjtRQUNoQkksUUFBUUMsR0FBRyxDQUFDO0lBQ2Q7QUFDRjtBQUVBLDRCQUE0QjtBQUM1QixPQUFPLFNBQVNXO0lBQ2QsdUZBQXVGO0lBQ3ZGLElBQUloQixlQUFlO1FBQ2pCSSxRQUFRQyxHQUFHLENBQUM7UUFDWixPQUFPSjtJQUNUO0lBRUEsd0NBQXdDO0lBQ3hDLElBQUlGLGVBQWU7UUFDakJLLFFBQVFDLEdBQUcsQ0FBQztRQUNaLE9BQU9OO0lBQ1Q7SUFFQSw4REFBOEQ7SUFDOUQsSUFBSSxZQUFZa0IsR0FBRyxDQUFDQyxpQkFBaUIsRUFBRTtRQUNyQyxNQUFNQyxhQUFhO1lBQ2pCakIsY0FBYyxZQUFZZSxHQUFHLENBQUNDLGlCQUFpQjtRQUNqRDtRQUNBZCxRQUFRQyxHQUFHLENBQUM7UUFDWixPQUFPYztJQUNUO0lBRUEsK0JBQStCO0lBQy9CZixRQUFRQyxHQUFHLENBQUM7SUFDWixPQUFPSjtBQUNUO0FBRUEsMkVBQTJFO0FBQzNFLE9BQU8sU0FBU21CO0lBQ2QsT0FBT0osWUFBWWQsWUFBWTtBQUNqQztBQUVBLHlEQUF5RDtBQUN6RCw2REFBNkQ7QUFDN0QsK0NBQStDO0FBRS9DLE9BQU8sTUFBTW1CLFNBQVM7SUFDcEIsSUFBSW5CLGdCQUFlO1FBQ2pCLE9BQU9rQjtJQUNUO0FBQ0YsRUFBRSJ9
