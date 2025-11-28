
export interface FinancialItem {
  name: string;
  amount: number;
  previousAmount?: number; // สำหรับคำนวณ Variance
  percentageChange?: number; // % การเปลี่ยนแปลง
  type: 'revenue' | 'expense' | 'asset' | 'liability';
  unit: string; // เช่น 'Overall', 'Electricity', 'BusA'
  insight: string; // คำอธิบายสั้นๆ
  riskLevel?: 'High' | 'Medium' | 'Low';
}

export interface KeyRatio {
  name: string;
  value: number | string;
  unit: string; // หน่วยของค่า (%, เท่า, บาท)
  evaluation: 'Good' | 'Fair' | 'Poor';
  description: string;
}

export interface FutureTrend {
  topic: string;
  prediction: string;
  impact: 'Positive' | 'Negative' | 'Neutral';
}

export interface LiquidityAnalysis {
  currentRatio: number;
  quickRatio: number;
  status: 'Healthy' | 'Caution' | 'Critical';
  statusLabel: string;
  description: string;
}

export interface AnalysisResult {
  liquidity: LiquidityAnalysis;
  financialItems: FinancialItem[]; // รวมรายการทั้งหมด
  keyRatios: KeyRatio[];
  futureTrends: FutureTrend[];
  summary: string; // Executive Summary
  detailedReport: string; // เนื้อหาบทวิเคราะห์แบบยาว (Markdown)
  recommendations: string[];
}

export type ViewMode = 'dashboard' | 'report';
export type ChartType = 'bar' | 'pie' | 'line';
export type UnitFilter = 'All' | 'Electricity' | 'BusA' | 'กฟส.' | 'H' | string;
