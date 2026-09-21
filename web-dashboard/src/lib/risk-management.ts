// Risk Management System
// Comprehensive risk analysis and position sizing

export interface Position {
  symbol: string;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  size: number;
  direction: 'long' | 'short';
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export interface RiskMetrics {
  accountBalance: number;
  totalRisk: number;
  totalExposure: number;
  riskPercent: number;
  maxDrawdown: number;
  currentDrawdown: number;
  correlationRisk: number;
  positionCount: number;
  leverage: number;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'extreme';
  score: number; // 0-100
  recommendations: string[];
  canOpenNewPosition: boolean;
  maxPositionSize: number;
  warnings: string[];
}

export class RiskManager {
  private maxRiskPercent: number = 2; // Maximum risk per trade as % of account
  private maxTotalRisk: number = 10; // Maximum total risk as % of account
  private maxDrawdown: number = 20; // Maximum allowed drawdown %
  private maxPositions: number = 5; // Maximum number of concurrent positions
  private maxLeverage: number = 10; // Maximum leverage

  // Calculate optimal position size based on risk
  calculatePositionSize(
    accountBalance: number,
    entryPrice: number,
    stopLoss: number,
    riskPercent: number = this.maxRiskPercent
  ): number {
    const riskAmount = accountBalance * (riskPercent / 100);
    const stopLossDistance = Math.abs(entryPrice - stopLoss);
    
    if (stopLossDistance === 0) return 0;
    
    const positionSize = riskAmount / stopLossDistance;
    
    // Apply maximum leverage constraint
    const maxPositionByLeverage = (accountBalance * this.maxLeverage) / entryPrice;
    
    return Math.min(positionSize, maxPositionByLeverage);
  }

  // Calculate risk/reward ratio
  calculateRiskReward(entry: number, stopLoss: number, takeProfit: number): number {
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    
    if (risk === 0) return 0;
    
    return reward / risk;
  }

  // Assess overall portfolio risk
  assessPortfolioRisk(positions: Position[], accountBalance: number): RiskMetrics {
    const totalRisk = positions.reduce((sum, pos) => {
      const riskAmount = Math.abs(pos.entryPrice - pos.stopLoss) * pos.size;
      return sum + riskAmount;
    }, 0);

    const totalExposure = positions.reduce((sum, pos) => {
      return sum + (pos.currentPrice * pos.size);
    }, 0);

    const riskPercent = (totalRisk / accountBalance) * 100;
    const leverage = totalExposure / accountBalance;

    // Calculate current drawdown
    const initialBalance = accountBalance * 1.2; // Assume 20% initial profit for calculation
    const currentDrawdown = ((initialBalance - accountBalance) / initialBalance) * 100;

    // Calculate correlation risk (simplified)
    const correlationRisk = this.calculateCorrelationRisk(positions);

    return {
      accountBalance,
      totalRisk,
      totalExposure,
      riskPercent,
      maxDrawdown: this.maxDrawdown,
      currentDrawdown,
      correlationRisk,
      positionCount: positions.length,
      leverage
    };
  }

  // Calculate correlation risk between positions
  private calculateCorrelationRisk(positions: Position[]): number {
    if (positions.length < 2) return 0;

    // Simplified correlation analysis based on symbols
    const symbols = positions.map(p => p.symbol);
    let correlatedPairs = 0;

    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        if (this.areSymbolsCorrelated(symbols[i], symbols[j])) {
          correlatedPairs++;
        }
      }
    }

    const totalPairs = (symbols.length * (symbols.length - 1)) / 2;
    return totalPairs > 0 ? (correlatedPairs / totalPairs) * 100 : 0;
  }

  // Check if two symbols are correlated
  private areSymbolsCorrelated(symbol1: string, symbol2: string): boolean {
    // Simplified correlation rules
    const correlatedPairs = [
      ['EURUSD', 'GBPUSD'],
      ['EURUSD', 'AUDUSD'],
      ['GBPUSD', 'AUDUSD'],
      ['XAUUSD', 'BTCUSD'],
      ['NAS100', 'BTCUSD']
    ];

    return correlatedPairs.some(pair => 
      (pair[0] === symbol1 && pair[1] === symbol2) ||
      (pair[1] === symbol1 && pair[0] === symbol2)
    );
  }

  // Comprehensive risk assessment
  assessRisk(positions: Position[], accountBalance: number, newPosition?: {
    symbol: string;
    entryPrice: number;
    stopLoss: number;
  }): RiskAssessment {
    const metrics = this.assessPortfolioRisk(positions, accountBalance);
    let riskScore = 0;
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Risk percentage assessment
    if (metrics.riskPercent > 15) {
      riskScore += 30;
      warnings.push('Total portfolio risk is very high');
    } else if (metrics.riskPercent > 10) {
      riskScore += 20;
      warnings.push('Total portfolio risk is elevated');
    } else if (metrics.riskPercent > 5) {
      riskScore += 10;
    }

    // Leverage assessment
    if (metrics.leverage > this.maxLeverage) {
      riskScore += 25;
      warnings.push('Leverage exceeds maximum allowed');
    } else if (metrics.leverage > this.maxLeverage * 0.8) {
      riskScore += 15;
      warnings.push('Leverage is approaching maximum');
    }

    // Drawdown assessment
    if (metrics.currentDrawdown > this.maxDrawdown * 0.8) {
      riskScore += 25;
      warnings.push('Drawdown is approaching maximum limit');
    } else if (metrics.currentDrawdown > this.maxDrawdown * 0.5) {
      riskScore += 15;
    }

    // Correlation risk
    if (metrics.correlationRisk > 50) {
      riskScore += 20;
      warnings.push('High correlation risk between positions');
    } else if (metrics.correlationRisk > 30) {
      riskScore += 10;
    }

    // Position count
    if (metrics.positionCount >= this.maxPositions) {
      riskScore += 15;
      warnings.push('Maximum number of positions reached');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'extreme';
    if (riskScore >= 70) level = 'extreme';
    else if (riskScore >= 50) level = 'high';
    else if (riskScore >= 30) level = 'medium';
    else level = 'low';

    // Generate recommendations
    if (level === 'extreme') {
      recommendations.push('REDUCE POSITION SIZES IMMEDIATELY');
      recommendations.push('Consider closing some positions');
      recommendations.push('Stop opening new positions');
    } else if (level === 'high') {
      recommendations.push('Reduce position sizes');
      recommendations.push('Avoid adding to existing positions');
      recommendations.push('Be cautious with new positions');
    } else if (level === 'medium') {
      recommendations.push('Monitor positions closely');
      recommendations.push('Consider reducing exposure');
    } else {
      recommendations.push('Current risk levels are acceptable');
      recommendations.push('Continue normal trading activities');
    }

    // Check if new position can be opened
    let canOpenNewPosition = true;
    let maxPositionSize = 0;

    if (newPosition) {
      const newSize = this.calculatePositionSize(
        accountBalance,
        newPosition.entryPrice,
        newPosition.stopLoss
      );

      const projectedRisk = metrics.totalRisk + 
        Math.abs(newPosition.entryPrice - newPosition.stopLoss) * newSize;
      const projectedRiskPercent = (projectedRisk / accountBalance) * 100;

      if (projectedRiskPercent > this.maxTotalRisk) {
        canOpenNewPosition = false;
        warnings.push('New position would exceed maximum total risk');
      }

      if (metrics.positionCount >= this.maxPositions) {
        canOpenNewPosition = false;
        warnings.push('Maximum number of positions reached');
      }

      maxPositionSize = canOpenNewPosition ? newSize : 0;
    }

    return {
      level,
      score: Math.min(100, riskScore),
      recommendations,
      canOpenNewPosition,
      maxPositionSize,
      warnings
    };
  }

  // Calculate Kelly Criterion for optimal position sizing
  calculateKellyCriterion(winRate: number, avgWin: number, avgLoss: number): number {
    if (avgLoss === 0) return 0;

    const winLossRatio = avgWin / avgLoss;
    const kelly = (winRate * winLossRatio - (1 - winRate)) / winLossRatio;

    // Kelly can be negative, cap at 0
    return Math.max(0, kelly);
  }

  // Calculate position heat (percentage of account at risk)
  calculatePositionHeat(positions: Position[], accountBalance: number): number {
    const totalValue = positions.reduce((sum, pos) => {
      return sum + (pos.currentPrice * pos.size);
    }, 0);

    return (totalValue / accountBalance) * 100;
  }

  // Generate risk report
  generateRiskReport(positions: Position[], accountBalance: number): {
    summary: string;
    metrics: RiskMetrics;
    assessment: RiskAssessment;
    positionDetails: {
      symbol: string;
      direction: string;
      entryPrice: number;
      currentPrice: number;
      unrealizedPnL: number;
      unrealizedPnLPercent: number;
      riskAmount: number;
      riskPercent: number;
      riskReward: number;
    }[];
  } {
    const metrics = this.assessPortfolioRisk(positions, accountBalance);
    const assessment = this.assessRisk(positions, accountBalance);

    const positionDetails: {
      symbol: string;
      direction: string;
      entryPrice: number;
      currentPrice: number;
      unrealizedPnL: number;
      unrealizedPnLPercent: number;
      riskAmount: number;
      riskPercent: number;
      riskReward: number;
    }[] = positions.map(pos => ({
      symbol: pos.symbol,
      direction: pos.direction,
      entryPrice: pos.entryPrice,
      currentPrice: pos.currentPrice,
      unrealizedPnL: pos.unrealizedPnL,
      unrealizedPnLPercent: pos.unrealizedPnLPercent,
      riskAmount: Math.abs(pos.entryPrice - pos.stopLoss) * pos.size,
      riskPercent: ((Math.abs(pos.entryPrice - pos.stopLoss) * pos.size) / accountBalance) * 100,
      riskReward: this.calculateRiskReward(pos.entryPrice, pos.stopLoss, pos.takeProfit)
    }));

    const summary = `Portfolio Risk Assessment - ${assessment.level.toUpperCase()} RISK\n` +
      `Total Positions: ${positions.length}\n` +
      `Total Risk: ${metrics.riskPercent.toFixed(2)}%\n` +
      `Total Exposure: ${metrics.totalExposure.toFixed(2)}\n` +
      `Leverage: ${metrics.leverage.toFixed(2)}x\n` +
      `Current Drawdown: ${metrics.currentDrawdown.toFixed(2)}%\n` +
      `Correlation Risk: ${metrics.correlationRisk.toFixed(2)}%`;

    return {
      summary,
      metrics,
      assessment,
      positionDetails
    };
  }
}

export const riskManager = new RiskManager();