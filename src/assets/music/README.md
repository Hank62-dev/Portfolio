# Songs that ship with the app

Put audio files in this folder and they appear in Hank Music the next time the app opens: no code to change.

- Formats: `.mp3`, `.m4a`, `.aac`, `.flac`, `.ogg`, `.opus`, `.wav`.
- Title, artist, album and cover art are read from the file's tags. A file without tags is named after its file name.
- Lyrics: add a `.lrc` file with the **same name** (`Slow Tide.mp3` and `Slow Tide.lrc`).
- The first time, each file is copied into the browser's own storage, so after that it plays offline and fast.
- Delete a song in Hank Music and it stays gone (the app remembers which bundled songs you removed).
- Keep each file under 100 MB (GitHub's limit) and remember only songs you have the right to share belong in a public repository.
