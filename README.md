# yno-userscript

**Author:** Zebraed
**License:** MIT

> **⚠️ Disclaimer**
>
> The scripts included in this repository are unofficial userscripts for YNO Project. The author is not responsible for any damages that may occur from using these scripts. Use the scripts at your own risk.

## YNO Expeditions Enhancer [en]
![image](https://github.com/user-attachments/assets/3eb505c4-9a5d-45b9-b5f6-3f0b873464aa)

### Overview

YNO Expeditions Enhancer is a Tampermonkey userscript designed to enhance the expeditions feature on [YNO Project](https://ynoproject.net). You will be able to check the next destination on the screen without having to click on the Expeditions window to display it.


### Features

- **Enhanced Destination Display:**
  Provides additional visual details about the next expedition destination, including a representation of the "depth" with star icons.

- **Interactive Expedition Button:**
  Clicking the Expedition icon(like this 🌟) button triggers the display of the location depth as star icons, making it easy to visualize the target maps's depth.

- **Settings:**
  <p align="center">
  <img src="https://github.com/user-attachments/assets/c8bed068-9fb1-4423-89f5-af1d4fb4a5e5" width="50%" />
  </p>

  Provides a settings UI where you can toggle notifications and auto-hide behavior:
  - **Fixed on Screen:** Option to fix the destination information display on the screen.
  - **Enable Notification:** Toggle this to enable or disable the notification of the name of the next place when you reach a expeditions destination.
  - **Auto-hide Notification:** When enabled, notifications will close automatically.

- **"Destination Log" Recording Feature:**
  When you check "Enable Destination Logs", the destinations you reach will be recorded. Daily total is also recorded.
  Each log entry includes the map name and depth (actual depth and max depth without shortcuts).
  Logs are listed by date (based on UTC) for each game. You can download or delete them.

### Installation

  1. Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript manager for your browser.　
  2. Go to https://github.com/zebraed/yno-userscript/blob/main/monkey/expeditions-enhancer.user.js and click the "Raw" button.<br>![image](https://github.com/user-attachments/assets/13984768-4542-4bff-a743-5412d4cc1a88)

  3. Click on Install. It will be installed as a Tampermonkey script.
  4. Open any game that has the [YNO Project](https://ynoproject.net) expeditions and check that it is working. If the extension icon looks like the image below, it is working. <br>![image](https://github.com/user-attachments/assets/ebf475ac-004e-4bb7-8e69-9340082ed8ab)


<br>
＊If it doesn't work on browser, you will need to enable developer mode in your browser.
<br>
Google Chrome:
  1. Open Google Chrome.
  2. Click the three dots in the top right corner of the browser window.
  3. Select More tools > Developer tools.
  4. In the developer tools window, click the three dots in the top right corner.Select Developer mode.

### Configuration

The script provides an in-game settings UI accessible through the game's settings modal. Your configuration is saved locally under the key `toastConfig`.
The destination logs are saved in localStorage.


### License

This project is licensed under the MIT License.

<br>
Enjoy your expeditions!

---

<br>
<br>


## YNO SSS[en]

**Screenshot sharing works between users who have this script installed**

### Overview

YNO SSS is a Tampermonkey userscript that enhances screenshot sharing functionality in [YNO Project](https://ynoproject.net) chat. This script converts screenshot IDs (like `[screenshot]`) into clickable hyperlinks that open the screenshot viewer modal, **without displaying images directly in chat**.

### Features

- **Screenshot ID Hyperlinks:**
  Automatically converts screenshot IDs in chat messages to clickable hyperlinks
  - Screenshot IDs (`[XXXXXXXX]`) remain as clickable links
  - Screenshots are not displayed in the chat
  - Clicking the link opens the screenshot viewer modal

- **Chat Scope Control:**
  - Only works in Map and Party chats (disabled in Global chat)
  - Respects the game's chat system design

- **Respects Game Security:**
  Does not bypass official security measures or display images directly in chat

- **Cross-User Compatibility:**
  Screenshot sharing works between users who have this script installed

### Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript manager for your browser.
2. Go to https://github.com/zebraed/yno-userscript/blob/main/monkey/share-ss.user.js and click the "Raw" button.
3. Click on Install. It will be installed as a Tampermonkey script.
4. Open any [YNO Project](https://ynoproject.net) game and check that it is working by looking for clickable screenshot IDs in chat.

The script simply makes screenshot IDs clickable in chat, using the same mechanisms that the game already supports. It does not modify game state.

<br>
<br>

---

## YNO Badge Preset IO [en]

### Overview

YNO Badge Preset IO is a Tampermonkey userscript that allows you to import and export badge presets on [YNO Project](https://ynoproject.net). You can export and import your badge presets as JSON files.

### Features

- **Export Badge Presets:**
  Export the currently selected badge preset to a JSON file.

- **Import Badge Presets:**
  Import badge presets from JSON files. The script validates the data and applies it to the selected preset slot without modifying your current badge gallery.

### Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) or another userscript manager for your browser.
2. Go to https://github.com/zebraed/yno-userscript/blob/main/monkey/badge-preset-io.user.js and click the "Raw" button.
3. Click on Install. It will be installed as a Tampermonkey script.
4. Open any [YNO Project](https://ynoproject.net) game, go to Badge Gallery, and click "Manage Badge Gallery" -> "Manage Presets". You should see "Export" and "Import" buttons in the preset modal.

### Usage

1. **Export:**
   1. Open Badge Gallery and click "Manage Badge Gallery" -> "Manage Presets".
   2. Select the preset you want to export
   3. Click "Export" button
   4. A JSON file will be downloaded

2. **Import:**
   1. Open Badge Gallery and click "Manage Badge Gallery" -> "Manage Presets".
   2. Select the preset slot where you want to import
   3. Click "Import" button
   4. Select the JSON file you want to import
   5. The preset will be saved to the selected slot

**Note:** Importing a preset only saves it to the preset slot. To apply it to your badge gallery, use the "Apply" button after importing.

<br>
<br>

---

# yno-userscript (日本語)

> **⚠️ 免責事項 (Disclaimer)**
>
> このリポジトリに含まれるスクリプトは、YNO Projectの非公式ユーザースクリプトです。これらのスクリプトを使用して発生したいかなる損害についても、作者は一切の責任を負いません。スクリプトの使用は自己責任で行ってください。
>

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
  <img src="https://github.com/user-attachments/assets/66435b4b-7fce-462a-be19-50ce0360e507"  width="50%"/>
  </p>

  通知の切り替えや自動非表示の動作を設定できるUIを提供します。
  - **画面に固定表示：** 目的地情報の詳細表示を画面に表示するオプションです。
  - **目的地到達通知を有効にする：** ドリームラリーの目的地に到達した際の次の場所名の通知を有効または無効にすることができます。
  - **目的地到達通知を自動で閉じる：** 通知を自動で閉じる機能を有効または無効にすることができます。

- **"到達場所ログ" 記録機能：**

  「到達場所ログを有効にする」にチェックをいれると、到達した目的地のログを記録することができます。その日の到達数も記録されます。
  ログは、マップ名と深度(実際の深度, ショートカットなしでの深度)が記録されます。
  ログは、各ゲーム毎にUTCを基準に日付でリストアップされます。ダウンロードと削除が可能です。

### インストール

  1. [Tampermonkey](https://www.tampermonkey.net/) をブラウザ拡張機能としてインストール、または使用しているブラウザ用の別のユーザースクリプトマネージャー（violentmonkeyなど）をブラウザ拡張機能としてインストールします。
  2.  https://github.com/zebraed/yno-userscript/blob/main/monkey/expeditions-enhancer.user.js にアクセスし、Rawボタンをクリックします。<br>![image](https://github.com/user-attachments/assets/13984768-4542-4bff-a743-5412d4cc1a88)
  3. インストールをクリックします。Tampermonkeyスクリプトとしてインストールがされます。
  4. [YNO Project](https://ynoproject.net)のドリームラリーが存在する任意のゲームを開き、動作しているか確認してください。拡張機能のアイコンが以下の画像のようになっていれば動作しています。<br>![image](https://github.com/user-attachments/assets/ebf475ac-004e-4bb7-8e69-9340082ed8ab)

<br>
※ 動作しない場合、ブラウザの開発者モードを有効にする必要があります
<br>
Google Chrome: https://kuds.blog/google/tampermonkey-script-issue-mv3/
<br>
Micro Soft Edge: https://platform.kobot.jp/support/solutions/articles/47001176124-%E3%83%96%E3%83%A9%E3%82%A6%E3%82%B6-edge-%E6%8B%A1%E5%BC%B5%E6%A9%9F%E8%83%BD%E3%81%AE%E8%BF%BD%E5%8A%A0%E6%96%B9%E6%B3%95

### 構成

このスクリプトは、ゲームの設定モーダルからアクセスできるゲーム内設定UIを提供します。設定は、`toastConfig` キーの下にローカルに保存されます。
マップの到達ログは`localStorage`に保存されます。



---
<br>
たのしいドリームラリーを！


---

<br>
<br>

## YNO SSS [ja]

**このスクリプトを導入しているユーザー同士であればスクリーンショットを見せ合うことが可能です。**

### 概要

YNO SSSは、[YNO Project](https://ynoproject.net)のマップ、パーティーチャットでスクリーンショット共有をするTampermonkeyユーザースクリプトです。このスクリプトは、チャット内のスクリーンショットIDをクリック可能なハイパーリンクに変換し、**チャットに画像を表示せず**、スクリーンショットビューアを開くことで、スクリーンショット共有機能の代替を提供します。

### 機能

- **スクリーンショットIDハイパーリンク:**
  マップ、パーティーチャットメッセージ内のスクリーンショットIDを自動的にクリック可能なハイパーリンクに変換
  - スクリーンショットID（`[XXXXXXXX]`）はクリック可能なリンクとして表示
  - **チャットに画像は表示されません**
  - リンクをクリックするとスクリーンショットビューアモーダルが開きます

- **チャット範囲制御:**
  - MapとPartyチャットでのみ動作（Globalチャットでは無効です）
  - ゲームのチャットシステム設計を尊重

- **ゲームセキュリティの尊重:**
  公式の意思を尊重し、チャットに直接画像を表示しません

- **ユーザー間の互換性:**
  このスクリプトを導入しているユーザー同士であればスクリーンショットを見せ合うことが可能です。

### インストール

1. [Tampermonkey](https://www.tampermonkey.net/) または他のユーザースクリプトマネージャーをブラウザにインストールします。
2. https://github.com/zebraed/yno-userscript/blob/main/monkey/share-ss.user.js にアクセスし、「Raw」ボタンをクリックします。
3. インストールをクリックします。Tampermonkeyスクリプトとしてインストールされます。
4. 任意の[YNO Project](https://ynoproject.net)ゲームを開き、チャットでスクリーンショットIDがクリック可能になっていることを確認してください。



このスクリプトは、ゲームが既にサポートしている機能を使用して、スクリーンショットIDをチャット内でクリック可能にするだけです。

---

## YNO Badge Preset IO [ja]

### 概要

YNO Badge Preset IOは、[YNO Project](https://ynoproject.net)でバッジプリセットのインポートとエクスポートを可能にするTampermonkeyユーザースクリプトです。バッジプリセットをJSONファイルとしてローカルにファイルとしてエクスポート、インポートしたりすることができます。

### 機能

- **バッジプリセットのエクスポート:**
  現在選択中のバッジプリセットをJSONファイルとしてエクスポートします。

- **バッジプリセットのインポート:**
  JSONファイルからバッジプリセットをインポートします。

### インストール

1. [Tampermonkey](https://www.tampermonkey.net/) または他のユーザースクリプトマネージャーをブラウザにインストールします。
2. https://github.com/zebraed/yno-userscript/blob/main/monkey/badge-preset-io.user.js にアクセスし、「Raw」ボタンをクリックします。
3. インストールをクリックします。Tampermonkeyスクリプトとしてインストールされます。
4. 任意の[YNO Project](https://ynoproject.net)ゲームを開き、バッジギャラリーを開いて「バッジギャラリー管理」->「プリセット」をクリックします。各プリセットモーダルに「エクスポート」と「インポート」ボタンが表示されます。

### 使い方

1. **エクスポート:**
   1. バッジギャラリーを開き、「バッジギャラリー管理」->「プリセット」をクリック
   2. エクスポートしたいプリセットを選択
   3. 「エクスポート」ボタンをクリック
   4. JSONファイルがダウンロードされます

2. **インポート:**
   1. バッジギャラリーを開き、「バッジギャラリー管理」->「プリセット」をクリック
   2. インポート先のプリセットスロットを選択
   3. 「インポート」ボタンをクリック
   4. インポートしたいJSONファイルを選択
   5. 選択したスロットにプリセットが保存されます

**注意:** プリセットのインポートは、プリセットスロットに保存するだけです。バッジギャラリーに適用するには、インポート後に「適用」ボタンを押してください。
