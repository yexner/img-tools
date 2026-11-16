# Test fixtures

Every file here was made for this project; never download test images. Keep the folder under 300 KB in total, and record how each new file was made in this table.

| File                         | How it was made                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sample.png`                 | `ffmpeg -f lavfi -i testsrc2=size=480x360 -frames:v 1 sample.png`                                                                                                 |
| `sample.jpg`                 | `ffmpeg -i sample.png -q:v 4 sample.jpg` (no metadata)                                                                                                            |
| `sample.webp`                | Encoded by Chromium: `OffscreenCanvas.convertToBlob({ type: 'image/webp', quality: 0.75 })` from `sample.png` at 240x180                                          |
| `sample.avif`                | Encoded by our own AVIF wrapper (`@jsquash/avif`, quality 50, speed 8) from `sample.png` scaled to 240x180 with ffmpeg                                            |
| `sample.bmp`, `sample.tiff`, `sample.heic` | `sips -s format <fmt>` from `sample.png` scaled to 120x90 with ffmpeg                                                                               |
| `sample.svg`                 | Hand-written, with editor namespaces, metadata, comments and long numbers, for the SVG optimizer                                                                  |
| `sample.pdf`                 | Two JPG pages written by our own `buildPdf` (`sample.jpg`, `rotated.jpg`)                                                                                         |
| `locked.pdf`                 | `qpdf --encrypt secret owner 256 -- sample.pdf locked.pdf` (user password `secret`)                                                                               |
| `text.pdf`                   | Hand-written one-page PDF with the text "Hello PDF" in standard Helvetica, not embedded                                                                           |
| `rotated.jpg`                | `sample.jpg` with `exiftool -n -Orientation=6`                                                                                                                    |
| `dpi-300.jpg`, `dpi-150.png` | 120x90 copies of `sample.png`; exiftool JFIF density 300 / `sips -s dpiWidth 150`                                                                                 |
| `photo-gps.jpg`              | `dpi-300.jpg` plus exiftool tags: Testcam T-1000, ISO 200, 1/250 s, f/2.8, 35 mm, Software, Artist, GPS 48.8584 N 2.2945 E (a public landmark), 35 m, GPS clock 2024-06-15 12:30 UTC, offset +02:00 |
| `photo-gps2.jpg`             | `photo-gps.jpg` with another public landmark (51.5007 N, 0.1246 W), 11 m, another time                                                                            |
| `clip.mp4`                   | `ffmpeg -i <testsrc clip> -t 2 -vf scale=160:-2 -c:v libx264 -crf 34 -an -movflags +faststart clip.mp4` (2 s, 160x120, 10 KB)                                     |
| `anim.gif`                   | `ffmpeg -i clip.mp4 -t 1.2 -vf "fps=6,scale=96:-1" anim.gif` (7 frames, 96x72). ffmpeg's frame differencing gives sub-rectangle frames; tests compare our compositing with ffmpeg's |

Multi-page and broken TIFF files are built inside the tests by `tests/helpers/tiff.ts`.
