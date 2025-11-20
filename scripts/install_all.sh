#!/bin/bash
set -e
# Ausführen mit sudo: sudo ./install_all.sh

./scripts/mariadb_setup.sh
./scripts/apache2_setup.sh
./scripts/php_setup.sh