// Machine Learning Price Prediction
// Simple ML models for trend and price direction prediction

export interface PricePrediction {
  direction: 'bullish' | 'bearish' | 'neutral';
  confidence: number; // 0-100
  timeHorizon: 'short' | 'medium' | 'long';
  targetPrice: number;
  probability: number;
  features: {
    trendStrength: number;
    momentum: number;
    volatility: number;
    volumeProfile: number;
  };
}

export class MLPredictor {
  // Simple linear regression for trend prediction
  private linearRegression(data: number[]): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += data[i];
      sumXY += i * data[i];
      sumX2 += i * i;
      sumY2 += data[i] * data[i];
    }
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;
    
    for (let i = 0; i < n; i++) {
      const predicted = slope * i + intercept;
      ssTotal += Math.pow(data[i] - meanY, 2);
      ssResidual += Math.pow(data[i] - predicted, 2);
    }
    
    const r2 = 1 - (ssResidual / ssTotal);
    
    return { slope, intercept, r2 };
  }
  
  // Calculate momentum indicator
  private calculateMomentum(data: number[], period: number = 10): number {
    if (data.length < period + 1) return 0;
    
    const current = data[data.length - 1];
    const past = data[data.length - period - 1];
    
    return ((current - past) / past) * 100;
  }
  
  // Calculate volatility
  private calculateVolatility(data: number[], period: number = 20): number {
    if (data.length < period) return 0;
    
    const recent = data.slice(-period);
    const mean = recent.reduce((a, b) => a + b, 0) / period;
    const variance = recent.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
    
    return Math.sqrt(variance);
  }
  
  // Simple moving average crossover detection
  private detectMACrossover(shortData: number[], longData: number[]): 'bullish' | 'bearish' | 'neutral' {
    if (shortData.length < 2 || longData.length < 2) return 'neutral';
    
    const currentShort = shortData[shortData.length - 1];
    const currentLong = longData[longData.length - 1];
    const prevShort = shortData[shortData.length - 2];
    const prevLong = longData[longData.length - 2];
    
    // Bullish crossover: short MA crosses above long MA
    if (prevShort <= prevLong && currentShort > currentLong) {
      return 'bullish';
    }
    
    // Bearish crossover: short MA crosses below long MA
    if (prevShort >= prevLong && currentShort < currentLong) {
      return 'bearish';
    }
    
    return 'neutral';
  }
  
  // Predict price direction using multiple features
  predictPriceDirection(prices: number[], currentPrice: number): PricePrediction {
    if (prices.length < 20) {
      return {
        direction: 'neutral',
        confidence: 30,
        timeHorizon: 'short',
        targetPrice: currentPrice,
        probability: 0.5,
        features: {
          trendStrength: 0,
          momentum: 0,
          volatility: 0,
          volumeProfile: 0
        }
      };
    }
    
    // Calculate features
    const regression = this.linearRegression(prices);
    const momentum = this.calculateMomentum(prices);
    const volatility = this.calculateVolatility(prices);
    
    // Calculate moving averages
    const shortMA = this.calculateMA(prices, 10);
    const longMA = this.calculateMA(prices, 20);
    const shortMAData = prices.slice(-10).map((_, i) => this.calculateMA(prices.slice(0, prices.length - 10 + i + 1), 10));
    const longMAData = prices.slice(-20).map((_, i) => this.calculateMA(prices.slice(0, prices.length - 20 + i + 1), 20));
    
    const maCrossover = this.detectMACrossover(shortMAData, longMAData);
    
    // Calculate trend strength (based on slope and R²)
    const trendStrength = Math.abs(regression.slope) * regression.r2 * 100;
    
    // Calculate volume profile (simplified as price stability)
    const priceStability = 1 / (volatility + 0.001);
    const volumeProfile = Math.min(100, priceStability * 10);
    
    // Combine features to predict direction
    let bullishScore = 0;
    let bearishScore = 0;
    
    // Trend slope
    if (regression.slope > 0) bullishScore += 30 * regression.r2;
    else bearishScore += 30 * regression.r2;
    
    // Momentum
    if (momentum > 0.5) bullishScore += 20;
    else if (momentum < -0.5) bearishScore += 20;
    
    // MA crossover
    if (maCrossover === 'bullish') bullishScore += 25;
    else if (maCrossover === 'bearish') bearishScore += 25;
    
    // Price relative to MAs
    if (currentPrice > shortMA && shortMA > longMA) bullishScore += 15;
    else if (currentPrice < shortMA && shortMA < longMA) bearishScore += 15;
    
    // Volatility adjustment (high volatility reduces confidence)
    const volatilityAdjustment = Math.max(0, 1 - volatility / currentPrice);
    
    // Determine direction
    let direction: 'bullish' | 'bearish' | 'neutral';
    let confidence: number;
    
    if (bullishScore > bearishScore && bullishScore > 40) {
      direction = 'bullish';
      confidence = Math.min(95, (bullishScore / (bullishScore + bearishScore)) * 100 * volatilityAdjustment);
    } else if (bearishScore > bullishScore && bearishScore > 40) {
      direction = 'bearish';
      confidence = Math.min(95, (bearishScore / (bullishScore + bearishScore)) * 100 * volatilityAdjustment);
    } else {
      direction = 'neutral';
      confidence = 40;
    }
    
    // Calculate target price based on predicted trend
    const timeHorizon: 'short' | 'medium' | 'long' = 
      confidence > 70 ? 'long' : confidence > 50 ? 'medium' : 'short';
    
    const priceChange = regression.slope * (timeHorizon === 'short' ? 5 : timeHorizon === 'medium' ? 15 : 30);
    const targetPrice = currentPrice + priceChange;
    
    // Calculate probability
    const probability = confidence / 100;
    
    return {
      direction,
      confidence: Math.round(confidence),
      timeHorizon,
      targetPrice: parseFloat(targetPrice.toFixed(2)),
      probability: parseFloat(probability.toFixed(2)),
      features: {
        trendStrength: parseFloat(trendStrength.toFixed(2)),
        momentum: parseFloat(momentum.toFixed(2)),
        volatility: parseFloat(volatility.toFixed(2)),
        volumeProfile: parseFloat(volumeProfile.toFixed(2))
      }
    };
  }
  
  // Calculate simple moving average
  private calculateMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }
  
  // Predict multiple timeframes
  predictMultiTimeframe(prices: number[], currentPrice: number): {
    short: PricePrediction;
    medium: PricePrediction;
    long: PricePrediction;
    consensus: {
      direction: 'bullish' | 'bearish' | 'neutral';
      confidence: number;
    };
  } {
    const shortPrices = prices.slice(-20);
    const mediumPrices = prices.slice(-50);
    const longPrices = prices.slice(-100);
    
    const short = this.predictPriceDirection(shortPrices, currentPrice);
    const medium = this.predictPriceDirection(mediumPrices, currentPrice);
    const long = this.predictPriceDirection(longPrices, currentPrice);
    
    // Calculate consensus
    const bullishCount = [short, medium, long].filter(p => p.direction === 'bullish').length;
    const bearishCount = [short, medium, long].filter(p => p.direction === 'bearish').length;
    
    let consensusDirection: 'bullish' | 'bearish' | 'neutral';
    if (bullishCount >= 2) consensusDirection = 'bullish';
    else if (bearishCount >= 2) consensusDirection = 'bearish';
    else consensusDirection = 'neutral';
    
    const avgConfidence = (short.confidence + medium.confidence + long.confidence) / 3;
    
    return {
      short,
      medium,
      long,
      consensus: {
        direction: consensusDirection,
        confidence: Math.round(avgConfidence)
      }
    };
  }
}

export const mlPredictor = new MLPredictor();