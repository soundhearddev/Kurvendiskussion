#!/bin/bash
set -e

###########################
## EINFACHE KONFIGURATION
###########################

DB_NAME="db"
DB_USER="nodeapp"
DB_PASS="1234"

# Root Passwort festlegen (für Automatisierung)
MYSQL_ROOT_PASS="1234"

###########################
## INSTALLATION & SETUP
###########################

echo "[*] Installiere MariaDB Server..."
sudo apt update -y
sudo apt install -y mariadb-server

echo "[*] Sichere Grundkonfiguration anwenden..."
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED BY '${MYSQL_ROOT_PASS}'; FLUSH PRIVILEGES;"

echo "[*] Aktiviere sicheren MariaDB-Mode..."
sudo mysql -u root -p"${MYSQL_ROOT_PASS}" <<EOF
DELETE FROM mysql.user WHERE User='';  
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost');
DROP DATABASE IF EXISTS test;
FLUSH PRIVILEGES;
EOF

echo "[*] Erstelle Datenbank und Benutzer..."
sudo mysql -u root -p"${MYSQL_ROOT_PASS}" <<EOF
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'%' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'%';
FLUSH PRIVILEGES;
EOF

echo "[*] Setze Bind-Address auf 0.0.0.0 (optional, falls extern benötigt)..."
sudo sed -i "s/^bind-address.*/bind-address = 0.0.0.0/" /etc/mysql/mariadb.conf.d/50-server.cnf
sudo systemctl restart mariadb

echo "[✓] Fertig! MariaDB ist installiert und vorkonfiguriert."
