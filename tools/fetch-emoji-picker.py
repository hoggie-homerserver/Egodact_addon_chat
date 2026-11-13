#!/usr/bin/env python3
"""Rebuild vendor/emoji-picker.js and vendor/emoji-picker-data.json.

emoji-picker-element ships as ES modules. Manifest V3 forbids remotely hosted
code and a content script cannot use `import`, so this script downloads the
two upstream modules and wraps them in plain IIFEs that register the same
<emoji-picker> custom element.

The emoji data is inlined into vendor/emoji-picker.js as
EGCEmojiPickerInlineData, so the extension never has to fetch a
chrome-extension:// URL (which the host page CSP blocks). The same data is
also written to vendor/emoji-picker-data.json for the local test page.

The only other change to the upstream code is a constant cache key for the
bundled data file, so the picker does not issue a HEAD request for a
chrome-extension:// URL.

Usage: python tools/fetch-emoji-picker.py
"""

import io
import os
import re
import sys
import urllib.request

PICKER_VERSION = "1.29.1"
BASE = "https://unpkg.com/emoji-picker-element@" + PICKER_VERSION
DATA_URL = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1/en/emojibase/data.json"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VENDOR = os.path.join(ROOT, "vendor")


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "egodact-chat-build"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read().decode("utf-8")


def find_line(lines, exact, start=0):
    for index in range(start, len(lines)):
        if lines[index] == exact:
            return index
    raise SystemExit("line not found: " + exact)


def patch_database(database):
    lines = database.split("\n")

    etag_at = find_line(lines, "async function getETag (dataSource) {")
    lines[etag_at - 1:etag_at - 1] = [
        "// Egodact: the emoji data is bundled inside the extension, so it can never",
        "// change at runtime and the browser serves no ETag for chrome-extension:// URLs.",
        "// 'egc:inline' means the data is inlined in this file (EGCEmojiPickerInlineData).",
        "const BUNDLED_DATA_ETAG = 'egc-bundled-emoji-data';",
        "const isBundledDataSource = dataSource => /^(?:chrome|moz)-extension:/.test(dataSource);",
        "const isInlineData = dataSource => dataSource === 'egc:inline';",
        "",
    ]
    etag_at = find_line(lines, "async function getETag (dataSource) {")
    lines.insert(etag_at + 1, "  if (isInlineData(dataSource)) return 'egc-inline';")
    lines.insert(etag_at + 2, "  if (isBundledDataSource(dataSource)) return BUNDLED_DATA_ETAG;")

    data_at = find_line(lines, "async function getETagAndData (dataSource) {")
    lines.insert(data_at + 1, "  if (isInlineData(dataSource)) return ['egc-inline', EGCEmojiPickerInlineData];")
    etag_line = find_line(lines, "  const eTag = response.headers.get('etag');", data_at)
    lines[etag_line] = (
        "  const eTag = isBundledDataSource(dataSource) ? BUNDLED_DATA_ETAG : "
        "response.headers.get('etag');"
    )
    return "\n".join(lines)


def main():
    database = fetch(BASE + "/database.js")
    picker = fetch(BASE + "/picker.js")
    data = fetch(DATA_URL)

    database = database.replace("export { Database as default };", "")
    picker = picker.replace("import Database from './database.js';", "")
    picker = picker.replace(
        "export { PickerElement as default, rescueElementPrototype };\n", ""
    ).replace("export { PickerElement as default, rescueElementPrototype };", "")
    for name, source in (("database.js", database), ("picker.js", picker)):
        if re.search(r"^\s*(import|export)\b", source, re.M):
            raise SystemExit("module syntax left behind in " + name)

    database = patch_database(database)

    header = """// ============================================================
// EGODACT CHAT - VENDORED EMOJI PICKER
// ============================================================
// emoji-picker-element {VERSION} by Nolan Lawson (Apache-2.0), built from
// https://unpkg.com/emoji-picker-element@{VERSION}/picker.js and
// https://unpkg.com/emoji-picker-element@{VERSION}/database.js
//
// The two ES modules are concatenated and wrapped in IIFEs so the file can
// be loaded as a classic content script: Manifest V3 forbids remotely hosted
// code, and a content script cannot use `import`. Apart from that wrapping
// the only change is a constant cache key for the bundled data file (and an
// inlined copy of that data, so no runtime fetch is needed).
//
// The emoji data is inlined below as EGCEmojiPickerInlineData and selected
// through the 'egc:inline' dataSource sentinel by js/ui.js in the extension.
// The separate vendor/emoji-picker-data.json is still shipped for the local
// test page.
//
// Regenerate with tools/fetch-emoji-picker.py after an upstream update.
// ============================================================

'use strict';

// Inlined emoji dataset (MIT, emoji-picker-element-data from emojibase).
var EGCEmojiPickerInlineData = {DATA};

var EGCEmojiPickerDatabase = (function () {
""".replace("{VERSION}", PICKER_VERSION).replace("{DATA}", data)

    middle = """
return Database;
})();

(function (Database) {
"""
    footer = """
})(EGCEmojiPickerDatabase);
"""

    build = header + database.rstrip() + middle + picker.rstrip() + footer

    os.makedirs(VENDOR, exist_ok=True)
    with io.open(os.path.join(VENDOR, "emoji-picker.js"), "w", encoding="utf-8", newline="\n") as out:
        out.write(build)
    with io.open(os.path.join(VENDOR, "emoji-picker-data.json"), "w", encoding="utf-8", newline="\n") as out:
        out.write(data)

    print("emoji-picker-element " + PICKER_VERSION)
    print("  vendor/emoji-picker.js        %d bytes" % len(build))
    print("  vendor/emoji-picker-data.json %d bytes" % len(data))


if __name__ == "__main__":
    sys.exit(main())
