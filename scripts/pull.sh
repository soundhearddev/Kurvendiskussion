#!/bin/bash

# Pfad, wo das Repo liegen soll
TARGET_DIR="/var/www/"

# Git-URL
REPO_URL="https://github.com/soundhearddev/Kurvendiskussion.git"

# Projekt jedes Mal komplett löschen
rm -rf "$TARGET_DIR"

# Neu klonen
git clone "$REPO_URL" "$TARGET_DIR"

# In das Projekt wechseln
cd "$TARGET_DIR" || exit 1
