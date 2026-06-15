export const SAMPLE_DATA = {
  period: "01 May – 29 May 2026",
  bank: "ICICI Credit Card",
  account_holder: "Diganta Sarma",
  opening_balance: 0,
  closing_balance: 0,
  total_credits: 20447.45,
  total_reward_points: 208,
  transactions: [
    { date: "2026-05-12", desc: "Amazon Pay IN E COMMERC Bangalore", amount: 2089.00, cat: "Shopping", reward_points: -104 },
    { date: "2026-05-12", desc: "Amazon Pay IN GROCERY Bangalore", amount: 73.00, cat: "Groceries", reward_points: 3 },
    { date: "2026-05-13", desc: "EBZ*THEDERMA CO Gurgaon", amount: 1548.00, cat: "Healthcare", reward_points: 15 },
    { date: "2026-05-16", desc: "Swiggy Limited Bangalore", amount: 35.00, cat: "Food & Dining", reward_points: 0 },
    { date: "2026-05-17", desc: "Swiggy Limited Bangalore", amount: 184.00, cat: "Food & Dining", reward_points: 1 },
    { date: "2026-05-19", desc: "ZOMATO LIMITED Gurugram", amount: 247.23, cat: "Food & Dining", reward_points: 2 },
    { date: "2026-05-20", desc: "ZOMATO LIMITED Gurugram", amount: 341.53, cat: "Food & Dining", reward_points: 3 },
    { date: "2026-05-20", desc: "RAZ*Swiggy Bangalore KA", amount: 236.00, cat: "Food & Dining", reward_points: 2 },
    { date: "2026-05-21", desc: "JIO Mumbai", amount: 470.82, cat: "Bills & Subscriptions", reward_points: 0 },
    { date: "2026-05-23", desc: "ZOMATO LIMITED Gurugram", amount: 161.43, cat: "Food & Dining", reward_points: 1 },
    { date: "2026-05-24", desc: "Amazon Pay IN E COMMERC Bangalore", amount: 5347.02, cat: "Shopping", reward_points: 267 },
    { date: "2026-05-24", desc: "ZOMATO GURGAON", amount: 301.99, cat: "Food & Dining", reward_points: 3 },
    { date: "2026-05-26", desc: "ZOMATO NEW DELHI", amount: 220.08, cat: "Food & Dining", reward_points: 2 },
    { date: "2026-05-29", desc: "Amazon Pay IN E COMMERC Bangalore", amount: 266.16, cat: "Shopping", reward_points: 13 },
  ],
  insights: [
    {
      icon: "🛍️",
      title: "Amazon dominates your spending",
      body: "You spent ₹7,702.18 on Amazon across 3 transactions. The ₹5,347 purchase earned you a whopping 267 reward points — your biggest single points haul.",
      color: "#f472b6",
      badge: "High"
    },
    {
      icon: "🥘",
      title: "Food delivery is a major category",
      body: "Swiggy and Zomato together account for ₹1,726.26 across 8 orders. Zomato alone is ₹1,272.26 with 5 separate orders this month.",
      color: "#f87171",
      badge: "Pattern"
    },
    {
      icon: "🏥",
      title: "Healthcare purchase noted",
      body: "₹1,548.00 spent at THEDERMA CO — likely skincare/dermatology. This earned 15 reward points.",
      color: "#2dd4bf",
      badge: "Review"
    },
    {
      icon: "📱",
      title: "JIO recharge: zero points",
      body: "Your ₹470.82 JIO payment earned 0 reward points. Bill payments and recharges typically don't earn points on most credit cards.",
      color: "#fb923c",
      badge: "Low"
    },
    {
      icon: "⭐",
      title: "Reward points are Amazon-heavy",
      body: "Out of ~346 total points, Amazon transactions alone contributed ~176 points (net). Online shopping gives the best return on your card.",
      color: "#fbbf24",
      badge: "Pattern"
    },
    {
      icon: "🍕",
      title: "Small Swiggy orders earn nothing",
      body: "Your ₹35 Swiggy order earned 0 points while the ₹184 one earned only 1 point. Small food orders have very poor reward yield.",
      color: "#94a3b8",
      badge: "Low"
    }
  ],
};
