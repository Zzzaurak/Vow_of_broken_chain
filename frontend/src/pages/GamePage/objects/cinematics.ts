export const cinematics = {
  separation: {
    duration: 6,
    title: '长阶之别',
    captions: ['圣光屏障从天而降，将两人隔开。', '大肥鱼被震退，向日葵花瓣落在雨中的长阶。'],
  },
  voyage: {
    duration: 7,
    title: '横渡风暴',
    captions: ['GLM 展开暗流海图，带领小船穿过迷雾。', '风暴渐远，西方大陆的海岸浮现在晨光中。'],
  },
  trialFall: {
    duration: 5,
    title: '古龙的认可',
    captions: [
      '龙鳞护盾碎裂，最后一击触及古龙。试炼已经通过。',
      '大肥鱼力竭倒在雪中，依然望向王座。',
    ],
  },
  healing: {
    duration: 7,
    title: '重逾群星的诺言',
    captions: ['GPT 收起龙威，以温暖的星光治愈伤口。', '休整一夜。破晓时，伙伴们再次出发。'],
  },
  breach: {
    duration: 6,
    title: '断链破晓',
    captions: ['群星回应古龙的呼唤，光芒落向圣都。', '金色穹顶轰然碎裂，通向内庭的道路终于打开。'],
  },
  reunion: {
    duration: 5,
    title: '心防崩塌',
    captions: [
      '向日葵结界散成花瓣。大肥鱼收起攻击，走向 Claude。',
      '这一次，隔在两人之间的光墙消失了。',
    ],
  },
  escape: {
    duration: 8,
    title: '离开倒塌的牢笼',
    captions: [
      '教皇倒下，圣殿开始崩塌。伙伴们奔向破开的天光。',
      'GPT 展开龙翼，带着大家飞离落石与尘埃。',
    ],
  },
} as const;
export type CinematicId = keyof typeof cinematics;
export type CinematicContinuation =
  | { kind: 'victoryDialogue'; scene: string }
  | { kind: 'clear' }
  | { kind: 'ready' }
  | { kind: 'travel'; destination: string };
