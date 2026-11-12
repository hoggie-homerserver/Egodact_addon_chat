#!/usr/bin/env python3
"""Regenerate js/emoji-data.js from the official Unicode emoji-test.txt.

Usage:
    python tools/build-emoji-data.py path/to/emoji-test.txt

Download the file from https://unicode.org/Public/emoji/latest/emoji-test.txt
and run this script from the addon root. It writes js/emoji-data.js.
"""

import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "js", "emoji-data.js")

LINE_RE = re.compile(
    r"^([0-9A-Fa-f ]+?)\s*;\s*(fully-qualified|component)\s*#\s*(\S+)\s+E[\d.]+\s+(.*)$"
)
GROUP_RE = re.compile(r"^#\s*group:\s*(.+?)\s*$")
VERSION_RE = re.compile(r"^#\s*Version:\s*([\d.]+)\s*$")


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: build-emoji-data.py path/to/emoji-test.txt")

    groups = []
    current = None
    total = 0
    version = "unknown"

    with io.open(sys.argv[1], "r", encoding="utf-8", newline="") as f:
        for raw in f:
            line = raw.rstrip("\r\n")
            match = VERSION_RE.match(line)
            if match:
                version = match.group(1)
                continue
            match = GROUP_RE.match(line)
            if match:
                current = {"name": match.group(1), "items": []}
                groups.append(current)
                continue
            match = LINE_RE.match(line)
            if not match or match.group(2) != "fully-qualified" or current is None:
                continue
            emoji = match.group(3)
            name = match.group(4).strip()
            if not emoji or not name:
                continue
            current["items"].append((name, emoji))
            total += 1

    # The "Component" group holds isolated skin tones and hair, which are
    # building blocks rather than standalone emoji.
    groups = [g for g in groups if g["name"] != "Component" and g["items"]]

    payload = []
    for group in groups:
        icon = group["items"][0][1]
        data = "\n".join(name + "|" + emoji for name, emoji in group["items"])
        payload.append({"name": group["name"], "icon": icon, "data": data})

    header = (
        "// ============================================================\n"
        "// EGODACT CHAT — EMOJI DATA (generated)\n"
        "// ============================================================\n"
        "// Every fully-qualified emoji from Unicode emoji-test.txt\n"
        "// (version " + version + "), grouped in CLDR order. Each group holds\n"
        "// one string of \"name|emoji\" lines so the bundle stays compact;\n"
        "// js/ui.js parses it once on first use.\n"
        "//\n"
        "// Regenerate with tools/build-emoji-data.py after a Unicode update.\n"
        "// Do not edit by hand.\n"
        "\n"
        "window.EGCEmoji = {\n"
        "    version: '" + version + "',\n"
        "    groups: [\n"
    )

    parts = []
    for group in payload:
        name = group["name"].replace("\\", "\\\\").replace("'", "\\'")
        icon = group["icon"].replace("\\", "\\\\").replace("'", "\\'")
        data = group["data"].replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n")
        parts.append(
            "        {\n"
            "            name: '" + name + "',\n"
            "            icon: '" + icon + "',\n"
            "            items: '" + data + "'\n"
            "        }"
        )

    text = header + ",\n".join(parts) + "\n    ]\n};\n"

    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

    print("wrote %s (%d groups, %d emoji, %d bytes)" % (OUT, len(payload), total, len(text.encode("utf-8"))))


if __name__ == "__main__":
    main()
