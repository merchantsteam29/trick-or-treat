#!/bin/sh
# syntax-checks every module (node only checks ES module syntax for .mjs files)
cd "$(dirname "$0")/.." || exit 1
t=$(mktemp -d); bad=0
for f in js/*.js *.js; do cp "$f" "$t/x.mjs"; node --check "$t/x.mjs" 2>"$t/err" || { echo "== $f"; head -5 "$t/err"; bad=1; }; done
rm -rf "$t"; exit $bad
