/**
 * Check if market is open (XAUUSD 24/5 market: Sunday 5pm EST to Friday 5pm EST)
 * @returns true if market is open, false otherwise
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getUTCHours();
  
  // XAUUSD market hours: Sunday 21:00 UTC to Friday 21:00 UTC (5pm EST)
  // Closed: Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 5 && hours >= 21) return false; // Friday after 9pm UTC
  if (day === 6) return false; // Saturday
  if (day === 0 && hours < 21) return false; // Sunday before 9pm UTC
  
  return true;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * @param data - Array of numerical values
 * @param period - EMA period
 * @returns EMA value
 */
export function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const k = 2 / (period + 1);
  
  // Initialize EMA with SMA of first period data points
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

/**
 * Calculate Simple Moving Average (SMA)
 * @param data - Array of numerical values
 * @param period - SMA period
 * @returns SMA value
 */
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const sum = data.slice(0, period).reduce((acc, val) => acc + val, 0);
  return sum / period;
}

/**
 * Format number to specified decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places
 * @returns Formatted string
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

/**
 * Format timestamp to readable date string
 * @param timestamp - ISO timestamp string or number
 * @returns Formatted date string
 */
export function formatTimestamp(timestamp: string | number): string {
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp * 1000) 
    : new Date(timestamp);
  
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate percentage change
 * @param oldValue - Original value
 * @param newValue - New value
 * @returns Percentage change
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Get color class based on trend direction
 * @param direction - Trend direction
 * @returns Tailwind color class
 */
export function getTrendColor(direction: 'bullish' | 'bearish' | 'neutral' | 'Bullish' | 'Bearish' | 'Neutral'): string {
  const lowerDirection = direction.toLowerCase() as 'bullish' | 'bearish' | 'neutral';
  switch (lowerDirection) {
    case 'bullish': return 'text-green-500';
    case 'bearish': return 'text-red-500';
    default: return 'text-gray-400';
  }
}

/**
 * Get background color class based on trend direction
 * @param direction - Trend direction
 * @returns Tailwind background color class
 */
export function getTrendBg(direction: 'bullish' | 'bearish' | 'neutral' | 'Bullish' | 'Bearish' | 'Neutral'): string {
  const lowerDirection = direction.toLowerCase() as 'bullish' | 'bearish' | 'neutral';
  switch (lowerDirection) {
    case 'bullish': return 'bg-green-500/20';
    case 'bearish': return 'bg-red-500/20';
    default: return 'bg-gray-500/20';
  }
}

/**
 * Delay function for async operations
 * @param ms - Milliseconds to delay
 * @returns Promise that resolves after delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function to limit function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
