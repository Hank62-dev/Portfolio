package dev.hank62.app;

import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;

/**
 * What the web page asks of the phone itself, beyond Capacitor's own plugins: the media card for music and podcasts
 * (MediaService), the home-screen widget (TodayWidget), things shared to the app from other apps, opening a tab from a
 * widget, the battery setting, and which shell this is (so the page can say when a newer APK is out).
 * The page side is src/spacehank/features/android/.
 */
@CapacitorPlugin(name = "Hank62")
public class Hank62Plugin extends Plugin {

    /** Counts up whenever the native shell changes; public/android.json names the newest, and the page compares. */
    public static final int SHELL = 2;

    private static final int MAX_FILE = 8 * 1024 * 1024;
    private static final int MAX_FILES = 6;

    private static Hank62Plugin instance;

    // what an intent brought before the page asked for it (the app may have been started by it)
    private static String pendingTab;
    private static Intent pendingShare;

    @Override
    public void load() {
        instance = this;
    }

    // ---- intents: a widget row that opens a tab, or something shared from another app --------------------------------

    /** Called by MainActivity with the intent that started or reached it. */
    static void handleIntent(Intent intent) {
        if (intent == null) return;
        String tab = intent.getStringExtra("hank62.tab");
        String action = intent.getAction();
        if (tab != null && !tab.isEmpty()) {
            pendingTab = tab;
            emit("pending");
        } else if (Intent.ACTION_SEND.equals(action) || Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            pendingShare = intent;
            emit("pending");
        }
    }

    private static void emit(String event) {
        if (instance != null) instance.notifyListeners(event, new JSObject());
    }

    /** The tab to open, if a widget asked for one; asked once, then forgotten. */
    @PluginMethod
    public void takeTab(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("tab", pendingTab);
        pendingTab = null;
        call.resolve(ret);
    }

    /** What was shared to the app: { title, text, url, files: [{ type, data (base64) }] }, or { none: true }. */
    @PluginMethod
    public void takeShare(PluginCall call) {
        Intent intent = pendingShare;
        pendingShare = null;
        JSObject ret = new JSObject();
        if (intent == null) {
            ret.put("none", true);
            call.resolve(ret);
            return;
        }
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        String subject = intent.getStringExtra(Intent.EXTRA_SUBJECT);
        ret.put("title", subject == null ? "" : subject);
        ret.put("text", text == null ? "" : text);
        ret.put("url", "");

        List<Uri> uris = new ArrayList<>();
        if (Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())) {
            ArrayList<Uri> many = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            if (many != null) uris.addAll(many);
        } else {
            Uri one = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (one != null) uris.add(one);
        }

        JSArray files = new JSArray();
        ContentResolver resolver = getContext().getContentResolver();
        for (Uri uri : uris) {
            if (files.length() >= MAX_FILES) break;
            try (InputStream in = resolver.openInputStream(uri)) {
                if (in == null) continue;
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[64 * 1024];
                int read;
                boolean tooBig = false;
                while ((read = in.read(buffer)) != -1) {
                    out.write(buffer, 0, read);
                    if (out.size() > MAX_FILE) {
                        tooBig = true;
                        break;
                    }
                }
                if (tooBig) continue;
                String type = resolver.getType(uri);
                JSObject file = new JSObject();
                file.put("type", type == null ? "application/octet-stream" : type);
                file.put("data", Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP));
                files.put(file);
            } catch (Exception ignored) {
                // a file the other app would not hand over: the rest still comes
            }
        }
        ret.put("files", files);
        call.resolve(ret);
    }

    // ---- about this install --------------------------------------------------------------------------------------------

    @PluginMethod
    public void info(PluginCall call) {
        Context context = getContext();
        JSObject ret = new JSObject();
        ret.put("shell", SHELL);
        try {
            PackageInfo pkg = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            ret.put("version", pkg.versionName);
            ret.put("build", Build.VERSION.SDK_INT >= 28 ? pkg.getLongVersionCode() : pkg.versionCode);
        } catch (Exception ignored) {
            ret.put("version", "");
        }
        // the Firebase settings were built in (google-services.json makes this resource): without them FCM cannot start
        ret.put("firebase", context.getResources().getIdentifier("google_app_id", "string", context.getPackageName()) != 0);
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        ret.put("battery", power != null && power.isIgnoringBatteryOptimizations(context.getPackageName()));
        call.resolve(ret);
    }

    /** Asks Android to let the app run in the background without the battery saver stopping it (music, reminders). */
    @PluginMethod
    public void askBattery(PluginCall call) {
        Context context = getContext();
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception first) {
            try {
                // some phones hide that dialog: the list of apps is the next best thing
                Intent list = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                list.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(list);
            } catch (Exception ignored) {
                call.reject("No battery settings on this phone");
                return;
            }
        }
        call.resolve();
    }

    // ---- the home-screen widget ----------------------------------------------------------------------------------------

    /** Keeps what the widget shows ({ day, title, subtitle, rows: [{ text, tab, late }], empty, stale }) and redraws it. */
    @PluginMethod
    public void setWidget(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("No data");
            return;
        }
        SharedPreferences prefs = getContext().getSharedPreferences(TodayWidget.PREFS, Context.MODE_PRIVATE);
        prefs.edit().putString("data", data).apply();
        TodayWidget.refresh(getContext());
        call.resolve();
    }

    // ---- the media card ------------------------------------------------------------------------------------------------

    /** What is playing, from the page's navigator.mediaSession; the service shows it and keeps the app alive while it plays. */
    @PluginMethod
    public void media(PluginCall call) {
        List<String> actions = new ArrayList<>();
        try {
            JSONArray list = call.getArray("actions", new JSArray());
            for (int i = 0; i < list.length(); i++) actions.add(list.getString(i));
        } catch (Exception ignored) {
            // no buttons then
        }
        MediaService.update(
            getContext(),
            call.getString("state", "none"),
            call.getString("title", ""),
            call.getString("artist", ""),
            call.getString("album", ""),
            call.getString("art", null), // only sent when the cover changes
            call.getDouble("duration", 0.0),
            call.getDouble("position", 0.0),
            call.getFloat("rate", 1f),
            actions
        );
        call.resolve();
    }

    /** A button on the media card, the lock screen or a headset was pressed: the page's handler for it runs. */
    static void mediaAction(String action, double seekTime) {
        if (instance == null) return;
        JSObject data = new JSObject();
        data.put("action", action);
        data.put("seekTime", seekTime);
        instance.notifyListeners("mediaAction", data);
    }
}
