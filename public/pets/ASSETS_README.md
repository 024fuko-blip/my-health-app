# ペットアセット生成ガイド（Leonardo.ai / Scenario.gg 用）

以下のアセットを Leonardo.ai または Scenario.gg で生成し、対応するパスに配置してください。
透過 PNG（背景透明）で出力し、512x512px 程度を推奨。

## プロンプトの基本スタイル

```
3D chibi style, cute kawaii character, soft pastel colors, white background or transparent, game asset, simple shapes, rounded forms
```

## 1. ペット本体（6種 x 3ステージ = 18枚）

配置先: `public/pets/{species}/{stage}.png`
- species: cat, dog, rabbit, capybara, hamster, duck
- stage: baby, junior, adult

### Baby（Lv1-4）
```
3D chibi baby [動物名], tiny cute, small round body, big eyes, soft fur, kawaii game character, transparent background
```
例: `3D chibi baby cat, tiny cute, small round body, big eyes, soft fur...`

### Junior（Lv5-7）
```
3D chibi [動物名], young cute, medium size, expressive face, soft colors, game character, transparent background
```

### Adult（Lv8-10）
```
3D chibi adult [動物名], confident pose, larger but still cute, detailed fur, game character, transparent background
```

## 2. 着せ替えオーバーレイ（5種）

配置先: `public/pets/outfits/{id}.png`
- ribbon, hat, glasses, scarf, crown

```
3D chibi accessory [アイテム名], cute game item, wearable, isolated on transparent background, 512x512
```

## 3. 部屋背景（4種）

配置先: `public/pets/rooms/{id}.png`
- default: 基本の部屋
- forest: 森のテーマ
- ocean: 海のテーマ
- night: 夜空のテーマ

```
cozy room background, 3D chibi style, [テーマ], warm lighting, game environment, 1024x768
```

## 4. 気ままな青年（Lv.5 サングラス）

配置先: `public/pets/cat/stage_5_sunglasses.png`
```
3D chibi cat with sunglasses, cool pose, casual style, kawaii game character, transparent background, 512x512
```

## 5. 液体ねこ（Lv.4 のびのび学生）

配置先: `public/pets/cat/stage_4_liquid.png`
```
Liquid cat, melted blob shape, fits in cup, "cats are liquid" meme style, cute kawaii, semi-transparent, transparent background, 512x512
```

## 6. 液体ねこ用容器（5種）

配置先: `public/pets/containers/{id}.png`
- mug: マグカップ
- box: 段ボール箱
- bowl: どんぶり
- vase: 花瓶
- pot: 植木鉢

```
Cute container [名前], 3D chibi style, empty vessel, transparent or white background, 256x256
```

## 7. 家具（10種）

配置先: `public/pets/furniture/{id}.png`
- plant, lamp, rug, bookshelf, sofa, aquarium, plushie, clock, cushion, picture

```
3D chibi furniture [アイテム名], cute game prop, small item, transparent background, 256x256
```

## フォールバック

画像が存在しない場合は絵文字で表示されます。段階的に追加可能です。
