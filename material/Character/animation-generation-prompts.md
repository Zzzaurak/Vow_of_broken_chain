# 动作与技能素材生成记录

日期：2026-11-04。使用内置 `image_gen`，参考上一批像素方向图，不覆盖站立图。下面是实际提交的提示词与图集布局；实际尺寸和动画播放定义记录于 `animation-manifest.json`。生成图为可切帧母版，接入时需统一脚底、比例和动作时机。大肥鱼施法首稿有灰色半透明背景，已用同一工具单独清理背景，项目仅保留清理后的选定版本。

## deepseek-walk

- 保存：`deepseek/sprites/walk.png`
- 网格：3 列 × 4 行。
- 参考：`deepseek/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.
DeepSeek, exactly the same blue-haired whale girl in the reference sprite sheet: long blue hair, turquoise eyes, navy-and-white maid dress, white frilled headband and apron with simple whale emblem, dark blue whale tail, navy shoes. Preserve her design, face, chibi proportions, pixel scale, outlines and palette.
Canvas portrait 3:4, ideally 1536x2048, EXACTLY 3 columns and 4 rows of equal grid cells, TWELVE full-body sprites total. Rows top to bottom MUST face DOWN (front), UP (back, no face), LEFT (profile), RIGHT (profile). Each row is one temporal animation, read LEFT to RIGHT. Within every row keep body centered and the same foot baseline. Show actual shoes and ankle movement below a slightly shortened simplified maid skirt, while keeping costume identity.
Action: walking loop. Column 1 neutral passing pose, feet together; column 2 LEFT leg steps forward and RIGHT leg backward, arms counter-swing; column 3 RIGHT leg steps forward and LEFT leg backward, arms counter-swing reversed. Make the alternating foot placements clearly visible in all four rows, including back and side views. Hair hem and whale tail sway a LITTLE, head shape stays stable. No attack, magic, trails or effects.
```

## deepseek-melee

- 保存：`deepseek/sprites/melee-tail.png`
- 网格：3 列 × 4 行。
- 参考：`deepseek/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.
DeepSeek, exactly the same blue-haired whale girl in the reference sprite sheet: long blue hair, turquoise eyes, navy-and-white maid dress, white frilled headband and apron with simple whale emblem, dark blue whale tail, navy shoes. Preserve her design, face, chibi proportions, pixel scale, outlines and palette.
Canvas portrait 3:4, ideally 1536x2048, EXACTLY 3 columns and 4 rows of equal grid cells, TWELVE full-body sprites total. Rows top to bottom MUST face DOWN (front), UP (back, no face), LEFT (profile), RIGHT (profile). Each row is one temporal animation, read LEFT to RIGHT. Within every row keep body centered and the same foot baseline. Show actual shoes and ankle movement below a slightly shortened simplified maid skirt, while keeping costume identity.
Action: WHALE TAIL SWEEP melee attack, no sword or other weapon. Column 1 anticipation: bend knees and twist torso, coil her attached whale tail behind her; column 2 impact: twist forward and sweep the attached thick whale tail across the front in the facing direction, clearly visible flukes, a small crisp pale-blue crescent tracing the sweep; column 3 follow-through: tail past the target, torso returns and arms balance. Three genuinely different poses per direction. Tail is attached to her body and remains a whale tail, NOT a separate animal. Direction of the impact arc follows that ROW's facing. Do not turn all rows into front-facing poses.
```

## deepseek-cast

- 保存：`deepseek/sprites/cast-water.png`
- 网格：3 列 × 4 行。
- 参考：`deepseek/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.
DeepSeek, exactly the same blue-haired whale girl in the reference sprite sheet: long blue hair, turquoise eyes, navy-and-white maid dress, white frilled headband and apron with simple whale emblem, dark blue whale tail, navy shoes. Preserve her design, face, chibi proportions, pixel scale, outlines and palette.
Canvas portrait 3:4, ideally 1536x2048, EXACTLY 3 columns and 4 rows of equal grid cells, TWELVE full-body sprites total. Rows top to bottom MUST face DOWN (front), UP (back, no face), LEFT (profile), RIGHT (profile). Each row is one temporal animation, read LEFT to RIGHT. Within every row keep body centered and the same foot baseline. Show actual shoes and ankle movement below a slightly shortened simplified maid skirt, while keeping costume identity.
Action: cast her ranged waterball spell. Column 1 gather power with one hand near torso; column 2 extend hand toward the row's facing direction and release, clear changed arm position; column 3 recover with relaxed arm. ONLY tiny cyan motes near hand; do not draw a flying projectile or large explosion on this actor sheet, those are separate assets. Up row genuinely faces away with her arm extended away, left and right rows are true profiles.
```

## deepseek-water-fx

- 保存：`deepseek/effects/water.png`
- 网格：4 列 × 2 行。
- 参考：`deepseek/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Reference is for pixel size, outline and water-blue palette ONLY. No character or human body anywhere. Landscape canvas 2:1, EXACTLY FOUR columns and TWO rows, EIGHT equally sized cells. TOP ROW: four successive animation phases of a small bright cyan WATERBALL projectile pointing RIGHT, round pale core, darker blue outline, tiny trailing droplets to left; same center and size, slight changing liquid shape. BOTTOM ROW: four successive WATER SPLASH IMPACT phases, centered in each cell: compact water burst -> expanding splash crown -> wide scattering droplets -> a few small fading droplets. The impact must be a water splash, no fire, ice or smoke. Clearly visible cyan/blue/white square pixels, opaque colored cores, real transparent outside. All effects centered within their cells with large clear gutters. No arrows, text, circles drawn as boundaries, targets, floor or background.
```

## glm-forbidden-bind-cast

- 保存：`glm/sprites/cast-forbidden-bind.png`
- 网格：2 列 × 2 行。
- 参考：`glm/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Subject: GLM, black long hair, black fox ears, black bushy fox tail with white tip, black/white dress with blue diamond accents, eye mask on head, black Z-marked book.
Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Action: She opens her black book and extends one hand to cast Forbidden Bind. Frame 1 book closed near chest; frame 2 book opens, eyes focused; frame 3 arm extended, book raised, just a few cyan rune pixels near book; frame 4 lowers hand and closes book. Keep body in place, front-facing, show four distinct hand/book poses. NO large area spell or bound enemy; that is a separate effect sheet.
```

## glm-forbidden-bind-fx

- 保存：`glm/effects/forbidden-bind.png`
- 网格：2 列 × 2 行。
- 参考：`glm/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Reference is for PIXEL STYLE AND COLOR FAMILY ONLY, do not draw any character, humanoid, face or body. Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Subject: Forbidden Bind area effect: cyan and dark blue geometric magical book-page ribbons forming a binding cage over a small elliptical ground rune. Frame 1 a compact dotted oval and two rune fragments; frame 2 angular blue paper strips rise as side loops; frame 3 full clear diamond-lattice paper-ribbon binding cage, hollow center where an enemy can be overlaid; frame 4 strips break into a few small square page particles and fade. No readable letters or typography. All effects share the same center and ground-anchor position inside their cells. A standalone transparent VFX sheet only, chunky pixel clusters, limited color palette, no blurry glow outside the shapes.
```

## gpt-starfall-cast

- 保存：`gpt/sprites/cast-starfall.png`
- 网格：2 列 × 2 行。
- 参考：`gpt/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Subject: GPT, long white hair, two ivory curved dragon horns, purple eyes, white dress with silver knot ornaments, folded white-lavender dragon wings and pale dragon tail.
Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Action: She invokes Starfall. Frame 1 hands near chest; frame 2 one arm raised upward and wings slightly open; frame 3 both arms gesture forward/up, head raised, a few tiny lavender stars near fingers; frame 4 arms relax and wings fold. Same front-facing character at same foot anchor in every frame. NO large starfall beam or area impact; that is a separate effect sheet.
```

## gpt-starfall-fx

- 保存：`gpt/effects/starfall.png`
- 网格：2 列 × 2 行。
- 参考：`gpt/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Reference is for PIXEL STYLE AND COLOR FAMILY ONLY, do not draw any character, humanoid, face or body. Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Subject: Starfall area effect: pale lavender, violet and white four-point star magic crashing into a small ellipse on the ground. Frame 1 a sparse pale-violet elliptical target glimmer and a small four-point star above; frame 2 three downward star streaks above that same center; frame 3 bright central four-point starburst with sharp pixel shards across a small ground ring; frame 4 separated fading star sparkles. No crater, floor or environment. All effects share the same center and ground-anchor position inside their cells. A standalone transparent VFX sheet only, chunky pixel clusters, limited color palette, no blurry glow outside the shapes.
```

## claude-sunflower-barrier-cast

- 保存：`claude/sprites/cast-sunflower-barrier.png`
- 网格：2 列 × 2 行。
- 参考：`claude/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Subject: Claude, very long orange hair, orange sunflower hair ornament with black bow, amber eyes, white/black/orange ceremonial dress with gold trim, small brown sunflower prayer book.
Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Action: She invokes Sunflower Barrier. Frame 1 prayer book held near chest; frame 2 opens book and lifts free hand; frame 3 extends free palm in a protective gesture with a few small gold petal pixels; frame 4 returns book to chest and lowers hand. Same front-facing character and foot anchor in all four frames. NO full dome or large barrier surrounding her, that is a separate reusable effect sheet.
```

## claude-sunflower-barrier-fx

- 保存：`claude/effects/sunflower-barrier.png`
- 网格：2 列 × 2 行。
- 参考：`claude/sprites/idle-directions.png`。

```text
Use case: stylized-concept. Asset type: actual animation sprite sheet for a top-down pixel-art RPG, not a concept poster.
Use the supplied sprite as identity and pixel-style reference only. True transparent alpha background, no environment. Chunky 16-bit pixel art, dark crisp stepped outline, limited colors and flat 3-tone shading; no smooth anime rendering, no motion blur, no soft shadows, no grid, labels, text or watermark.
Every frame must be a separate full-body figure entirely INSIDE its OWN grid cell, generous transparent gutters, equal scale, consistent ground baseline and consistent foot anchor. No overlap across cells. These are TEMPORAL ANIMATION frames with genuinely different poses, not copies of one standing image.

Reference is for PIXEL STYLE AND COLOR FAMILY ONLY, do not draw any character, humanoid, face or body. Square canvas, EXACTLY 2 columns by 2 rows, FOUR chronological frames read TOP LEFT, TOP RIGHT, BOTTOM LEFT, BOTTOM RIGHT. Same scale and position in all four cells; fit entire pose within each cell with padding. Front/down-facing cast direction only; do NOT make a directional turnaround.
Subject: Sunflower Barrier effect: golden amber and warm ivory protective dome with a sunflower-petal rim. Frame 1 a small golden elliptical rune and a few rising petals; frame 2 a hollow dome outline rises from the ellipse; frame 3 complete luminous golden dome with clear EMPTY TRANSPARENT interior for a player sprite, segmented sunflower-petal crown, subtle tiny shield sparkles; frame 4 dome opens into a few detached golden petals fading outward. Keep outline readable, don't fill the interior with an opaque color. No person, book, ground, background or letters. All effects share the same center and ground-anchor position inside their cells. A standalone transparent VFX sheet only, chunky pixel clusters, limited color palette, no blurry glow outside the shapes.
```

## deepseek-cast 背景清理

参考：施法首稿作为编辑目标，保持 3 列×4 行的十二帧。

```text
Use case: background-extraction.
Edit target: image 1, the 3-column by 4-row DeepSeek water-casting animation sheet.
Remove the entire grey smoky background and all grey underfoot shadows from every cell and from all gutters, leaving genuine perfectly clear alpha=0 outside the character and small cyan magic motes. Keep the twelve character drawings, their colors and sharp dark pixel edges, their positions and the EXACT 3-column 4-row grid, image aspect ratio and size unchanged. Restore the actual foreground character pixels to fully opaque; do not leave the full sheet translucent.
Do not generate a new backdrop, checkerboard, white matte, noise or glow. Do not redraw costume, face, whale tail, pose order or layout. It is a 4-direction animation sprite sheet for a game, not a poster. Final image must have no background at all, full transparency in the four canvas corners and the gutters between sprites. Preserve all twelve full-body sprites and tiny cyan motes.
```

## deepseek-walk 交替迈步修订

首稿第三列与第二列步态过于相似，使用同一工具调整第三列腿部与手臂，项目只保留修订版。

```text
Use case: precise-object-edit. Image 1 is the existing DeepSeek WALKING animation sheet, 3 columns x 4 rows, not a portrait. It needs one targeted correction.
Keep every sprite in COLUMN 1 (neutral passing) and COLUMN 2 (step A) unchanged. REDRAW ONLY THE LEGS AND ARMS IN COLUMN 3 so it is clearly the OPPOSITE STEP to column 2. Do not simply copy column 2.
TOP ROW faces front/down: column 2 has the shoe on the viewer's RIGHT lower/forward. In column 3 make the shoe on the viewer's LEFT lower/forward instead, the other shoe pulled up/back, and swap which arm swings forward. There MUST visibly be alternating left and right lower shoes between the two steps.
SECOND ROW back/up: likewise alternate the two feet with column 3 opposite to column 2. Both shoes must be readable.
LEFT and RIGHT PROFILE ROWS: third column must show a visibly different knee bend and opposing arm swing to second column, one leg passing under body and the other stepping away. Do not turn any profile sprite frontward.
Preserve head/hair/face, navy maid costume, white apron, whale tail, chibi pixel scale, all cell positions and original 3:4 canvas ratio. Keep twelve full-body sprites, 3 columns and 4 rows, chronological columns neutral / step A / opposite step B. All feet remain inside their own cells. Remove any grey underfoot shadow while preserving shoes. Genuine alpha=0 transparent empty backdrop and gutters, no matte, no background, no grid, text or labels. Sharp limited-palette square pixel art.
```

## 检查记录

- 共选定 10 张新增图集、68 个动作／特效帧；逐张查看朝向、动作阶段与角色辨识特征。
- 大肥鱼行走第三列已修订为与第二列不同的交替迈步；施法图的灰色背景已清理。
- 所有图集包含透明通道，主要前景完整处于各帧矩形内；半透明特效保留边缘透明度。
- 已检查实际尺寸、逐帧矩形、播放序列、时间与一次性动作事件索引；既有八张原立绘未改动。
- 本地 Chrome 加载 animation-preview.html，十张图集均可显示并播放，已查看整页截图；未进行游戏引擎内验证，正式接入时仍需校准比例、脚底和命中时机。
