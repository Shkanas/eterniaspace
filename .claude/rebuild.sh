#!/bin/sh
# Regenerates the production css/style.min.css and js/main.min.js from the
# source-of-truth css/style.css and js/main.js. Run after every edit to
# either source file, before testing in the browser (index.html loads the
# .min files, not the source ones).
cd "$(dirname "$0")/.." || exit 1
npx --yes clean-css-cli -o css/style.min.css css/style.css
npx --yes terser js/main.js -o js/main.min.js -c -m
echo "Rebuilt css/style.min.css and js/main.min.js"
