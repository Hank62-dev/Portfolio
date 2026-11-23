package dev.hank62.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // the app's own plugin (media card, widget, sharing, battery), registered before the bridge starts
        registerPlugin(Hank62Plugin.class);
        super.onCreate(savedInstanceState);
        // The page comes from Vercel and the API from Render, so the sign-in cookie is a third-party one
        // (SameSite=None). Android's WebView refuses those unless told otherwise, and signing in would not stick.
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
        // podcast episodes kept on the phone are played from /_hank62_offline_/<id> (Episodes.serve), asked for by the page
        // itself or, when the site's service worker passes the request on, by the worker
        Bridge bridge = getBridge();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse kept = Episodes.serve(MainActivity.this, request);
                return kept != null ? kept : super.shouldInterceptRequest(view, request);
            }
        });
        try {
            ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) {
                    WebResourceResponse kept = Episodes.serve(MainActivity.this, request);
                    return kept != null ? kept : bridge.getLocalServer().shouldInterceptRequest(request);
                }
            });
        } catch (Exception ignored) {
            // no service workers on this WebView: the page's own requests are enough
        }
        // started by a widget row or by "Share" in another app
        Hank62Plugin.handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Hank62Plugin.handleIntent(intent);
    }

    @Override
    public void onPause() {
        super.onPause();
        // write the cookies to disk now, so closing the app from the recents list does not sign the owner out
        CookieManager.getInstance().flush();
    }
}
