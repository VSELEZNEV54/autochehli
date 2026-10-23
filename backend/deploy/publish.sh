#!/bin/sh
# Выкладка сайта: собрать страницы и скопировать в корень nginx ТОЛЬКО публичные файлы.
# Запуск из корня репозитория: sh backend/deploy/publish.sh user@server:/var/www/avtostil
# backend/, tools/, content/, partials/, build.py и служебные папки на сервер в корень сайта не попадают.
set -eu
DEST="${1:?Укажите куда: user@server:/var/www/avtostil или локальную папку}"
python3 build.py
rsync -av --delete \
  --include "/*.html" --include "/css/***" --include "/js/***" --include "/assets/***" \
  --include "/robots.txt" --include "/sitemap.xml" --include "/favicon.ico" \
  --exclude "*" ./ "$DEST/"
echo "Сайт выложен в $DEST. Бэкенд читает из него js/data.js и js/app.js — после смены цен перезапустите бэкенд."
