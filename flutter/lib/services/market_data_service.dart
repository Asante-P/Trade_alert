import 'dart:convert';
import 'package:http/http.dart' as http;

class CandleData {
  final int time;
  final double open;
  final double high;
  final double low;
  final double close;

  CandleData({
    required this.time,
    required this.open,
    required this.high,
    required this.low,
    required this.close,
  });

  Map<String, dynamic> toJson() {
    return {
      'time': time,
      'open': open,
      'high': high,
      'low': low,
      'close': close,
    };
  }
}

class MarketDataService {
  // Use your local backend as a proxy to avoid CORS issues
  static const String _backendBaseUrl = 'http://localhost:3000';
  
  // For production, change this to your deployed backend URL
  static String get backendUrl {
    // You can also use environment variables or configuration
    return 'http://localhost:3000';
  }

  // Fetch data from your backend (which proxies to market APIs)
  Future<List<CandleData>> fetchData(String symbol, {int limit = 100}) async {
    try {
      final response = await http.get(
        Uri.parse('$backendUrl/api/market-data/$symbol?limit=$limit'),
      ).timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          print('Request timeout, using mock data');
          throw Exception('Request timeout');
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final List<dynamic> candlesJson = data['data'];
          return candlesJson.map((json) => CandleData(
            time: json['time'] as int,
            open: (json['open'] as num).toDouble(),
            high: (json['high'] as num).toDouble(),
            low: (json['low'] as num).toDouble(),
            close: (json['close'] as num).toDouble(),
          )).toList();
        }
      }
      
      print('Backend returned error, using mock data');
      return _generateMockData(symbol, limit);
    } catch (e) {
      print('Error fetching from backend: $e, using mock data');
      return _generateMockData(symbol, limit);
    }
  }

  // Generate mock data for testing (fallback)
  List<CandleData> _generateMockData(String symbol, int limit) {
    final now = DateTime.now();
    double price = _getBasePrice(symbol);
    final priceScale = _getPriceScale(symbol);
    final data = <CandleData>[];
    
    for (int i = 0; i < limit; i++) {
      final time = now.subtract(Duration(hours: limit - i));
      final seed = (now.millisecondsSinceEpoch + i * 1000);
      final change = ((seed % 20) - 10) / 10.0 * priceScale * 0.02;
      final open = price;
      final close = open + change;
      final high = (open + close) / 2 + ((seed % 5)) / 10.0 * priceScale * 0.01;
      final low = (open + close) / 2 - ((seed % 5)) / 10.0 * priceScale * 0.01;
      
      data.add(CandleData(
        time: time.millisecondsSinceEpoch ~/ 1000,
        open: open,
        high: high,
        low: low,
        close: close,
      ));
      
      price = close;
    }
    
    return data;
  }

  double _getBasePrice(String symbol) {
    switch (symbol.toUpperCase()) {
      case 'XAUUSD':
        return 2500.0;
      case 'EURUSD':
        return 1.0850;
      case 'NAS100':
        return 18500.0;
      case 'BTCUSD':
        return 65000.0;
      default:
        return 100.0;
    }
  }

  double _getPriceScale(String symbol) {
    switch (symbol.toUpperCase()) {
      case 'XAUUSD':
        return 10.0;
      case 'EURUSD':
        return 0.01;
      case 'BTCUSD':
        return 100.0;
      case 'NAS100':
        return 50.0;
      default:
        return 1.0;
    }
  }
}
