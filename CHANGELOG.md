# Changelog

All notable changes to IMG-TOOLS. The format follows [Keep a Changelog](https://keepachangelog.com), and versions follow [Semantic Versioning](https://semver.org). Before 1.0.0, tools and URLs may still change.

## [0.1.0] - 2026-10-29

First public release: 40 image tools that run in your browser.

- Convert HEIC, WebP, AVIF, TIFF, BMP and GIF to JPG, PNG, WebP or AVIF; PDF pages to JPG or PNG; images to PDF or Base64.
- Compress JPG, PNG, WebP, AVIF and GIF, by quality or to a target size in KB.
- Resize and crop, including sizes in cm or mm, social media presets, bulk crop, borders and collages.
- Privacy: view and remove EXIF metadata, export photo locations, blur and redact areas. Remove EXIF keeps only the segments and chunks that make the picture, drops data after the end of the image, and saves a file again when its structure cannot be read.
- Watermarks, GIF and video tools, developer helpers (favicons, app icons, social preview images, palettes, SVG, sprite sheets, BlurHash) and creative tools (memes, screenshot frames, text, filters).
- Passport and ID photos at 300 DPI, plus print sheets.

How it works:

- Nothing is uploaded. All processing happens in your browser, in web workers, and it works offline once a tool page has loaded.
- No account and no cookies. The live site counts usage anonymously with Umami Cloud (EU servers); counting is off when your browser sends Do Not Track or Global Privacy Control.
- Static site: copy the `build/` folder to any web host.
- MIT licensed. HEIC decoding uses libheif-js, an unmodified LGPL library.

Known limits: Safari, iOS and Android have not been tested on real devices yet. In Firefox, the GIF to MP4 bitrate setting is ignored.

[0.1.0]: https://github.com/yexner/img-tools/releases/tag/v0.1.0
