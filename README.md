# yno-userscript

**Author:** Zebraed
**License:** MIT

## YNO Expeditions Enhancer [en]

![image](https://github.com/user-attachments/assets/e489657a-8635-4ee9-a54d-291c7ee3cd43)

### Overview

YNO Expeditions Enhancer is a Tampermonkey userscript designed to enhance the expeditions feature on [YNO Project](https://ynoproject.net). You will be able to check the next destination on the screen without having to click on the Expeditions window to display it.


### Features

- **Enhanced Destination Display:**
  Provides additional visual details about the next expedition destination, including a representation of the "depth" with star icons.

- **Interactive Expedition Button:**
  Clicking the Expedition icon(like this 🌟) button triggers the display of the location depth as star icons, making it easy to visualize the target maps's depth.

- **Settings:**
  <p align="center">
  <img src="https://github.com/user-attachments/assets/038adbeb-8dc1-4102-bfba-1f012fb24cef" width="50%" />
  </p>

  Provides a settings UI where you can toggle notifications and auto-hide behavior:
  - **Fixed on Screen:** Option to fix the destination information display on the screen.
  - **Enable Notification:** Toggle this to enable or disable the notification of the name of the next place when you reach a expeditions destination.
  - **Auto-hide Notification:** When enabled, notifications will close automatically.

### Installation

  1. Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript manager for your browser.
  2. Go to https://github.com/zebraed/yno-userscript/blob/main/monkey/expeditions-enhancer.user.js and click the "Raw" button.
  3. Click on Install. It will be installed as a Tampermonkey script.
  4. Open any game that has the [YNO Project](https://ynoproject.net) expeditions and check that it is working. If the extension icon looks like the image below, it is working.

<br>
  ＊If it doesn't work on Google Chrome, you will need to enable developer mode in your browser.

### Configuration

The script provides an in-game settings UI accessible through the game's settings modal. Your configuration is saved locally under the key `toastConfig`.

### License

This project is licensed under the MIT License.

<br>
Enjoy your expeditions!

---

<br>
<br>

## YNO Expeditions Enhancer [ja]
![image](https://github.com/user-attachments/assets/bb0783c1-d665-4b26-9db9-f343cfb63b0d)


### 概要

YNO Expeditions Enhancerは、[YNO Project](https://ynoproject.net)のコンテンツであるドリームラリーをより快適にプレイするため作成されたTampermonkeyユーザースクリプトです。いちいちドリームラリーウィンドウをクリックして表示しなくても、次の目的地を画面上で確認することができるようになります。

### 機能

- **拡張された目的地表示：**
   次のラリーの目的地の詳細情報を場所表示の下に表示します。

- **目的地深度表示ボタン：**
  「ドリームラリー」アイコンボタン（🌟のようなアイコン）をクリックすると、目的地の深さを表示できます。

- **設定機能：**

  <p align="center">
  <img src="https://github.com/user-attachments/assets/7686033e-e6b9-409e-94ab-c00e66bf016b"  width="50%"/>
  </p>

  通知の切り替えや自動非表示の動作を設定できるUIを提供します。
  - **画面に固定表示：** 目的地情報の詳細表示を画面に表示するオプションです。
  - **目的地到達通知を有効にする：** ドリームラリーの目的地に到達した際の次の場所名の通知を有効または無効にすることができます。
  - **目的地到達通知を自動で閉じる：** 通知を自動で閉じる機能を有効または無効にすることができます。

### インストール

  1. [Tampermonkey](https://www.tampermonkey.net/) をブラウザ拡張機能としてインストール、または使用しているブラウザ用の別のユーザースクリプトマネージャー（violentmonkeyなど）をブラウザ拡張機能としてインストールします。
  2.  https://github.com/zebraed/yno-userscript/blob/main/monkey/expeditions-enhancer.user.js にアクセスし、Rawボタンをクリックします。
  3. インストールをクリックします。Tampermonkeyスクリプトとしてインストールがされます。
  4. [YNO Project](https://ynoproject.net)のドリームラリーが存在する任意のゲームを開き、動作しているか確認してください。拡張機能のアイコンが以下の画像のようになっていれば動作しています。

<br>
※ Chromeで動作しない場合、ブラウザの開発者モードを有効にする必要があります
<br>
参考:https://kuds.blog/google/tampermonkey-script-issue-mv3/

### 構成

このスクリプトは、ゲームの設定モーダルからアクセスできるゲーム内設定UIを提供します。設定は、`toastConfig` キーの下にローカルに保存されます。



---
<br>
たのしいドリームラリーを！
