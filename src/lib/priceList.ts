export type PriceItem = {
  category: string;
  product: string;
  content: string;
  price: number;
};

export const PRICE_LIST: PriceItem[] = [
  // 冷蔵庫
  { category: "冷蔵庫", product: "600L以上", content: "設置＋搬出", price: 24900 },
  { category: "冷蔵庫", product: "600L以上", content: "搬出のみ", price: 16800 },
  { category: "冷蔵庫", product: "500-599L", content: "設置＋搬出", price: 22100 },
  { category: "冷蔵庫", product: "500-599L", content: "搬出のみ", price: 13800 },
  { category: "冷蔵庫", product: "400-499L", content: "設置＋搬出", price: 19000 },
  { category: "冷蔵庫", product: "400-499L", content: "搬出のみ", price: 9300 },
  { category: "冷蔵庫", product: "300-399L", content: "設置＋搬出", price: 11800 },
  { category: "冷蔵庫", product: "300-399L", content: "搬出のみ", price: 5500 },
  { category: "冷蔵庫", product: "200-299L", content: "設置＋搬出", price: 10500 },
  { category: "冷蔵庫", product: "200-299L", content: "搬出のみ", price: 5000 },
  { category: "冷蔵庫", product: "100-199L", content: "設置＋搬出", price: 9000 },
  { category: "冷蔵庫", product: "100-199L", content: "搬出のみ", price: 3000 },
  { category: "冷凍庫", product: "100-199L", content: "設置＋搬出", price: 9000 },
  { category: "冷凍庫", product: "100-199L", content: "搬出のみ", price: 3000 },

  // 洗濯機
  { category: "洗濯機", product: "ドラム75kg以上", content: "設置＋搬出", price: 17000 },
  { category: "洗濯機", product: "ドラム75kg以上", content: "搬出のみ", price: 7800 },
  { category: "洗濯機", product: "ドラム75kg未満", content: "設置＋搬出", price: 15800 },
  { category: "洗濯機", product: "ドラム75kg未満", content: "搬出のみ", price: 6800 },
  { category: "洗濯機", product: "縦型7kg以上", content: "設置＋搬出", price: 10000 },
  { category: "洗濯機", product: "縦型7kg以上", content: "搬出のみ", price: 4000 },
  { category: "洗濯機", product: "縦型7kg未満", content: "設置＋搬出", price: 9100 },
  { category: "洗濯機", product: "縦型7kg未満", content: "搬出のみ", price: 4000 },

  // テレビ
  { category: "テレビ", product: "66-75型", content: "設置＋搬出", price: 30900 },
  { category: "テレビ", product: "66-75型", content: "搬出のみ", price: 12000 },
  { category: "テレビ", product: "51-65型", content: "設置＋搬出", price: 21500 },
  { category: "テレビ", product: "51-65型", content: "搬出のみ", price: 8000 },
  { category: "テレビ", product: "33-50型", content: "設置＋搬出", price: 16800 },
  { category: "テレビ", product: "33-50型", content: "搬出のみ", price: 6000 },
  { category: "テレビ", product: "32型以下", content: "設置＋搬出", price: 11300 },
  { category: "テレビ", product: "32型以下", content: "搬出のみ", price: 4000 },

  // 乾燥機
  { category: "乾燥機", product: "通常", content: "設置＋搬出", price: 10000 },
  { category: "乾燥機", product: "通常", content: "搬出のみ", price: 5000 },
  { category: "乾燥機", product: "大型", content: "設置＋搬出", price: 12000 },

  // オプション
  { category: "オプション", product: "搬出品配送費", content: "搬出のみ", price: 3000 },
  { category: "オプション", product: "搬出品配送費", content: "入替", price: 1500 },
  { category: "オプション", product: "重量物手当", content: "", price: 5500 },

  // 階段上げ
  { category: "階段上げ", product: "1F(0-5段)", content: "", price: 0 },
  { category: "階段上げ", product: "2F(6-15段)", content: "", price: 4400 },
  { category: "階段上げ", product: "3F(16-25段)", content: "", price: 8800 },
  { category: "階段上げ", product: "4F(26-35段)", content: "", price: 13200 },
  { category: "階段上げ", product: "5F(36-45段)", content: "", price: 17600 },
  { category: "階段上げ", product: "6F(46-55段)", content: "", price: 22000 },
  { category: "階段上げ", product: "7F(56-65段)", content: "", price: 26400 },
  { category: "階段上げ", product: "8F(66-75段)", content: "", price: 30800 },

  // 階段下ろし
  { category: "階段下ろし", product: "1F(0-5段)", content: "", price: 0 },
  { category: "階段下ろし", product: "2F(6-15段)", content: "", price: 2900 },
  { category: "階段下ろし", product: "3F(16-25段)", content: "", price: 5800 },
  { category: "階段下ろし", product: "4F(26-35段)", content: "", price: 8700 },
  { category: "階段下ろし", product: "5F(36-45段)", content: "", price: 11600 },
  { category: "階段下ろし", product: "6F(46-55段)", content: "", price: 14500 },
  { category: "階段下ろし", product: "7F(56-65段)", content: "", price: 17400 },
  { category: "階段下ろし", product: "8F(66-75段)", content: "", price: 20300 }
];

export const getPriceLabel = (item: PriceItem): string => {
  if (item.content) {
    return `${item.category} / ${item.product} / ${item.content}`;
  }
  return `${item.category} / ${item.product}`;
};

export const getGroupedPrices = (): Record<string, PriceItem[]> => {
  const grouped: Record<string, PriceItem[]> = {};
  PRICE_LIST.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });
  return grouped;
};
