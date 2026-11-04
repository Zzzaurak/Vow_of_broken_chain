# 像素角色生成记录

- 日期：2026-11-04。
- 工具：内置 `image_gen`，通过 imagegen 技能调用；使用真正透明背景选项。
- 目标：首版六名已有立绘角色的四方向站立素材，每人一张 2×2 图集。
- 参考：各角色 `portraits/default.png` 仅作身份与服装参考；先生成大肥鱼，再以大肥鱼图集为其他五人的画风与布局参考。
- 保存：生成结果复制到各角色的 `sprites/idle-directions.png`，原立绘不覆盖，未使用程序重新绘制或改色。
- 检查：逐张查看角色特征、正背左右朝向和像素风一致性；透明通道、四格尺寸、可见边界由本地读取检查。图集实际尺寸与每帧边界见 `manifest.json`，不以提示词中期望尺寸代替实际结果。
- 阶段：站立方向图；行走和战斗动作尚未制作。图中细节经过像素风简化，接入前按统一显示高度和脚底位置对齐。

以下保留每名角色实际使用的完整提示词。共同规范有重复，便于单独重做某一角色时使用。

## deepseek

参考：`deepseek/portraits/default.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction sprite sheet for a top-down 2D pixel RPG, not a portrait or illustration.
Input image: reference image for character identity and costume only.
Subject: DeepSeek, the SAME blue-haired whale girl from the supplied portrait. Keep her navy blue and white maid dress, white frilled headband, small blue ribbon, turquoise eyes, very long blue hair and distinct dark blue whale tail. Simplify the whale emblem on her white apron. No weapon, no bowl.
Primary request: draw exactly FOUR full-body CHIBI PIXEL ART standing sprites of this same girl, in a strict equally spaced 2 by 2 grid, on genuine transparent alpha. TOP LEFT faces DOWN toward viewer. TOP RIGHT faces UP away from viewer (back of head, no visible face). BOTTOM LEFT is a true LEFT-facing profile. BOTTOM RIGHT is a true RIGHT-facing profile. This is a game sprite turnaround, not four front-facing poses.
Canvas: square 1024x1024. Each quadrant is 512x512; center each sprite horizontally at quadrant center, feet baseline at 448px relative to its cell. Keep the entire character, hair and whale tail inside its own cell with at least 40px of transparent padding. Identical scale and height in every cell.
Style: authentic hand-placed 16-bit RPG pixel art, chunky visible square pixels, approximately a 64x64 logical sprite enlarged with nearest-neighbor, 2.5-head-tall proportions, crisp dark pixel outline, simple 3-tone shading, limited 24-color palette, slight overhead orthographic game camera, friendly readable face. Not smooth anime painting, not vector, no antialiasing, no gradients, no shadows underneath, no background, no checkerboard drawn into the image. No text, no labels, no gridlines, no watermark. Exactly four sprites and nothing else.
```

## claude

参考：`claude/portraits/default.png`、`deepseek/sprites/idle-directions.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction standing sprite sheet for a top-down 2D pixel RPG.
Input image 1 is the character identity and costume reference. Input image 2 is the already approved DeepSeek sprite sheet: MATCH its chibi proportions, scale, chunky pixel resolution, outlines, limited-palette shading, camera angle and 2x2 layout, but draw the character in image 1 instead of DeepSeek.
Primary request: exactly FOUR full-body CHIBI PIXEL ART standing sprites of the SAME character. Strict 2 by 2 grid on real transparent alpha. TOP LEFT faces DOWN toward the viewer. TOP RIGHT faces UP away from viewer, back of head, no face. BOTTOM LEFT is true LEFT-facing profile. BOTTOM RIGHT is true RIGHT-facing profile.
Square canvas, ideally 1280x1280; 640x640 equal cells. Center sprites at x=320 within each cell, feet baseline y=600 within each cell. Entire character including all hair, ears, tails and wings must remain inside its own cell with generous clear padding. Identical scale and apparent height in each cell, about 2.5 heads tall.
Style: authentic 16-bit RPG pixel art with clearly visible square-pixel clusters, crisp dark outline, flat 3-tone shading, approximately 64x64 logical character enlarged by nearest neighbor. Simple readable design. No smooth anime painting, gradients, blur, antialiasing, textures, underfoot shadows, backgrounds, text, labels, grid lines or watermarks. Exactly four sprites and nothing else. Do not draw checkerboard, use true transparent alpha.

Subject and identity: Claude: very long orange hair, sunflower-shaped orange hair ornament with black ribbon, warm amber eyes, white and black ceremonial dress with orange center panel and restrained gold trim, white boots. Carry a small brown sunflower prayer book against chest. Preserve her recognizable white/orange/black outfit. No wings or tail.
```

## gpt

参考：`gpt/portraits/default.png`、`deepseek/sprites/idle-directions.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction standing sprite sheet for a top-down 2D pixel RPG.
Input image 1 is the character identity and costume reference. Input image 2 is the already approved DeepSeek sprite sheet: MATCH its chibi proportions, scale, chunky pixel resolution, outlines, limited-palette shading, camera angle and 2x2 layout, but draw the character in image 1 instead of DeepSeek.
Primary request: exactly FOUR full-body CHIBI PIXEL ART standing sprites of the SAME character. Strict 2 by 2 grid on real transparent alpha. TOP LEFT faces DOWN toward the viewer. TOP RIGHT faces UP away from viewer, back of head, no face. BOTTOM LEFT is true LEFT-facing profile. BOTTOM RIGHT is true RIGHT-facing profile.
Square canvas, ideally 1280x1280; 640x640 equal cells. Center sprites at x=320 within each cell, feet baseline y=600 within each cell. Entire character including all hair, ears, tails and wings must remain inside its own cell with generous clear padding. Identical scale and apparent height in each cell, about 2.5 heads tall.
Style: authentic 16-bit RPG pixel art with clearly visible square-pixel clusters, crisp dark outline, flat 3-tone shading, approximately 64x64 logical character enlarged by nearest neighbor. Simple readable design. No smooth anime painting, gradients, blur, antialiasing, textures, underfoot shadows, backgrounds, text, labels, grid lines or watermarks. Exactly four sprites and nothing else. Do not draw checkerboard, use true transparent alpha.

Subject and identity: GPT: white long hair, purple eyes, TWO ivory curved dragon horns, pale white small bat-like dragon wings folded close, slender pale dragon tail, elegant white dress with silver knot/rosette ornaments and light lavender shadows, white shoes. Fit folded wings inside frame; she is the same humanoid dragon lady from reference, not a giant dragon. No crown or weapon.
```

## glm

参考：`glm/portraits/default.png`、`deepseek/sprites/idle-directions.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction standing sprite sheet for a top-down 2D pixel RPG.
Input image 1 is the character identity and costume reference. Input image 2 is the already approved DeepSeek sprite sheet: MATCH its chibi proportions, scale, chunky pixel resolution, outlines, limited-palette shading, camera angle and 2x2 layout, but draw the character in image 1 instead of DeepSeek.
Primary request: exactly FOUR full-body CHIBI PIXEL ART standing sprites of the SAME character. Strict 2 by 2 grid on real transparent alpha. TOP LEFT faces DOWN toward the viewer. TOP RIGHT faces UP away from viewer, back of head, no face. BOTTOM LEFT is true LEFT-facing profile. BOTTOM RIGHT is true RIGHT-facing profile.
Square canvas, ideally 1280x1280; 640x640 equal cells. Center sprites at x=320 within each cell, feet baseline y=600 within each cell. Entire character including all hair, ears, tails and wings must remain inside its own cell with generous clear padding. Identical scale and apparent height in each cell, about 2.5 heads tall.
Style: authentic 16-bit RPG pixel art with clearly visible square-pixel clusters, crisp dark outline, flat 3-tone shading, approximately 64x64 logical character enlarged by nearest neighbor. Simple readable design. No smooth anime painting, gradients, blur, antialiasing, textures, underfoot shadows, backgrounds, text, labels, grid lines or watermarks. Exactly four sprites and nothing else. Do not draw checkerboard, use true transparent alpha.

Subject and identity: GLM: very long black hair, large black fox ears with white inner fur, fluffy black fox tail with white tip, black-and-white long dress, blue diamond accents, sleepy eye mask resting on head, small black book held in front with ONE simple white Z mark. Preserve fox ears and visible bushy tail in all relevant views. No whale tail, no wings.
```

## qwen

参考：`qwen/portraits/default.png`、`deepseek/sprites/idle-directions.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction standing sprite sheet for a top-down 2D pixel RPG.
Input image 1 is the character identity and costume reference. Input image 2 is the already approved DeepSeek sprite sheet: MATCH its chibi proportions, scale, chunky pixel resolution, outlines, limited-palette shading, camera angle and 2x2 layout, but draw the character in image 1 instead of DeepSeek.
Primary request: exactly FOUR full-body CHIBI PIXEL ART standing sprites of the SAME character. Strict 2 by 2 grid on real transparent alpha. TOP LEFT faces DOWN toward the viewer. TOP RIGHT faces UP away from viewer, back of head, no face. BOTTOM LEFT is true LEFT-facing profile. BOTTOM RIGHT is true RIGHT-facing profile.
Square canvas, ideally 1280x1280; 640x640 equal cells. Center sprites at x=320 within each cell, feet baseline y=600 within each cell. Entire character including all hair, ears, tails and wings must remain inside its own cell with generous clear padding. Identical scale and apparent height in each cell, about 2.5 heads tall.
Style: authentic 16-bit RPG pixel art with clearly visible square-pixel clusters, crisp dark outline, flat 3-tone shading, approximately 64x64 logical character enlarged by nearest neighbor. Simple readable design. No smooth anime painting, gradients, blur, antialiasing, textures, underfoot shadows, backgrounds, text, labels, grid lines or watermarks. Exactly four sprites and nothing else. Do not draw checkerboard, use true transparent alpha.

Subject and identity: Qwen: periwinkle/lavender blue long hair with small braid, blue and white Chinese-inspired long dress and draped dark indigo sleeves, restrained gold edging, small tilted blue hat and tassel, purple eyes, a small folded fan held in hand. Simplify detailed patterns into a few clear pixels. No animal ears, no wings, no tail.
```

## gemini

参考：`gemini/portraits/default.png`、`deepseek/sprites/idle-directions.png`

```text
Use case: stylized-concept.
Asset type: transparent four-direction standing sprite sheet for a top-down 2D pixel RPG.
Input image 1 is the character identity and costume reference. Input image 2 is the already approved DeepSeek sprite sheet: MATCH its chibi proportions, scale, chunky pixel resolution, outlines, limited-palette shading, camera angle and 2x2 layout, but draw the character in image 1 instead of DeepSeek.
Primary request: exactly FOUR full-body CHIBI PIXEL ART standing sprites of the SAME character. Strict 2 by 2 grid on real transparent alpha. TOP LEFT faces DOWN toward the viewer. TOP RIGHT faces UP away from viewer, back of head, no face. BOTTOM LEFT is true LEFT-facing profile. BOTTOM RIGHT is true RIGHT-facing profile.
Square canvas, ideally 1280x1280; 640x640 equal cells. Center sprites at x=320 within each cell, feet baseline y=600 within each cell. Entire character including all hair, ears, tails and wings must remain inside its own cell with generous clear padding. Identical scale and apparent height in each cell, about 2.5 heads tall.
Style: authentic 16-bit RPG pixel art with clearly visible square-pixel clusters, crisp dark outline, flat 3-tone shading, approximately 64x64 logical character enlarged by nearest neighbor. Simple readable design. No smooth anime painting, gradients, blur, antialiasing, textures, underfoot shadows, backgrounds, text, labels, grid lines or watermarks. Exactly four sprites and nothing else. Do not draw checkerboard, use true transparent alpha.

Subject and identity: Gemini: blue to lavender long hair, TWO blue-violet cat ears with pink inner fur, fluffy lavender cat tail, bright four-pointed star hair ornament, mismatched eyes (one pink-red, one gold), indigo and violet outfit with white trim and tiny star accents, white boots. Short purple layered skirt as in portrait. Arms relaxed, no floating magical gems.
```
