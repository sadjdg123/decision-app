export const STORAGE_KEY = "decision-party-app-pro-v5";
export const SPIN_DURATION = 3600;
export const SLOT_INTERVAL = 90;
export const DICE_INTERVAL = 80;
export const MAX_HISTORY = 50;
export const MAX_WEIGHT = 20;

export const defaultData = {
  foodTemplates: {
    常用快餐: [
      { name: "麦当劳", weight: 2 },
      { name: "肯德基", weight: 1 },
      { name: "必胜客", weight: 1 },
      { name: "汉堡王", weight: 1 },
      { name: "达美乐", weight: 1 },
      { name: "赛百味", weight: 1 }
    ],
    日常外卖: [
      { name: "麻辣烫", weight: 2 },
      { name: "黄焖鸡", weight: 1 },
      { name: "螺蛳粉", weight: 1 },
      { name: "寿司", weight: 1 },
      { name: "拉面", weight: 1 },
      { name: "烤肉饭", weight: 1 }
    ]
  },
  peopleTemplates: {
    默认好友: [
      { name: "张三", weight: 1 },
      { name: "李四", weight: 1 },
      { name: "王五", weight: 1 },
      { name: "赵六", weight: 1 }
    ]
  },
  history: []
};

export const tabs = [
  { id: "food", label: "吃什么", icon: "🍽️" },
  { id: "payer", label: "谁请客", icon: "👥" },
  { id: "coin", label: "抛硬币", icon: "🪙" },
  { id: "dice", label: "掷骰子", icon: "🎲" }
];
