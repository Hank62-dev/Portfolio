package dev.hank62.app;

import android.content.Context;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.FilterInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Podcast episodes kept on the phone, to listen with no network. Hank62Plugin downloads them here (the app's own storage,
 * removed with the app), and the page plays them from https://<site>/_hank62_offline_/<id>: MainActivity answers that address
 * from the file, with byte ranges, so the player can seek and carry on from where it was left.
 */
final class Episodes {

    static final String PATH = "_hank62_offline_";

    /** Downloads that were asked to stop. */
    static final Set<String> cancelled = ConcurrentHashMap.newKeySet();

    private Episodes() {}

    /** An id the page made (letters, digits, - and _), so it can never reach outside the folder. */
    static boolean validId(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,120}");
    }

    static File dir(Context context) {
        File dir = new File(context.getFilesDir(), "podcasts");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return dir;
    }

    static File audio(Context context, String id) {
        return new File(dir(context), id + ".audio");
    }

    static File type(Context context, String id) {
        return new File(dir(context), id + ".type");
    }

    interface Progress {
        void tell(long received, long total);
    }

    /** Downloads `address` (https only) for `id`; returns the bytes kept. Throws, leaving nothing behind, on failure or a cancel. */
    static long download(Context context, String id, String address, Progress progress) throws Exception {
        cancelled.remove(id);
        File done = audio(context, id);
        File part = new File(dir(context), id + ".part");
        HttpURLConnection connection = null;
        try {
            URL url = new URL(address);
            // podcast hosts hand the file over through a few trackers first; follow them, but only over https
            for (int hop = 0; ; hop++) {
                if (!"https".equals(url.getProtocol())) throw new Exception("Not an https address");
                connection = (HttpURLConnection) url.openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("User-Agent", "Hank62/Android");
                int status = connection.getResponseCode();
                if (status >= 300 && status < 400 && hop < 10) {
                    String next = connection.getHeaderField("Location");
                    connection.disconnect();
                    if (next == null) throw new Exception("A redirect with nowhere to go");
                    url = new URL(url, next);
                    continue;
                }
                if (status != 200) throw new Exception("HTTP " + status);
                break;
            }
            long total = connection.getContentLengthLong();
            String mime = connection.getContentType();
            long received = 0;
            long told = 0;
            try (InputStream in = connection.getInputStream(); OutputStream out = new FileOutputStream(part)) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = in.read(buffer)) != -1) {
                    if (cancelled.contains(id)) throw new InterruptedException("Cancelled");
                    out.write(buffer, 0, read);
                    received += read;
                    long now = System.currentTimeMillis();
                    if (now - told > 250) {
                        told = now;
                        progress.tell(received, total);
                    }
                }
            }
            progress.tell(received, total);
            //noinspection ResultOfMethodCallIgnored
            done.delete();
            if (!part.renameTo(done)) throw new Exception("Could not keep the file");
            try (OutputStream out = new FileOutputStream(type(context, id))) {
                out.write((mime == null || !mime.startsWith("audio/") ? "audio/mpeg" : mime.split(";")[0].trim()).getBytes(StandardCharsets.UTF_8));
            }
            return done.length();
        } catch (Exception e) {
            //noinspection ResultOfMethodCallIgnored
            part.delete();
            throw e;
        } finally {
            cancelled.remove(id);
            if (connection != null) connection.disconnect();
        }
    }

    static void delete(Context context, String id) {
        //noinspection ResultOfMethodCallIgnored
        audio(context, id).delete();
        //noinspection ResultOfMethodCallIgnored
        type(context, id).delete();
        //noinspection ResultOfMethodCallIgnored
        new File(dir(context), id + ".part").delete();
    }

    private static String mimeOf(Context context, String id) {
        File file = type(context, id);
        try (InputStream in = new FileInputStream(file)) {
            byte[] bytes = new byte[100];
            int n = in.read(bytes);
            return n > 0 ? new String(bytes, 0, n, StandardCharsets.UTF_8) : "audio/mpeg";
        } catch (IOException e) {
            return "audio/mpeg";
        }
    }

    /** The answer to /_hank62_offline_/<id> (with a byte range when one is asked), or null for any other address. */
    static WebResourceResponse serve(Context context, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (uri.getPathSegments().size() != 2 || !PATH.equals(uri.getPathSegments().get(0))) return null;
        String id = uri.getPathSegments().get(1);
        Map<String, String> headers = new HashMap<>();
        headers.put("Cache-Control", "no-store");
        headers.put("Accept-Ranges", "bytes");
        File file = validId(id) ? audio(context, id) : null;
        if (file == null || !file.exists()) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", headers, new ByteArrayInputStream(new byte[0]));
        }
        long length = file.length();
        long start = 0;
        long end = length - 1;
        boolean partial = false;
        String range = null;
        for (Map.Entry<String, String> header : request.getRequestHeaders().entrySet()) {
            if ("range".equalsIgnoreCase(header.getKey())) range = header.getValue();
        }
        if (range != null && range.startsWith("bytes=") && !range.contains(",")) {
            String[] parts = range.substring(6).trim().split("-", -1);
            try {
                if (parts[0].isEmpty()) {
                    start = Math.max(0, length - Long.parseLong(parts[1])); // the last n bytes
                } else {
                    start = Long.parseLong(parts[0]);
                    if (parts.length > 1 && !parts[1].isEmpty()) end = Math.min(end, Long.parseLong(parts[1]));
                }
                partial = true;
            } catch (NumberFormatException ignored) {
                start = 0;
                end = length - 1;
            }
        }
        if (start >= length || start > end) {
            headers.put("Content-Range", "bytes */" + length);
            return new WebResourceResponse("text/plain", "utf-8", 416, "Range Not Satisfiable", headers, new ByteArrayInputStream(new byte[0]));
        }
        try {
            FileInputStream in = new FileInputStream(file);
            in.getChannel().position(start);
            long count = end - start + 1;
            headers.put("Content-Length", String.valueOf(count));
            if (partial) headers.put("Content-Range", "bytes " + start + "-" + end + "/" + length);
            return new WebResourceResponse(mimeOf(context, id), null, partial ? 206 : 200, partial ? "Partial Content" : "OK", headers, new Limited(in, count));
        } catch (IOException e) {
            return new WebResourceResponse("text/plain", "utf-8", 500, "Server Error", headers, new ByteArrayInputStream(new byte[0]));
        }
    }

    /** At most `left` bytes of a stream. */
    private static final class Limited extends FilterInputStream {

        private long left;

        Limited(InputStream in, long left) {
            super(in);
            this.left = left;
        }

        @Override
        public int read() throws IOException {
            if (left <= 0) return -1;
            int b = super.read();
            if (b >= 0) left--;
            return b;
        }

        @Override
        public int read(byte[] buffer, int offset, int length) throws IOException {
            if (left <= 0) return -1;
            int n = super.read(buffer, offset, (int) Math.min(length, left));
            if (n > 0) left -= n;
            return n;
        }

        @Override
        public int available() throws IOException {
            return (int) Math.min(super.available(), left);
        }
    }
}
