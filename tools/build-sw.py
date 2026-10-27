#!/usr/bin/env python3
"""Rebuild the offline file list in sw.js and bump its version.
Run from the gasha-pwa folder after adding or changing files:  python3 tools/build-sw.py
"""
import os, re, json, time
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(root)
files = ['./', 'index.html', 'manifest.webmanifest', 'content.json']
for d in ['css', 'js', 'fonts', 'icons', 'art']:
    for f in sorted(os.listdir(d)):
        if not f.startswith('.'): files.append(f'{d}/{f}')
sw = open('sw.js', encoding='utf-8').read()
sw = re.sub(r"const PRECACHE = \[.*?\];", 'const PRECACHE = ' + json.dumps(files, indent=2) + ';', sw, flags=re.S)
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'gasha-{time.strftime('%Y%m%d%H%M%S')}';", sw)
open('sw.js', 'w', encoding='utf-8').write(sw)
print(f'sw.js updated: {len(files)} files')
