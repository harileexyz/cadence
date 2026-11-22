package in.cadences.app;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            CookieManager cookieManager = CookieManager.getInstance();
            cookieManager.setAcceptCookie(true);
            cookieManager.setAcceptThirdPartyCookies(webView, true);

            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setTextZoom(100);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            String ua = settings.getUserAgentString();
            if (ua != null && ua.contains("; wv")) {
                settings.setUserAgentString(ua.replace("; wv", ""));
            }

            // Intercept Google / Facebook OAuth connects and launch in system Chrome
            // so the user's logged-in phone Google accounts are listed automatically.
            webView.setWebViewClient(new BridgeWebViewClient(this.bridge) {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri uri = request.getUrl();
                    if (shouldOpenInSystemBrowser(uri)) {
                        openInSystemBrowser(uri);
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    Uri uri = Uri.parse(url);
                    if (shouldOpenInSystemBrowser(uri)) {
                        openInSystemBrowser(uri);
                        return true;
                    }
                    return super.shouldOverrideUrlLoading(view, url);
                }
            });
        }

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.WHITE);
        window.setNavigationBarColor(Color.WHITE);

        View decorView = window.getDecorView();
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, decorView);
        if (controller != null) {
            controller.setAppearanceLightStatusBars(true);
            controller.setAppearanceLightNavigationBars(true);
        }

        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            contentView.setBackgroundColor(Color.WHITE);
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars()
                        | WindowInsetsCompat.Type.displayCutout()
                        | WindowInsetsCompat.Type.ime()
                );
                v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }

        handleDeepLinkIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLinkIntent(intent);
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView webView = this.bridge.getWebView();
            if (webView.canGoBack()) {
                webView.goBack();
                return;
            }
        }
        moveTaskToBack(true);
    }

    private boolean shouldOpenInSystemBrowser(Uri uri) {
        if (uri == null) return false;
        String host = uri.getHost() != null ? uri.getHost().toLowerCase() : "";
        String path = uri.getPath() != null ? uri.getPath() : "";

        // Intercept Cadence OAuth initiation endpoints and append ?mobile=1
        if ((host.equals("cadences.in") || host.endsWith(".cadences.in")) &&
            (path.equals("/api/user/google/connect") ||
             path.startsWith("/api/auth/youtube/connect") ||
             path.startsWith("/api/auth/instagram/connect"))) {
            return true;
        }
        return false;
    }

    private void openInSystemBrowser(Uri uri) {
        try {
            Uri.Builder builder = uri.buildUpon();
            if (uri.getQueryParameter("mobile") == null) {
                builder.appendQueryParameter("mobile", "1");
            }
            // If connecting a social channel from inside the WebView, forward the cadence_session token
            // so the system browser can authenticate the connect request even if the user logged in inside WebView.
            String cookies = CookieManager.getInstance().getCookie("https://cadences.in");
            if (cookies != null && uri.getQueryParameter("session") == null) {
                for (String part : cookies.split(";")) {
                    String trimmed = part.trim();
                    if (trimmed.startsWith("cadence_session=")) {
                        String token = trimmed.substring("cadence_session=".length()).trim();
                        if (!token.isEmpty()) {
                            builder.appendQueryParameter("session", token);
                        }
                        break;
                    } else if (trimmed.startsWith("buffer_session=")) {
                        String token = trimmed.substring("buffer_session=".length()).trim();
                        if (!token.isEmpty()) {
                            builder.appendQueryParameter("session", token);
                        }
                        break;
                    }
                }
            }
            Intent browserIntent = new Intent(Intent.ACTION_VIEW, builder.build());
            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(browserIntent);
        } catch (Exception ignored) {
        }
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_VIEW.equals(intent.getAction())) {
            return;
        }
        Uri data = intent.getData();
        if (data == null || !"cadence".equals(data.getScheme())) {
            return;
        }

        if (this.bridge == null || this.bridge.getWebView() == null) {
            return;
        }
        WebView webView = this.bridge.getWebView();

        String session = data.getQueryParameter("session");
        String connected = data.getQueryParameter("connected");
        String error = data.getQueryParameter("error");
        String next = data.getQueryParameter("next");
        if (next == null || !next.startsWith("/")) {
            next = "/";
        }

        if (session != null && !session.isEmpty()) {
            String target = "https://cadences.in/api/user/mobile-session?session="
                + Uri.encode(session) + "&next=" + Uri.encode(next);
            webView.post(() -> webView.loadUrl(target));
        } else if (connected != null && !connected.isEmpty()) {
            String target = "https://cadences.in/accounts?connected=" + Uri.encode(connected);
            webView.post(() -> webView.loadUrl(target));
        } else if (error != null && !error.isEmpty()) {
            String base = next.equals("/accounts") ? "https://cadences.in/accounts" : "https://cadences.in/login";
            String target = base + "?error=" + Uri.encode(error);
            webView.post(() -> webView.loadUrl(target));
        }
    }
}
