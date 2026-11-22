package dev.hank62.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

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
