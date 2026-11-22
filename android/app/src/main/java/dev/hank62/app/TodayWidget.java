package dev.hank62.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The "Today" widget on the home screen: what is due, what is on, which habits still wait. The page works it out (in
 * src/spacehank/features/android/widget.js, from the same data as the reminders) and hands it over through
 * Hank62Plugin.setWidget; the widget only shows it, so it never has to start the app. A row opens its tab.
 * Kept data from another day is not shown as if it were today's: the widget asks for the app to be opened instead.
 */
public class TodayWidget extends AppWidgetProvider {

    static final String PREFS = "hank62.widget";
    private static final int[] ROWS = { R.id.widget_row1, R.id.widget_row2, R.id.widget_row3, R.id.widget_row4, R.id.widget_row5 };
    private static final int TEXT = Color.parseColor("#E8E6E1");
    private static final int LATE = Color.parseColor("#FF8A80");

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        RemoteViews views = build(context);
        for (int id : ids) manager.updateAppWidget(id, views);
    }

    /** Redraws every Today widget on the home screen with the data last kept. */
    static void refresh(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, TodayWidget.class));
        if (ids.length == 0) return;
        RemoteViews views = build(context);
        for (int id : ids) manager.updateAppWidget(id, views);
    }

    private static PendingIntent open(Context context, String tab, int code) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction("dev.hank62.app.OPEN_TAB." + code) // a distinct action, so each row keeps its own intent
            .putExtra("hank62.tab", tab)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static RemoteViews build(Context context) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_today);
        boolean vi = "vi".equals(Locale.getDefault().getLanguage());
        JSONObject data = null;
        try {
            String raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", null);
            if (raw != null) data = new JSONObject(raw);
        } catch (Exception ignored) {
            data = null;
        }
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());

        for (int row : ROWS) views.setViewVisibility(row, View.GONE);
        views.setOnClickPendingIntent(R.id.widget_root, open(context, "hank", 0));

        if (data == null) {
            views.setTextViewText(R.id.widget_title, vi ? "Hôm nay" : "Today");
            views.setTextViewText(R.id.widget_count, "");
            views.setTextViewText(R.id.widget_subtitle, "Hank62");
            showNote(views, vi ? "Mở Hank62 một lần để widget có dữ liệu." : "Open Hank62 once to fill the widget.");
            return views;
        }

        views.setTextViewText(R.id.widget_title, data.optString("title", vi ? "Hôm nay" : "Today"));
        views.setTextViewText(R.id.widget_subtitle, data.optString("subtitle", ""));
        if (!today.equals(data.optString("day"))) {
            views.setTextViewText(R.id.widget_count, "");
            showNote(views, data.optString("stale", vi ? "Mở Hank62 để cập nhật hôm nay." : "Open Hank62 to bring today up to date."));
            return views;
        }

        JSONArray rows = data.optJSONArray("rows");
        int shown = rows == null ? 0 : Math.min(rows.length(), ROWS.length);
        int total = data.optInt("count", shown);
        views.setTextViewText(R.id.widget_count, total > shown ? "+" + (total - shown) : "");
        if (shown == 0) {
            showNote(views, data.optString("empty", ""));
            return views;
        }
        views.setViewVisibility(R.id.widget_note, View.GONE);
        for (int i = 0; i < shown; i++) {
            JSONObject row = rows.optJSONObject(i);
            if (row == null) continue;
            int id = ROWS[i];
            views.setViewVisibility(id, View.VISIBLE);
            views.setTextViewText(id, row.optString("text"));
            views.setTextColor(id, row.optBoolean("late") ? LATE : TEXT);
            views.setOnClickPendingIntent(id, open(context, row.optString("tab", "hank"), i + 1));
        }
        return views;
    }

    private static void showNote(RemoteViews views, String text) {
        views.setViewVisibility(R.id.widget_note, View.VISIBLE);
        views.setTextViewText(R.id.widget_note, text);
    }
}
