import { NextRequest, NextResponse } from 'next/server';
import { economicAnalyzer } from '@/lib/economic-analysis';
import { mlPredictor } from '@/lib/ml-prediction';
import { sentimentAnalyzer } from '@/lib/sentiment-analysis';
import { alertSystem } from '@/lib/alert-system';

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

  findPreviousDayHighLow(candles: any[]): { dayHigh: number; dayLow: number } {
    if (candles.length < 24) return { dayHigh: 0, dayLow: 0 };
    
    // Assuming 15m candles, last 96 candles = 24 hours
    const lastDay = candles.slice(-96);
    return {
      dayHigh: Math.max(...lastDay.map(c => c.high)),
      dayLow: Math.min(...lastDay.map(c => c.low))
    };
  }

  findPreviousWeekHighLow(candles: any[]): { weekHigh: number; weekLow: number } {
    if (candles.length < 672) return { weekHigh: 0, weekLow: 0 };
    
    // Assuming 15m candles, last 672 candles = 7 days
    const lastWeek = candles.slice(-672);
    return {
      weekHigh: Math.max(...lastWeek.map(c => c.high)),
      weekLow: Math.min(...lastWeek.map(c => c.low))
    };
  }

  findOrderBlocks(candles: any[]): { bullishOB: number | null; bearishOB: number | null } {
    if (candles.length < 50) return { bullishOB: null, bearishOB: null };
    
    const recent = candles.slice(-50);
    let bullishOB: number | null = null;
    let bearishOB: number | null = null;
    
    // Look for strong bullish candles (order blocks)
    for (let i = 1; i < recent.length; i++) {
      const candle = recent[i];
      const body = Math.abs(candle.close - candle.open);
      const range = candle.high - candle.low;
      const bodyRatio = body / range;
      
      // Strong bullish candle: close > open, body > 60% of range
      if (candle.close > candle.open && bodyRatio > 0.6) {
        const isStrong = candle.close > recent[i - 1].high;
        if (isStrong && !bullishOB) {
          bullishOB = candle.low; // Order block at the low of the bullish candle
        }
      }
      
      // Strong bearish candle: close < open, body > 60% of range
      if (candle.close < candle.open && bodyRatio > 0.6) {
        const isStrong = candle.close < recent[i - 1].low;
        if (isStrong && !bearishOB) {
          bearishOB = candle.high; // Order block at the high of the bearish candle
        }
      }
    }
    
    return { bullishOB, bearishOB };
  }

  detectBOS(candles: any[]): { bullishBOS: boolean; bearishBOS: boolean; lastBullishPrice: number | null; lastBearishPrice: number | null } {
    if (candles.length < 50) return { bullishBOS: false, bearishBOS: false, lastBullishPrice: null, lastBearishPrice: null };
    
    const recent = candles.slice(-50);
    let bullishBOS = false;
    let bearishBOS = false;
    let lastBullishPrice: number | null = null;
    let lastBearishPrice: number | null = null;
    
    // Find pivot highs and lows
    const pivotHighs: number[] = [];
    const pivotLows: number[] = [];
    
    for (let i = 2; i < recent.length - 2; i++) {
      const prevHigh = recent[i - 1].high;
      const currentHigh = recent[i].high;
      const nextHigh = recent[i + 1].high;
      
      const prevLow = recent[i - 1].low;
      const currentLow = recent[i].low;
      const nextLow = recent[i + 1].low;
      
      // Pivot high
      if (currentHigh > prevHigh && currentHigh > nextHigh) {
        pivotHighs.push(currentHigh);
      }
      
      // Pivot low
      if (currentLow < prevLow && currentLow < nextLow) {
        pivotLows.push(currentLow);
      }
    }
    
    if (pivotHighs.length < 2 || pivotLows.length < 2) {
      return { bullishBOS, bearishBOS, lastBullishPrice, lastBearishPrice };
    }
    
    const currentPrice = recent[recent.length - 1].close;
    const lastPivotHigh = pivotHighs[pivotHighs.length - 1];
    const lastPivotLow = pivotLows[pivotLows.length - 1];
    const prevPivotHigh = pivotHighs[pivotHighs.length - 2];
    const prevPivotLow = pivotLows[pivotLows.length - 2];
    
    // Bullish BOS: Price breaks above previous pivot high
    if (currentPrice > lastPivotHigh && lastPivotHigh > prevPivotHigh) {
      bullishBOS = true;
      lastBullishPrice = lastPivotHigh;
    }
    
    // Bearish BOS: Price breaks below previous pivot low
    if (currentPrice < lastPivotLow && lastPivotLow < prevPivotLow) {
      bearishBOS = true;
      lastBearishPrice = lastPivotLow;
    }
    
    return { bullishBOS, bearishBOS, lastBullishPrice, lastBearishPrice };
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
    const { dayHigh, dayLow } = this.findPreviousDayHighLow(candles);
    const { weekHigh, weekLow } = this.findPreviousWeekHighLow(candles);
    const { bullishOB, bearishOB } = this.findOrderBlocks(candles);
    const { bullishBOS, bearishBOS, lastBullishPrice, lastBearishPrice } = this.detectBOS(candles);
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
    
    // Previous Day High/Low proximity (10 points)
    const distToDayHigh = (dayHigh - currentPrice) / atr;
    const distToDayLow = (currentPrice - dayLow) / atr;
    
    if (distToDayLow < 1 && distToDayLow > 0) score += 10; // Near day low - buy opportunity
    if (distToDayHigh < 1 && distToDayHigh > 0) score -= 10; // Near day high - sell opportunity
    
    // Previous Week High/Low proximity (10 points)
    const distToWeekHigh = (weekHigh - currentPrice) / atr;
    const distToWeekLow = (currentPrice - weekLow) / atr;
    
    if (distToWeekLow < 2 && distToWeekLow > 0) score += 10; // Near week low - strong buy opportunity
    if (distToWeekHigh < 2 && distToWeekHigh > 0) score -= 10; // Near week high - strong sell opportunity
    
    // Order Block proximity (15 points)
    if (bullishOB) {
      const distToBullishOB = (currentPrice - bullishOB) / atr;
      if (distToBullishOB < 1 && distToBullishOB > 0) score += 15; // Near bullish order block
    }
    if (bearishOB) {
      const distToBearishOB = (bearishOB - currentPrice) / atr;
      if (distToBearishOB < 1 && distToBearishOB > 0) score -= 15; // Near bearish order block
    }
    
    // BOS (Break of Structure) - 20 points
    if (bullishBOS) {
      score += 20; // Bullish BOS - strong buy signal
    }
    if (bearishBOS) {
      score -= 20; // Bearish BOS - strong sell signal
    }
    
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
    
    if (score >= 65) {
      recommendation = 'STRONG BUY';
      confidence = score;
      reason = 'Strong bullish trend with oversold conditions and support proximity';
    } else if (score >= 50) {
      recommendation = 'BUY';
      confidence = score;
      reason = 'Bullish trend with favorable technical conditions';
    } else if (score <= 35) {
      recommendation = 'STRONG SELL';
      confidence = 100 - score;
      reason = 'Strong bearish trend with overbought conditions and resistance proximity';
    } else if (score <= 50) {
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
        resistance: parseFloat(resistance.toFixed(2)),
        dayHigh: parseFloat(dayHigh.toFixed(2)),
        dayLow: parseFloat(dayLow.toFixed(2)),
        weekHigh: parseFloat(weekHigh.toFixed(2)),
        weekLow: parseFloat(weekLow.toFixed(2)),
        bullishOB: bullishOB ? parseFloat(bullishOB.toFixed(2)) : null,
        bearishOB: bearishOB ? parseFloat(bearishOB.toFixed(2)) : null,
        bullishBOS,
        bearishBOS,
        lastBullishBOS: lastBullishPrice ? parseFloat(lastBullishPrice.toFixed(2)) : null,
        lastBearishBOS: lastBearishPrice ? parseFloat(lastBearishPrice.toFixed(2)) : null,
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
    const bullishCount = timeframeResults.filter(r => r.score >= 50).length;
    const bearishCount = timeframeResults.filter(r => r.score <= 50).length;
    const confluence = bullishCount > bearishCount ? 'bullish' : bearishCount > bullishCount ? 'bearish' : 'neutral';
    
    // Determine composite recommendation
    let compositeRecommendation = 'HOLD';
    let compositeConfidence = 0;
    let compositeReason = '';
    
    if (compositeScore >= 65) {
      compositeRecommendation = 'STRONG BUY';
      compositeConfidence = compositeScore;
      compositeReason = `Strong buy signal across ${bullishCount} timeframes with high confluence`;
    } else if (compositeScore >= 50) {
      compositeRecommendation = 'BUY';
      compositeConfidence = compositeScore;
      compositeReason = `Buy signal with ${bullishCount} bullish timeframes`;
    } else if (compositeScore <= 35) {
      compositeRecommendation = 'STRONG SELL';
      compositeConfidence = 100 - compositeScore;
      compositeReason = `Strong sell signal across ${bearishCount} timeframes with high confluence`;
    } else if (compositeScore <= 50) {
      compositeRecommendation = 'SELL';
      compositeConfidence = 100 - compositeScore;
      compositeReason = `Sell signal with ${bearishCount} bearish timeframes`;
    } else {
      compositeRecommendation = 'HOLD';
      compositeConfidence = 50;
      compositeReason = 'Mixed signals across timeframes - wait for confluence';
    }
    
    // Use the most recent price from 15m timeframe for entry calculations
    const tf15m = timeframeResults.find(r => r.timeframe === '15m' && !r.error);
    const currentPrice = tf15m && 'currentPrice' in tf15m ? tf15m.currentPrice : 0;
    const atr = tf15m && 'indicators' in tf15m && tf15m.indicators ? tf15m.indicators.atr || 0 : 0;
    
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
      indicators: tf15m && 'indicators' in tf15m ? tf15m.indicators : {},
      marketStructure: tf15m && 'marketStructure' in tf15m ? tf15m.marketStructure : {}
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
        
        // Integrate economic analysis
        const economicIndicators = economicAnalyzer.getUpcomingHighImpactEvents();
        const economicImpact = economicAnalyzer.analyzeEconomicImpact(economicIndicators, symbol);
        
        // Integrate ML prediction using the 15m timeframe data
        let mlPrediction = null;
        let mlScore = 50;
        
        try {
          const candles15m = await fetchMarketData(symbol, '15min', 100);
          const prices = candles15m.map((c: any) => c.close);
          
          if (prices.length > 20) {
            mlPrediction = mlPredictor.predictMultiTimeframe(prices, analysis.currentPrice);
            mlScore = mlPrediction.consensus.direction === 'bullish' ? 70 : 
                      mlPrediction.consensus.direction === 'bearish' ? 30 : 50;
          }
        } catch (mlError) {
          console.log('ML prediction failed, using default score:', mlError);
        }
        
        // Integrate sentiment analysis
        const sentimentData = sentimentAnalyzer.getSampleSentimentData();
        const sentimentAnalysis = sentimentAnalyzer.analyzeSentiment(sentimentData);
        const sentimentScore = sentimentAnalysis.overall === 'bullish' ? 70 : 
                              sentimentAnalysis.overall === 'bearish' ? 30 : 50;
        
        // Combine technical, economic, ML, and sentiment scores (40% technical, 20% economic, 20% ML, 20% sentiment)
        const combinedScore = (analysis.score * 0.4) + (economicImpact.score * 0.2) + (mlScore * 0.2) + (sentimentScore * 0.2);
        
        // Adjust recommendation based on combined score
        let adjustedRecommendation = analysis.recommendation;
        if (combinedScore >= 65) {
          adjustedRecommendation = 'STRONG BUY';
        } else if (combinedScore >= 50) {
          adjustedRecommendation = 'BUY';
        } else if (combinedScore <= 35) {
          adjustedRecommendation = 'STRONG SELL';
        } else if (combinedScore <= 50) {
          adjustedRecommendation = 'SELL';
        } else {
          adjustedRecommendation = 'HOLD';
        }
        
        const enhancedAnalysis = {
          ...analysis,
          score: Math.round(combinedScore),
          recommendation: adjustedRecommendation,
          economicImpact,
          mlPrediction,
          sentimentAnalysis,
          analysisType: 'combined'
        };
        
        // Create trading opportunity alert if conditions are met
        if (enhancedAnalysis.score >= 65) {
          const alert = alertSystem.createOpportunityAlert(enhancedAnalysis);
          if (alert) {
            console.log(`Created alert for ${symbol}: ${alert.type} - ${alert.message}`);
          }
        }
        
        results.push(enhancedAnalysis);
        
        console.log(`${symbol}: ${enhancedAnalysis.recommendation} (Tech: ${analysis.score}, Econ: ${economicImpact.score}, ML: ${mlScore}, Sent: ${sentimentScore}, Combined: ${combinedScore})`);
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
    
    // Get top 3 opportunities (lowered threshold from 55 to 40 for more opportunities)
    const topOpportunities = sortedResults.filter(r => r.score !== undefined && r.score !== null && r.score > 40).slice(0, 3);
    
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
