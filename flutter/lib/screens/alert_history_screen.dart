import 'package:flutter/material.dart';
import '../models/alert.dart';

class AlertHistoryScreen extends StatelessWidget {
  final List<Alert> alerts;

  const AlertHistoryScreen({super.key, required this.alerts});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alert History'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: alerts.isEmpty
          ? const Center(
              child: Text('No alerts in history'),
            )
          : ListView.builder(
              padding: const EdgeInsets.all(8),
              itemCount: alerts.length,
              itemBuilder: (context, index) {
                return _buildAlertCard(alerts[index]);
              },
            ),
    );
  }

  Widget _buildAlertCard(Alert alert) {
    Color typeColor;
    IconData typeIcon;

    switch (alert.type.toUpperCase()) {
      case 'BOS':
      case 'SWEEP BUY':
      case 'S&D ZONE BUY':
      case '3RD TOUCH TRENDLINE BUY':
        typeColor = Colors.green;
        typeIcon = Icons.trending_up;
        break;
      case 'SWEEP SELL':
      case 'S&D ZONE SELL':
      case '3RD TOUCH TRENDLINE SELL':
        typeColor = Colors.red;
        typeIcon = Icons.trending_down;
        break;
      default:
        typeColor = Colors.blue;
        typeIcon = Icons.notifications;
    }

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: typeColor.withOpacity(0.2),
          child: Icon(typeIcon, color: typeColor),
        ),
        title: Text(
          alert.type,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          _formatTimestamp(alert.timestamp),
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildDetailRow('Symbol', alert.symbol),
                _buildDetailRow('Price', alert.price.toStringAsFixed(2)),
                _buildDetailRow('Timeframe', alert.timeframe),
                if (alert.message.isNotEmpty)
                  _buildDetailRow('Message', alert.message),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    final dateTime = DateTime.parse(timestamp);
    return '${dateTime.day}/${dateTime.month}/${dateTime.year} ${dateTime.hour}:${dateTime.minute.toString().padLeft(2, '0')}';
  }
}
