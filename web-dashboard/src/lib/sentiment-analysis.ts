// Sentiment Analysis Library
// Analyzes news and social media sentiment for trading decisions

export interface SentimentData {
  source: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  timestamp: Date;
  relevance: number;
}

export interface SentimentAnalysis {
  overall: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  confidence: number;
  sources: {
    news: number;
    social: number;
    institutional: number;
  };
  keyTopics: string[];
  recommendation: string;
}

export class SentimentAnalyzer {
  // Simple keyword-based sentiment analysis (reserved for future use)
  // private analyzeText(text: string): { sentiment: 'positive' | 'negative' | 'neutral'; confidence: number } {
  //   const positiveKeywords = [
  //     'bullish', 'growth', 'increase', 'rise', 'gain', 'profit', 'strong', 'positive',
  //     'upgrade', 'outperform', 'buy', 'rally', 'surge', 'breakout', 'momentum'
  //   ];
  //   
  //   const negativeKeywords = [
  //     'bearish', 'decline', 'decrease', 'fall', 'loss', 'weak', 'negative',
  //     'downgrade', 'underperform', 'sell', 'crash', 'plunge', 'drop', 'concern'
  //   ];
  //   
  //   const lowerText = text.toLowerCase();
  //   
  //   let positiveCount = 0;
  //   let negativeCount = 0;
  //   
  //   for (const keyword of positiveKeywords) {
  //     if (lowerText.includes(keyword)) positiveCount++;
  //   }
  //   
  //   for (const keyword of negativeKeywords) {
  //     if (lowerText.includes(keyword)) negativeCount++;
  //   }
  //   
  //   const total = positiveCount + negativeCount;
  //   if (total === 0) {
  //     return { sentiment: 'neutral', confidence: 0.3 };
  //   }
  //   
  //   const positiveRatio = positiveCount / total;
  //   const confidence = Math.min(0.9, total * 0.1 + 0.3);
  //   
  //   if (positiveRatio > 0.6) {
  //     return { sentiment: 'positive', confidence };
  //   } else if (positiveRatio < 0.4) {
  //     return { sentiment: 'negative', confidence };
  //   } else {
  //     return { sentiment: 'neutral', confidence };
  //   }
  // }
  
  // Analyze sentiment from multiple sources
  analyzeSentiment(data: SentimentData[]): SentimentAnalysis {
    if (data.length === 0) {
      return {
        overall: 'neutral',
        score: 0,
        confidence: 30,
        sources: { news: 0, social: 0, institutional: 0 },
        keyTopics: [],
        recommendation: 'Insufficient sentiment data'
      };
    }
    
    // Calculate weighted sentiment scores
    let newsScore = 0, socialScore = 0, institutionalScore = 0;
    let newsCount = 0, socialCount = 0, institutionalCount = 0;
    
    const keyTopics = new Set<string>();
    
    for (const item of data) {
      const sentimentValue = item.sentiment === 'positive' ? 1 : 
                           item.sentiment === 'negative' ? -1 : 0;
      
      const weightedScore = sentimentValue * item.confidence * item.relevance;
      
      if (item.source.includes('news')) {
        newsScore += weightedScore;
        newsCount++;
      } else if (item.source.includes('social')) {
        socialScore += weightedScore;
        socialCount++;
      } else if (item.source.includes('institutional')) {
        institutionalScore += weightedScore;
        institutionalCount++;
      }
      
      // Extract key topics (simplified)
      if (item.source.includes('economic') || item.source.includes('fed')) {
        keyTopics.add('Monetary Policy');
      }
      if (item.source.includes('earnings') || item.source.includes('profit')) {
        keyTopics.add('Corporate Performance');
      }
      if (item.source.includes('geopolitical') || item.source.includes('war')) {
        keyTopics.add('Geopolitical Events');
      }
    }
    
    // Normalize scores
    const sources = {
      news: newsCount > 0 ? (newsScore / newsCount) * 100 : 0,
      social: socialCount > 0 ? (socialScore / socialCount) * 100 : 0,
      institutional: institutionalCount > 0 ? (institutionalScore / institutionalCount) * 100 : 0
    };
    
    // Calculate overall weighted score (institutional has highest weight)
    const overallScore = (sources.news * 0.3) + (sources.social * 0.2) + (sources.institutional * 0.5);
    
    // Determine overall sentiment
    let overall: 'bullish' | 'bearish' | 'neutral';
    if (overallScore >= 20) {
      overall = 'bullish';
    } else if (overallScore <= -20) {
      overall = 'bearish';
    } else {
      overall = 'neutral';
    }
    
    // Calculate confidence based on data quantity and consistency
    const totalDataPoints = data.length;
    const consistency = Math.abs(overallScore) / 100;
    const confidence = Math.min(95, (totalDataPoints * 5) + (consistency * 30));
    
    // Generate recommendation
    let recommendation = 'Sentiment suggests holding current positions';
    if (overall === 'bullish' && confidence > 60) {
      recommendation = 'Positive sentiment supports buying opportunities';
    } else if (overall === 'bearish' && confidence > 60) {
      recommendation = 'Negative sentiment suggests caution or selling';
    } else if (overall === 'neutral') {
      recommendation = 'Mixed sentiment - wait for clearer signals';
    }
    
    return {
      overall,
      score: Math.round(overallScore),
      confidence: Math.round(confidence),
      sources,
      keyTopics: Array.from(keyTopics),
      recommendation
    };
  }
  
  // Get sample sentiment data (in production, this would come from APIs)
  getSampleSentimentData(): SentimentData[] {
    // This would typically come from news APIs, Twitter API, etc.
    // For now, return sample data
    return [
      {
        source: 'news',
        sentiment: 'positive',
        confidence: 0.7,
        timestamp: new Date(),
        relevance: 0.8
      },
      {
        source: 'social',
        sentiment: 'neutral',
        confidence: 0.5,
        timestamp: new Date(Date.now() - 3600000),
        relevance: 0.6
      },
      {
        source: 'institutional',
        sentiment: 'positive',
        confidence: 0.8,
        timestamp: new Date(Date.now() - 7200000),
        relevance: 0.9
      }
    ];
  }
  
  // Calculate Fear/Greed index (simplified version)
  calculateFearGreedIndex(): {
    index: number; // 0-100 (0 = extreme fear, 100 = extreme greed)
    classification: string;
    recommendation: string;
  } {
    // In production, this would use actual market data
    // For now, return a sample calculation
    const index = Math.floor(Math.random() * 40) + 30; // Random between 30-70
    
    let classification = 'Neutral';
    if (index <= 20) classification = 'Extreme Fear';
    else if (index <= 40) classification = 'Fear';
    else if (index <= 60) classification = 'Neutral';
    else if (index <= 80) classification = 'Greed';
    else classification = 'Extreme Greed';
    
    let recommendation = 'Hold current positions';
    if (index <= 20) {
      recommendation = 'Extreme fear may indicate buying opportunity';
    } else if (index >= 80) {
      recommendation = 'Extreme greed suggests caution and potential pullback';
    }
    
    return { index, classification, recommendation };
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();