import { NextRequest, NextResponse } from 'next/server';

// TradeRecommender class
class TradeRecommender {
  calculateRSI(data: number[], period: number = 14): number {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateATR(data: any[], period: number = 14): number {
    if (data.length < period + 1) return 0;
    
    let trSum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trSum += tr;
    }
    
    return trSum / period;
  }

  calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1] || 0;
    
    const k = 2 / (period + 1);
    let ema = data[0];
    
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  findSupportResistance(data: any[], period: number = 20): { support: number; resistance: number } {
    const recent = data.slice(-period);
    const lows = recent.map((d: any) => d.low);
    const highs = recent.map((d: any) => d.high);
    
    const support = Math.min(...lows);
    const resistance = Math.max(...highs);
    
    return { support, resistance };
  }

  calculatePivotPoints(data: any[]): { pivot: number; r1: number; r2: number; s1: number; s2: number } {
    const last = data[data.length - 1];
    const high = last.high;
    const low = last.low;
    const close = last.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const r2 = pivot + (high - low);
    const s1 = (2 * pivot) - high;
    const s2 = pivot - (high - low);
    
    return { pivot, r1, r2, s1, s2 };
  }

  analyzeMarketStructure(data: any[], period: number = 20): { trend: string; strength: number } {
    if (data.length < 5) return { trend: 'NEUTRAL', strength: 0 };
    
    const recent = data.slice(-period);
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].high > recent[i - 1].high) higherHighs++;
      else lowerHighs++;
      
      if (recent[i].low > recent[i - 1].low) higherLows++;
      else lowerLows++;
    }
    
    const bullishScore = higherHighs + higherLows;
    const bearishScore = lowerHighs + lowerLows;
    
    if (bullishScore > bearishScore * 1.5) return { trend: 'STRONG_BULLISH', strength: bullishScore / (recent.length - 1) };
    if (bearishScore > bullishScore * 1.5) return { trend: 'STRONG_BEARISH', strength: bearishScore / (recent.length - 1) };
    if (bullishScore > bearishScore) return { trend: 'BULLISH', strength: bullishScore / (recent.length - 1) };
    if (bearishScore > bullishScore) return { trend: 'BEARISH', strength: bearishScore / (recent.length - 1) };
    
    return { trend: 'NEUTRAL', strength: 0.5 };
  }

  getTimeframeParameters(timeframe: string) {
    const params: any = {
      '1': { rsiPeriod: 7, atrPeriod: 7, supportResistancePeriod: 10, structurePeriod: 10, emaShort: 5, emaMedium: 13, emaLong: 21, rsiOversold: 25, rsiOverbought: 75, supportThreshold: 0.3, resistanceThreshold: 0.3, pivotThreshold: 0.2, stopLossMultiplier: 1.0, takeProfitMultiplier: 1.5, minRiskReward: 1.2 },
      '5': { rsiPeriod: 10, atrPeriod: 10, supportResistancePeriod: 15, structurePeriod: 15, emaShort: 7, emaMedium: 17, emaLong: 34, rsiOversold: 28, rsiOverbought: 72, supportThreshold: 0.4, resistanceThreshold: 0.4, pivotThreshold: 0.25, stopLossMultiplier: 1.2, takeProfitMultiplier: 2.0, minRiskReward: 1.3 },
      '15': { rsiPeriod: 14, atrPeriod: 14, supportResistancePeriod: 20, structurePeriod: 20, emaShort: 9, emaMedium: 21, emaLong: 50, rsiOversold: 30, rsiOverbought: 70, supportThreshold: 0.5, resistanceThreshold: 0.5, pivotThreshold: 0.3, stopLossMultiplier: 1.5, takeProfitMultiplier: 2.5, minRiskReward: 1.5 },
      '60': { rsiPeriod: 14, atrPeriod: 14, supportResistancePeriod: 25, structurePeriod: 25, emaShort: 12, emaMedium: 26, emaLong: 55, rsiOversold: 32, rsiOverbought: 68, supportThreshold: 0.6, resistanceThreshold: 0.6, pivotThreshold: 0.35, stopLossMultiplier: 1.8, takeProfitMultiplier: 3.0, minRiskReward: 1.6 },
      '240': { rsiPeriod: 14, atrPeriod: 20, supportResistancePeriod: 30, structurePeriod: 30, emaShort: 15, emaMedium: 30, emaLong: 60, rsiOversold: 35, rsiOverbought: 65, supportThreshold: 0.7, resistanceThreshold: 0.7, pivotThreshold: 0.4, stopLossMultiplier: 2.0, takeProfitMultiplier: 3.5, minRiskReward: 1.7 },
      'D': { rsiPeriod: 14, atrPeriod: 20, supportResistancePeriod: 40, structurePeriod: 40, emaShort: 20, emaMedium: 50, emaLong: 100, rsiOversold: 40, rsiOverbought: 60, supportThreshold: 0.8, resistanceThreshold: 0.8, pivotThreshold: 0.5, stopLossMultiplier: 2.5, takeProfitMultiplier: 4.0, minRiskReward: 1.8 }
    };
    
    return params[timeframe] || params['15'];
  }

  generateTradeRecommendation(symbol: string, marketData: any[], timeframe: string = '15') {
    if (marketData.length < 30) {
      return {
        symbol,
        recommendation: 'HOLD',
        confidence: 0,
        reason: 'Insufficient data for analysis',
        entryPrice: null,
        stopLoss: null,
        takeProfit: null,
        orderType: 'NONE',
        riskRewardRatio: 0
      };
    }

    const timeframeParams = this.getTimeframeParameters(timeframe);
    const currentPrice = marketData[marketData.length - 1].close;
    const closes = marketData.map((d: any) => d.close);
    
    const rsi = this.calculateRSI(closes, timeframeParams.rsiPeriod);
    const atr = this.calculateATR(marketData, timeframeParams.atrPeriod);
    const { support, resistance } = this.findSupportResistance(marketData, timeframeParams.supportResistancePeriod);
    const { pivot, r1, r2, s1, s2 } = this.calculatePivotPoints(marketData);
    const marketStructure = this.analyzeMarketStructure(marketData, timeframeParams.structurePeriod);
    
    const emaShort = this.calculateEMA(closes, timeframeParams.emaShort);
    const emaMedium = this.calculateEMA(closes, timeframeParams.emaMedium);
    const emaLong = this.calculateEMA(closes, timeframeParams.emaLong);
    
    const isOversold = rsi < timeframeParams.rsiOversold;
    const isOverbought = rsi > timeframeParams.rsiOverbought;
    const nearSupport = Math.abs(currentPrice - support) < (atr * timeframeParams.supportThreshold);
    const nearResistance = Math.abs(currentPrice - resistance) < (atr * timeframeParams.resistanceThreshold);
    const nearPivot = Math.abs(currentPrice - pivot) < (atr * timeframeParams.pivotThreshold);
    const nearS1 = Math.abs(currentPrice - s1) < (atr * timeframeParams.supportThreshold);
    const nearR1 = Math.abs(currentPrice - r1) < (atr * timeframeParams.resistanceThreshold);
    
    let recommendation = 'HOLD';
    let orderType = 'NONE';
    let entryPrice = currentPrice;
    let stopLoss: number | null = null;
    let takeProfit: number | null = null;
    let confidence = 0;
    let reason = '';
    
    if (marketStructure.trend.includes('BULLISH') && (isOversold || nearSupport || nearS1)) {
      recommendation = 'BUY';
      confidence = Math.min(90, 60 + (marketStructure.strength * 20) + (isOversold ? 15 : 0));
      
      if (nearSupport && currentPrice > support) {
        orderType = 'BUY_LIMIT';
        entryPrice = support + (atr * 0.2);
        reason = `Price near support level in bullish trend (${timeframe} timeframe) - good buy limit opportunity`;
      } else if (isOversold && marketStructure.trend === 'STRONG_BULLISH') {
        orderType = 'BUY_STOP';
        entryPrice = currentPrice + (atr * 0.5);
        reason = `Oversold in strong bullish trend (${timeframe} timeframe) - buy stop on momentum confirmation`;
      } else {
        orderType = 'MARKET';
        reason = `Bullish trend with favorable conditions (${timeframe} timeframe) - immediate market entry`;
      }
      
      stopLoss = entryPrice - (atr * timeframeParams.stopLossMultiplier);
      takeProfit = entryPrice + (atr * timeframeParams.takeProfitMultiplier);
    } else if (marketStructure.trend.includes('BEARISH') && (isOverbought || nearResistance || nearR1)) {
      recommendation = 'SELL';
      confidence = Math.min(90, 60 + (marketStructure.strength * 20) + (isOverbought ? 15 : 0));
      
      if (nearResistance && currentPrice < resistance) {
        orderType = 'SELL_LIMIT';
        entryPrice = resistance - (atr * 0.2);
        reason = `Price near resistance level in bearish trend (${timeframe} timeframe) - good sell limit opportunity`;
      } else if (isOverbought && marketStructure.trend === 'STRONG_BEARISH') {
        orderType = 'SELL_STOP';
        entryPrice = currentPrice - (atr * 0.5);
        reason = `Overbought in strong bearish trend (${timeframe} timeframe) - sell stop on momentum confirmation`;
      } else {
        orderType = 'MARKET';
        reason = `Bearish trend with favorable conditions (${timeframe} timeframe) - immediate market entry`;
      }
      
      stopLoss = entryPrice + (atr * timeframeParams.stopLossMultiplier);
      takeProfit = entryPrice - (atr * timeframeParams.takeProfitMultiplier);
    } else if (nearPivot && Math.abs(rsi - 50) < 10) {
      recommendation = 'HOLD';
      orderType = 'NONE';
      confidence = 40;
      reason = `Market consolidating around pivot (${timeframe} timeframe) - wait for breakout`;
    } else {
      recommendation = 'HOLD';
      orderType = 'NONE';
      confidence = 30;
      reason = `No clear setup (${timeframe} timeframe) - wait for better risk/reward opportunity`;
    }
    
    const riskRewardRatio = stopLoss && takeProfit ? 
      Math.abs(takeProfit - entryPrice) / Math.abs(stopLoss - entryPrice) : 0;
    
    if (riskRewardRatio < timeframeParams.minRiskReward) {
      confidence = Math.min(confidence - 20, 50);
      reason += ' (Low risk/reward ratio)';
    }
    
    return {
      symbol,
      recommendation,
      confidence: Math.round(confidence),
      reason,
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(2)) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit.toFixed(2)) : null,
      orderType,
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      timeframe: timeframe,
      indicators: {
        rsi: parseFloat(rsi.toFixed(2)),
        atr: parseFloat(atr.toFixed(2)),
        emaShort: parseFloat(emaShort.toFixed(2)),
        emaMedium: parseFloat(emaMedium.toFixed(2)),
        emaLong: parseFloat(emaLong.toFixed(2)),
        support: parseFloat(support.toFixed(2)),
        resistance: parseFloat(resistance.toFixed(2)),
        pivot: parseFloat(pivot.toFixed(2))
      },
      marketStructure
    };
  }
}

const tradeRecommender = new TradeRecommender();

// Market data fetching
async function fetchMarketData(symbol: string, limit: number = 100) {
  const getYahooSymbol = (sym: string) => {
    switch (sym.toUpperCase()) {
      case 'XAUUSD': return 'GC=F';
      case 'EURUSD': return 'EURUSD=X';
      case 'BTCUSD': return 'BTC-USD';
      case 'NAS100': return '^NDX';
      default: return sym;
    }
  };

  try {
    const yahooSymbol = getYahooSymbol(symbol);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=15m&range=1d`
    );
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');
    
    const timestamp = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const open = quotes.open || [];
    const high = quotes.high || [];
    const low = quotes.low || [];
    const close = quotes.close || [];
    
    const candles = [];
    for (let i = 0; i < timestamp.length && i < limit; i++) {
      if (open[i] != null && high[i] != null && low[i] != null && close[i] != null) {
        candles.push({
          time: timestamp[i],
          open: open[i],
          high: high[i],
          low: low[i],
          close: close[i]
        });
      }
    }
    
    return candles;
  } catch (error) {
    console.error('Market data fetch error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'XAUUSD';
    const timeframe = searchParams.get('timeframe') || '15';
    
    const marketData = await fetchMarketData(symbol, 100);
    if (marketData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No market data available' 
      }, { status: 404 });
    }
    
    const recommendation = tradeRecommender.generateTradeRecommendation(symbol, marketData, timeframe);
    
    return NextResponse.json({
      success: true,
      symbol,
      timeframe,
      timestamp: new Date().toISOString(),
      recommendation
    });
  } catch (error) {
    console.error('Trade recommendation error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Trade recommendation failed' 
    }, { status: 500 });
  }
}
