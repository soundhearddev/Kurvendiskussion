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

echo "[*] Lade Apache neu..."
sudo systemctl reload apache2

echo "[✓] PHP + phpMyAdmin vollständig installiert und erreichbar!"
echo "[✓] Aufrufbar unter: http://localhost/phpmyadmin"
