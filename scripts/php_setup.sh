#!/bin/bash
set -e

###########################
## KONFIGURATION
###########################

PHP_VERSION="8.2"

###########################
## PHP INSTALLATION
###########################

echo "[*] Installiere PHP und Module..."
sudo apt update -y
sudo apt install -y \
 php${PHP_VERSION} \
 php${PHP_VERSION}-mysql \
 php${PHP_VERSION}-cli \
 php${PHP_VERSION}-curl \
 php${PHP_VERSION}-mbstring \
 php${PHP_VERSION}-xml \
 php${PHP_VERSION}-zip \
 php${PHP_VERSION}-intl \
 libapache2-mod-php${PHP_VERSION}

echo "[*] Apache für PHP aktivieren..."
sudo a2enmod php${PHP_VERSION}
sudo systemctl restart apache2

echo "[*] Erstelle PHP Testdatei..."
echo "<?php phpinfo(); ?>" | sudo tee /var/www/html/info.php > /dev/null


###########################
## PHPMYADMIN INSTALLATION
###########################

echo "[*] Installiere phpMyAdmin..."
sudo apt install -y phpmyadmin

echo "[*] Verknüpfe phpMyAdmin mit Apache..."
if [ -f /etc/phpmyadmin/apache.conf ]; then
    sudo ln -sf /etc/phpmyadmin/apache.conf /etc/apache2/conf-available/phpmyadmin.conf
    sudo a2enconf phpmyadmin
fi


echo "[*] Installation eines Themes für phpMyAdmin..."
sudo apt install -y unzip wget


PHPMYADMIN_THEME_DIR="/usr/share/phpmyadmin/themes/"
THEME_NAME="boodark"
LINK="https://files.phpmyadmin.net/themes/boodark/1.0.0/boodark-1.0.0.zip"
CONFIG_FILE="/etc/phpmyadmin/config.inc.php"

git clone https://github.com/adorade/boodark.git /tmp/boodark
sudo mv -r /tmp/boodark/themes/boodark $PHPMYADMIN_THEME_DIR
sudo rm -rf /tmp/boodark
echo "[*] Setze Standard-Theme für phpMyAdmin..."



if ! grep -q "\$cfg\['ThemeDefault'\] = '${THEME_NAME}';" "$CONFIG_FILE"; then
    echo "\$cfg['ThemeDefault'] = '${THEME_NAME}';" | sudo tee -a "$CONFIG_FILE" > /dev/null
fi


echo "[*] Lade Apache neu..."
sudo systemctl reload apache2

echo "[✓] PHP + phpMyAdmin vollständig installiert und erreichbar!"
echo "[✓] Aufrufbar unter: http://localhost/phpmyadmin"
