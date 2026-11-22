package dev.hank62.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.os.SystemClock;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Base64;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The media card for whatever the page plays (music, a podcast, the focus timer): a notification with its buttons, the
 * lock screen, a headset's buttons and Bluetooth controls, all through one media session. While something plays it is a
 * foreground service, so Android keeps the app (and the WebView's audio) alive with the screen off; when it pauses the
 * card stays but the app may rest; when nothing is loaded it goes away.
 * The page tells it what is playing through Hank62Plugin.media; a button pressed here goes back through mediaAction.
 */
public class MediaService extends Service {

    private static final String CHANNEL = "media";
    private static final int NOTIFICATION_ID = 6201;
    private static final String REFRESH = "dev.hank62.app.media.REFRESH";
    private static final String PRESS = "dev.hank62.app.media.PRESS.";

    // what the page last said (kept here so a restarted service can show it again)
    private static String state = "none";
    private static String title = "";
    private static String artist = "";
    private static String album = "";
    private static String artKey = "";
    private static Bitmap art;
    private static long durationMs;
    private static long positionMs;
    private static float rate = 1f;
    private static long positionAt;
    private static List<String> actions = new ArrayList<>();

    private MediaSessionCompat session;

    /** From the page: what plays and how far it is. */
    static void update(Context context, String newState, String newTitle, String newArtist, String newAlbum, String newArt, double duration, double position, float newRate, List<String> newActions) {
        state = newState == null ? "none" : newState;
        title = newTitle == null ? "" : newTitle;
        artist = newArtist == null ? "" : newArtist;
        album = newAlbum == null ? "" : newAlbum;
        durationMs = (long) Math.max(0, duration * 1000);
        positionMs = (long) Math.max(0, position * 1000);
        rate = newRate > 0 ? newRate : 1f;
        positionAt = SystemClock.elapsedRealtime();
        actions = newActions == null ? new ArrayList<>() : newActions;
        // the cover comes only when it changes (null: keep the one shown)
        if (newArt != null && !newArt.equals(artKey)) {
            artKey = newArt;
            art = decode(newArt);
        }

        Intent intent = new Intent(context, MediaService.class).setAction(REFRESH);
        try {
            if ("none".equals(state)) context.stopService(new Intent(context, MediaService.class));
            else ContextCompat.startForegroundService(context, intent);
        } catch (Exception ignored) {
            // Android refused to start it from the background; the next update from the front will
        }
    }

    /** A data: URL from the page (the cover), as a small bitmap; null when there is none or it cannot be read. */
    private static Bitmap decode(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || comma < 0) return null;
        try {
            byte[] bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) return null;
            int side = Math.max(bitmap.getWidth(), bitmap.getHeight());
            if (side <= 512) return bitmap;
            float scale = 512f / side;
            return Bitmap.createScaledBitmap(bitmap, Math.round(bitmap.getWidth() * scale), Math.round(bitmap.getHeight() * scale), true);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= 26) {
            boolean vi = "vi".equals(Locale.getDefault().getLanguage());
            NotificationChannel channel = new NotificationChannel(CHANNEL, vi ? "Đang phát" : "Now playing", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
        session = new MediaSessionCompat(this, "Hank62");
        session.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() { Hank62Plugin.mediaAction("play", 0); }
            @Override public void onPause() { Hank62Plugin.mediaAction("pause", 0); }
            @Override public void onStop() { Hank62Plugin.mediaAction("stop", 0); }
            @Override public void onSkipToNext() { Hank62Plugin.mediaAction("nexttrack", 0); }
            @Override public void onSkipToPrevious() { Hank62Plugin.mediaAction("previoustrack", 0); }
            @Override public void onFastForward() { Hank62Plugin.mediaAction("seekforward", 0); }
            @Override public void onRewind() { Hank62Plugin.mediaAction("seekbackward", 0); }
            @Override public void onSeekTo(long pos) { Hank62Plugin.mediaAction("seekto", pos / 1000.0); }
        });
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? null : intent.getAction();
        if (action != null && action.startsWith(PRESS)) {
            // a button on the card: the page decides what it means (and then says what plays now)
            Hank62Plugin.mediaAction(action.substring(PRESS.length()), 0);
            return START_NOT_STICKY;
        }
        if ("none".equals(state)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        boolean playing = "playing".equals(state);
        publishSession(playing);
        Notification notification = buildNotification(playing);
        // started with startForegroundService, so it must go to the front now, even when paused
        int type = Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
        try {
            ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, type);
        } catch (Exception e) {
            stopSelf();
            return START_NOT_STICKY;
        }
        // paused: the card stays (and can be swiped away), but Android may let the app rest
        if (!playing) ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_DETACH);
        return START_NOT_STICKY;
    }

    private long actionMask() {
        long mask = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE;
        if (actions.contains("stop")) mask |= PlaybackStateCompat.ACTION_STOP;
        if (actions.contains("nexttrack")) mask |= PlaybackStateCompat.ACTION_SKIP_TO_NEXT;
        if (actions.contains("previoustrack")) mask |= PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS;
        if (actions.contains("seekto")) mask |= PlaybackStateCompat.ACTION_SEEK_TO;
        if (actions.contains("seekforward")) mask |= PlaybackStateCompat.ACTION_FAST_FORWARD;
        if (actions.contains("seekbackward")) mask |= PlaybackStateCompat.ACTION_REWIND;
        return mask;
    }

    private void publishSession(boolean playing) {
        MediaMetadataCompat.Builder meta = new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
            .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album);
        if (durationMs > 0) meta.putLong(MediaMetadataCompat.METADATA_KEY_DURATION, durationMs);
        if (art != null) meta.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art);
        session.setMetadata(meta.build());
        session.setPlaybackState(new PlaybackStateCompat.Builder()
            .setActions(actionMask())
            .setState(playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED, positionMs, playing ? rate : 0f, positionAt)
            .build());
    }

    private PendingIntent press(String action, int code) {
        Intent intent = new Intent(this, MediaService.class).setAction(PRESS + action);
        return PendingIntent.getService(this, code, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Notification buildNotification(boolean playing) {
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_hank62)
            .setContentTitle(title.isEmpty() ? "Hank62" : title)
            .setContentText(artist)
            .setContentIntent(content)
            .setDeleteIntent(press("stop", 9))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(playing);
        if (art != null) builder.setLargeIcon(art);

        List<Integer> compact = new ArrayList<>();
        if (actions.contains("previoustrack")) {
            compact.add(compact.size());
            builder.addAction(android.R.drawable.ic_media_previous, "Previous", press("previoustrack", 1));
        }
        compact.add(compact.size());
        builder.addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "Pause" : "Play", press(playing ? "pause" : "play", 2));
        if (actions.contains("nexttrack")) {
            compact.add(compact.size());
            builder.addAction(android.R.drawable.ic_media_next, "Next", press("nexttrack", 3));
        }
        int[] shown = new int[compact.size()];
        for (int i = 0; i < shown.length; i++) shown[i] = compact.get(i);
        builder.setStyle(new androidx.media.app.NotificationCompat.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(shown));
        return builder.build();
    }

    @Override
    public void onDestroy() {
        if (session != null) {
            session.setActive(false);
            session.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
