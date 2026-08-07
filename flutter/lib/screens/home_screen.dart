import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/alert.dart';
import '../services/notification_service.dart';
import 'alert_history_screen.dart';
import 'settings_screen.dart';
import 'chart_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final NotificationService _notificationService = NotificationService();
  List<Alert> _alerts = [];
  bool _isLoading = true;
  String _serverUrl = 'http://localhost:3000';
  String _connectionStatus = 'Disconnected';

  @override
  void initState() {
    super.initState();
    _loadSettings();
    _checkServerConnection();
    _fetchAlerts();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverUrl = prefs.getString('server_url') ?? 'http://localhost:3000';
    });
    _notificationService.setServerUrl(_serverUrl);
  }

  Future<void> _checkServerConnection() async {
    try {
      final response = await http.get(Uri.parse('$_serverUrl/health'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _connectionStatus = 'Connected (${data['registeredTokens']} devices)';
        });
      } else {
        setState(() {
          _connectionStatus = 'Server Error';
        });
      }
    } catch (e) {
      setState(() {
        _connectionStatus = 'Disconnected';
      });
    }
  }

  Future<void> _fetchAlerts() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final response = await http.get(Uri.parse('$_serverUrl/alerts'));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> alertsJson = data['alerts'];
        setState(() {
          _alerts = alertsJson.map((json) => Alert.fromJson(json)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Trade Alert'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
        actions: [
          IconButton(
            icon: const Icon(Icons.show_chart),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const ChartScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              _checkServerConnection();
              _fetchAlerts();
            },
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const SettingsScreen()),
              ).then((_) {
                _loadSettings();
                _checkServerConnection();
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          _buildStatusCard(),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _alerts.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                            SizedBox(height: 16),
                            Text(
                              'No alerts yet',
                              style: TextStyle(fontSize: 18, color: Colors.grey),
                            ),
                            SizedBox(height: 8),
                            Text(
                              'Configure TradingView webhook to receive alerts',
                              style: TextStyle(fontSize: 14, color: Colors.grey),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(8),
                        itemCount: _alerts.length,
                        itemBuilder: (context, index) {
                          return _buildAlertCard(_alerts[index]);
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => AlertHistoryScreen(alerts: _alerts),
            ),
          );
        },
        icon: const Icon(Icons.history),
        label: const Text('View All Alerts'),
      ),
    );
  }

  Widget _buildStatusCard() {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _connectionStatus.contains('Connected')
                      ? Icons.check_circle
                      : Icons.error,
                  color: _connectionStatus.contains('Connected')
                      ? Colors.green
                      : Colors.red,
                ),
                const SizedBox(width: 8),
                Text(
                  'Server Status',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _connectionStatus,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'FCM Token: ${_notificationService.fcmToken?.substring(0, 20)}...',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.grey,
                  ),
            ),
          ],
        ),
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
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: typeColor.withOpacity(0.2),
          child: Icon(typeIcon, color: typeColor),
        ),
        title: Text(
          alert.type,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(alert.symbol),
            Text(
              _formatTimestamp(alert.timestamp),
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              alert.price.toStringAsFixed(2),
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: typeColor,
              ),
            ),
            Text(
              alert.timeframe,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }

  String _formatTimestamp(String timestamp) {
    final dateTime = DateTime.parse(timestamp);
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} min ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} hours ago';
    } else {
      return '${difference.inDays} days ago';
    }
  }
}
