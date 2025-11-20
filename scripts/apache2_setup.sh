#!/bin/bash
set -e

echo "[*] Installiere Apache2..."
sudo apt update -y
sudo apt install -y apache2

echo "[*] Dienste aktivieren..."
sudo systemctl enable apache2
sudo systemctl start apache2

echo "[*] Aktiviere mod_rewrite..."
sudo a2enmod rewrite
sudo systemctl restart apache2

echo "[*] Setze DocumentRoot Besitzer..."
sudo chown -R $USER:$USER /var/www/html

echo "[*] Konfiguriere Apache für phpMyAdmin Zugriff..."
if [ -f /etc/phpmyadmin/apache.conf ]; then
    sudo ln -sf /etc/phpmyadmin/apache.conf /etc/apache2/conf-available/phpmyadmin.conf
    sudo a2enconf phpmyadmin
    sudo systemctl reload apache2
fi

echo "[✓] Apache2 bereit inklusive phpMyAdmin-Konfiguration!"