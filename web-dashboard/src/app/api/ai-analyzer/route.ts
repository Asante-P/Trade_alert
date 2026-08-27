import { NextRequest, NextResponse } from 'next/server';

// Twelve Data API
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// Symbol mapping for Twelve Data
const getTwelveDataSymbol = (sym: string) => {
  switch (sym.toUpperCase()) {
    case 'XAUUSD': return 'XAU/USD';
    case 'EURUSD': return 'EUR/USD';
    case 'BTCUSD': return 'BTC/USD';
    case 'NAS100': return 'US100';
    default: return sym;
  }
};

// Fetch market data from Twelve Data
async function fetchMarketData(symbol: string, interval: string = '15min', limit: number = 200) {
  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  const tdSymbol = getTwelveDataSymbol(symbol);
  
  const response = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_API_KEY}`
  );
  
  const data = await response.json();
  
  if (data.status === 'error') {
    throw new Error(`Twelve Data error: ${data.message}`);
  }
  
  if (!data.values || data.values.length === 0) {
    throw new Error('No data from Twelve Data');
  }
  
  // Convert to candle format (oldest first)
  const candles = data.values.map((v: any) => ({
    time: new Date(v.datetime).getTime() / 1000,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    currentPrice: parseFloat(v.close)
  })).reverse();
  
  return candles;
}

// Timeframe configurations with weights
const TIMEFRAMES = [
  { name: '15m', interval: '15min', limit: 200, weight: 0.10 },
  { name: '1H', interval: '1h', limit: 200, weight: 0.20 },
  { name: '4H', interval: '4h', limit: 200, weight: 0.30 },
  { name: 'Daily', interval: '1day', limit: 200, weight: 0.40 }
];

// Technical Analysis Functions
class TechnicalAnalyzer {
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

  calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  calculateATR(candles: any[], period: number = 14): number {
    if (candles.length < period + 1) return 0;
    
    let trSum = 0;
    for (let i = candles.length - period; i < candles.length; i++) {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trSum += tr;
    }
    
    return trSum / period;
  }

  findSupportResistance(candles: any[], period: number = 20): { support: number; resistance: number } {
    const recent = candles.slice(-period);
    const highs = recent.map(c => c.high);
    const lows = recent.map(c => c.low);
    
    return {
      support: Math.min(...lows),
      resistance: Math.max(...highs)
    };
  }

  analyzeMarketStructure(candles: any[], period: number = 20): { trend: string; strength: number } {
    const recent = candles.slice(-period);
    const ema = this.calculateEMA(recent.map(c => c.close), 20);
    const currentPrice = recent[recent.length - 1].close;
    
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].high > recent[i - 1].high) higherHighs++;
      if (recent[i].low > recent[i - 1].low) higherLows++;
      if (recent[i].high < recent[i - 1].high) lowerHighs++;
      if (recent[i].low < recent[i - 1].low) lowerLows++;
    }
    
    const bullishScore = higherHighs + higherLows;
    const bearishScore = lowerHighs + lowerLows;
    const strength = Math.abs(bullishScore - bearishScore) / (period * 2);
    
    if (currentPrice > ema && bullishScore > bearishScore) {
      return { trend: 'STRONG_BULLISH', strength };
    } else if (currentPrice > ema) {
      return { trend: 'BULLISH', strength };
    } else if (currentPrice < ema && bearishScore > bullishScore) {
      return { trend: 'STRONG_BEARISH', strength };
    } else {
      return { trend: 'BEARISH', strength };
    }
  }

  analyzeSymbol(symbol: string, candles: any[], timeframeName: string) {
    if (candles.length < 50) {
      return {
        symbol,
        timeframe: timeframeName,
        recommendation: 'HOLD',
        confidence: 0,
        reason: 'Insufficient data',
        score: 0
      };
    }

    const currentPrice = candles[candles.length - 1].close;
    const closes = candles.map(c => c.close);
    
    const rsi = this.calculateRSI(closes, 14);
    const atr = this.calculateATR(candles, 14);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const { support, resistance } = this.findSupportResistance(candles, 20);
    const marketStructure = this.analyzeMarketStructure(candles, 20);
    
    // Calculate composite score (0-100)
    let score = 50; // Base score
    
    // Trend analysis (20 points)
    if (marketStructure.trend === 'STRONG_BULLISH') score += 20;
    else if (marketStructure.trend === 'BULLISH') score += 10;
    else if (marketStructure.trend === 'STRONG_BEARISH') score -= 20;
    else if (marketStructure.trend === 'BEARISH') score -= 10;
    
    // RSI analysis (15 points)
    if (rsi < 30) score += 15; // Oversold - buy opportunity
    else if (rsi < 40) score += 8;
    else if (rsi > 70) score -= 15; // Overbought - sell opportunity
    else if (rsi > 60) score -= 8;
    
    // EMA alignment (15 points)
    if (currentPrice > ema20 && ema20 > ema50) score += 15; // Bullish alignment
    else if (currentPrice < ema20 && ema20 < ema50) score -= 15; // Bearish alignment
    
    // Support/Resistance proximity (10 points)
    const distToSupport = (currentPrice - support) / atr;
    const distToResistance = (resistance - currentPrice) / atr;
    
    if (distToSupport < 2 && distToSupport > 0) score += 10; // Near support
    if (distToResistance < 2 && distToResistance > 0) score -= 10; // Near resistance
    
    // Market structure strength (10 points)
    score += marketStructure.strength * 10;
    
    // Volatility (5 points) - moderate volatility is good
    const volatility = atr / currentPrice;
    if (volatility > 0.001 && volatility < 0.01) score += 5;
    else if (volatility > 0.01) score -= 5;
    
    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    
    // Determine recommendation based on score
    let recommendation = 'HOLD';
    let confidence = 0;
    let reason = '';
    
    if (score >= 75) {
      recommendation = 'STRONG BUY';
      confidence = score;
      reason = 'Strong bullish trend with oversold conditions and support proximity';
    } else if (score >= 60) {
      recommendation = 'BUY';
      confidence = score;
      reason = 'Bullish trend with favorable technical conditions';
    } else if (score <= 25) {
      recommendation = 'STRONG SELL';
      confidence = 100 - score;
      reason = 'Strong bearish trend with overbought conditions and resistance proximity';
    } else if (score <= 40) {
      recommendation = 'SELL';
      confidence = 100 - score;
      reason = 'Bearish trend with unfavorable technical conditions';
    } else {
      recommendation = 'HOLD';
      confidence = 50;
      reason = 'Mixed signals - wait for clearer setup';
    }
    
    // Calculate entry, stop loss, take profit
    const stopLoss = recommendation.includes('BUY') ? 
      currentPrice - (atr * 1.5) : 
      currentPrice + (atr * 1.5);
    
    const takeProfit = recommendation.includes('BUY') ? 
      currentPrice + (atr * 3) : 
      currentPrice - (atr * 3);
    
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice);
    
    return {
      symbol,
      timeframe: timeframeName,
      recommendation,
      confidence: Math.round(confidence),
      reason,
      score: Math.round(score),
      currentPrice,
      entryPrice: currentPrice,
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      takeProfit: parseFloat(takeProfit.toFixed(2)),
      riskRewardRatio: parseFloat(riskReward.toFixed(2)),
      indicators: {
        rsi: parseFloat(rsi.toFixed(2)),
        atr: parseFloat(atr.toFixed(2)),
        ema20: parseFloat(ema20.toFixed(2)),
        ema50: parseFloat(ema50.toFixed(2)),
        support: parseFloat(support.toFixed(2)),
        resistance: parseFloat(resistance.toFixed(2))
      },
      marketStructure
    };
  }

  // Analyze symbol across multiple timeframes and combine results
  async analyzeSymbolMultiTimeframe(symbol: string) {
    const timeframeResults = [];
    
    for (const tf of TIMEFRAMES) {
      try {
        const candles = await fetchMarketData(symbol, tf.interval, tf.limit);
        const analysis = this.analyzeSymbol(symbol, candles, tf.name);
        timeframeResults.push({
          ...analysis,
          weight: tf.weight
        });
      } catch (error) {
        console.error(`Error analyzing ${symbol} on ${tf.name}:`, error);
        timeframeResults.push({
          symbol,
          timeframe: tf.name,
          score: 50,
          weight: tf.weight,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // Calculate weighted composite score
    let weightedScore = 0;
    let totalWeight = 0;
    
    for (const result of timeframeResults) {
      if (result.score !== undefined && !result.error) {
        weightedScore += result.score * result.weight;
        totalWeight += result.weight;
      }
    }
    
    const compositeScore = totalWeight > 0 ? weightedScore / totalWeight : 50;
    
    // Determine confluence (how many timeframes agree)
    const bullishCount = timeframeResults.filter(r => r.score >= 60).length;
    const bearishCount = timeframeResults.filter(r => r.score <= 40).length;
    const confluence = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';
    
    // Determine composite recommendation
    let compositeRecommendation = 'HOLD';
    let compositeConfidence = 0;
    let compositeReason = '';
    
    if (compositeScore >= 75) {
      compositeRecommendation = 'STRONG BUY';
      compositeConfidence = compositeScore;
      compositeReason = `Strong buy signal across ${bullishCount} timeframes with high confluence`;
    } else if (compositeScore >= 60) {
      compositeRecommendation = 'BUY';
      compositeConfidence = compositeScore;
      compositeReason = `Buy signal with ${bullishCount} bullish timeframes`;
    } else if (compositeScore <= 25) {
      compositeRecommendation = 'STRONG SELL';
      compositeConfidence = 100 - compositeScore;
      compositeReason = `Strong sell signal across ${bearishCount} timeframes with high confluence`;
    } else if (compositeScore <= 40) {
      compositeRecommendation = 'SELL';
      compositeConfidence = 100 - compositeScore;
      compositeReason = `Sell signal with ${bearishCount} bearish timeframes`;
    } else {
      compositeRecommendation = 'HOLD';
      compositeConfidence = 50;
      compositeReason = 'Mixed signals across timeframes - wait for confluence';
    }
    
    // Use the most recent price from 15m timeframe for entry calculations
    const tf15m = timeframeResults.find(r => r.timeframe === '15m');
    const currentPrice = tf15m?.currentPrice || 0;
    const atr = tf15m?.indicators?.atr || 0;
    
    const stopLoss = compositeRecommendation.includes('BUY') ? 
      currentPrice - (atr * 1.5) : 
      currentPrice + (atr * 1.5);
    
    const takeProfit = compositeRecommendation.includes('BUY') ? 
      currentPrice + (atr * 3) : 
      currentPrice - (atr * 3);
    
    const riskReward = Math.abs(takeProfit - currentPrice) / Math.abs(stopLoss - currentPrice);
    
    return {
      symbol,
      recommendation: compositeRecommendation,
      confidence: Math.round(compositeConfidence),
      reason: compositeReason,
      score: Math.round(compositeScore),
      currentPrice,
      entryPrice: currentPrice,
      stopLoss: parseFloat(stopLoss.toFixed(2)),
      takeProfit: parseFloat(takeProfit.toFixed(2)),
      riskRewardRatio: parseFloat(riskReward.toFixed(2)),
      confluence,
      timeframeResults,
      indicators: tf15m?.indicators || {},
      marketStructure: tf15m?.marketStructure || {}
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || 'XAUUSD,EURUSD,BTCUSD,NAS100';
    const symbols = symbolsParam.split(',');
    
    console.log(`AI Analyzer: Analyzing symbols: ${symbols.join(', ')}`);
    
    const analyzer = new TechnicalAnalyzer();
    const results = [];
    
    for (const symbol of symbols) {
      try {
        // Analyze the symbol across multiple timeframes
        const analysis = await analyzer.analyzeSymbolMultiTimeframe(symbol);
        results.push(analysis);
        
        console.log(`${symbol}: ${analysis.recommendation} (Score: ${analysis.score}, Confluence: ${analysis.confluence})`);
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        results.push({
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error',
          score: 0
        });
      }
    }
    
    // Sort by score (highest first)
    const sortedResults = results.sort((a, b) => (b.score || 0) - (a.score || 0));
    
    // Get top 3 opportunities
    const topOpportunities = sortedResults.filter(r => r.score !== undefined && r.score !== null && r.score > 55).slice(0, 3);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalAnalyzed: symbols.length,
        topOpportunities: topOpportunities.length,
        bestEntry: topOpportunities.length > 0 ? topOpportunities[0] : null
      },
      allResults: sortedResults,
      topOpportunities
    });
  } catch (error) {
    console.error('AI Analyzer error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
