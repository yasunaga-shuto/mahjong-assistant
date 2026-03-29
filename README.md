# mahjong-assistant

リアル麻雀のゲーム進行をサポートするアシスタントアプリ（iOS / Android / Web 対応）。

## 機能

### 卓レイアウト
- 4人分のプレイヤーパネルを東西南北の方角に配置
- 各プレイヤーの点数表示（初期値 25,000点）
- 局表示（東一局〜北四局）

### 親番管理
- 東家（親）のランプが点灯
- 下家（東家の右隣）のランプを押すと親番が移動し、局数が進む
- 東四局の次は南一局に自動で切り替わる

### サイコロ
- 3Dサイコロ2個を表示
- 親番ランプまたはサイコロエリアを長押しするとサイコロが振られる
- 日本式（1の目が赤）

### 本場カウンター
- 本場数の表示・入力
- ▲/▼ボタンで増減、リセットボタンで0に戻す

### リセット
- リセットボタン（🔄）を押すと親番をルーレット方式でランダム決定
  - ランプが東→南→西→北と点灯し、約2.5秒後にランダムな位置で停止
  - 全員の点数が25,000点に戻る
  - 東一局に戻る

## 技術スタック

- [Expo](https://expo.dev/) SDK 54
- React Native (TypeScript)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) — 3Dサイコロ描画
- [Three.js](https://threejs.org/)
- [@expo/vector-icons](https://docs.expo.dev/guides/icons/) — Material Icons

## セットアップ

```bash
npm install
npx expo start
```

iOS / Android はExpo Goアプリで確認できます。
