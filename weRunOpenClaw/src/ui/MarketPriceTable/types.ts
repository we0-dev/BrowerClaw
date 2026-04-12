export interface MarketPriceRow {
  name: string;
  price: string;
  change: string;
  up?: boolean;
}

export interface MarketPriceTableProps {
  title?: string;
  rows?: MarketPriceRow[];
  className?: string;
}
