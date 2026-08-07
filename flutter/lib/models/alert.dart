class Alert {
  final int id;
  final String timestamp;
  final String type;
  final double price;
  final String symbol;
  final String timeframe;
  final String message;

  Alert({
    required this.id,
    required this.timestamp,
    required this.type,
    required this.price,
    required this.symbol,
    required this.timeframe,
    required this.message,
  });

  factory Alert.fromJson(Map<String, dynamic> json) {
    return Alert(
      id: json['id'] ?? 0,
      timestamp: json['timestamp'] ?? DateTime.now().toIso8601String(),
      type: json['type'] ?? 'UNKNOWN',
      price: (json['price'] is num ? (json['price'] as num).toDouble() : 0.0),
      symbol: json['symbol'] ?? 'N/A',
      timeframe: json['timeframe'] ?? 'N/A',
      message: json['message'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'timestamp': timestamp,
      'type': type,
      'price': price,
      'symbol': symbol,
      'timeframe': timeframe,
      'message': message,
    };
  }
}
