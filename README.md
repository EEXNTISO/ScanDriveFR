# 🛒 ScanDrive FR : Codes-barres & Nutri-Score

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Un userscript léger et non intrusif qui récupère automatiquement le code EAN et génère un code-barres sur les fiches produits des principaux supermarchés en ligne (drives).

<img width="720" height="410" alt="interface" src="https://github.com/user-attachments/assets/5404f141-df0a-4339-97fb-5e621f870ccd" />


## 🎯 Pourquoi utiliser ce script ?

Le but principal est de vous permettre de **scanner facilement les valeurs nutritionnelles et la composition des produits** directement depuis l'écran de votre ordinateur. 

Il vous suffit de scanner le code-barres généré avec votre application mobile favorite, comme :
- **[Yuka](https://yuka.io/)**
- **[QuelProduit](https://www.quechoisir.org/application-mobile-quelproduit-n84731/)** (par UFC-Que Choisir)

## ✨ Fonctionnalités

- **Extraction automatique et robuste** : Trouve instantanément le code EAN d'un produit, même si la page est chargée dynamiquement, en analysant en priorité le *state* du site.
- **Interface non intrusive et déplaçable** : Panneau flottant discret. Vous pouvez le **glisser-déposer** où vous voulez, et le script mémorisera sa position pour vos prochaines visites.
- **Scores Santé & Écologie (API Open Food Facts)** : Affiche instantanément le **Nutri-Score**, le **Score NOVA** (degré de transformation) et l'**Éco-Score** du produit.
- **Code-barres intégré** : Génère et affiche un code-barres (format EAN-13) scannable directement sur l'écran.
- **Copie rapide** : Bouton permettant de copier le code EAN dans le presse-papiers en un clic.

## 🚀 Installation

1. Installez l'extension **[Tampermonkey](https://www.tampermonkey.net/)** pour votre navigateur (Chrome, Firefox, Safari, Edge).
2. Une fois l'extension installée, **[cliquez ici pour installer le script](https://github.com/EEXNTISO/ELeclerc-Drive-EAN-Helper/raw/refs/heads/main/ScanDrive%20FR%20:%20Codes-barres%20&%20Nutri-Score.user.js)**
3. Allez sur n'importe quelle fiche produit d'un Drive supporté et le panneau apparaîtra !

## 🛒 Drives supportés

Actuellement, le script fonctionne automatiquement sur les supermarchés en ligne suivants :
- **E.Leclerc Drive** (`leclercdrive.fr`)
- **Carrefour** (`carrefour.fr`)
- **Système U / Courses U** (`coursesu.com`)
- **Intermarché** (`intermarche.com`)
- **Auchan** (`auchan.fr`)
- **Chronodrive** (`chronodrive.com`)

## 📜 Licence

Ce projet est sous licence **MIT**. Vous êtes libre de l'utiliser, le modifier et le distribuer.
