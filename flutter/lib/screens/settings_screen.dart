import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _serverUrlController = TextEditingController();
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _serverUrlController.text = prefs.getString('server_url') ?? 'http://localhost:3000';
      _isLoading = false;
    });
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', _serverUrlController.text);
    
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved')),
    );
    
    Navigator.pop(context);
  }

  @override
  void dispose() {
    _serverUrlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Theme.of(context).colorScheme.inversePrimary,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Server Configuration',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _serverUrlController,
              decoration: const InputDecoration(
                labelText: 'Server URL',
                hintText: 'http://localhost:3000',
                border: OutlineInputBorder(),
                helperText: 'URL of the backend server receiving TradingView webhooks',
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'TradingView Webhook Setup',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'To configure TradingView alerts:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('1. Open your TradingView chart'),
                    Text('2. Click on "Alert" button'),
                    Text('3. Set condition to your indicator signal'),
                    Text('4. In "Webhook URL", enter:'),
                    SizedBox(height: 4),
                    Text(
                      'http://YOUR_SERVER_IP:3000/webhook',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        backgroundColor: Color(0xFFEEEEEE),
                      ),
                    ),
                    SizedBox(height: 8),
                    Text('5. In the webhook payload, use JSON format:'),
                    SizedBox(height: 4),
                    Text(
                      '{"type": "{{strategy.order.action}}", "price": {{close}}, "symbol": "{{ticker}}", "timeframe": "{{interval}}", "message": "{{strategy.order.comment}}"}',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 11,
                        backgroundColor: Color(0xFFEEEEEE),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            const Text(
              'For Pine Script Alerts',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Modify your Pine Script alert() calls to include webhook data:',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 8),
                    Text('Example for BOS alert:'),
                    SizedBox(height: 4),
                    Text(
                      'alert("BOS: " + str.tostring(close), alert.freq_once_per_bar_close)',
                      style: TextStyle(
                        fontFamily: 'monospace',
                        backgroundColor: Color(0xFFEEEEEE),
                      ),
                    ),
                    SizedBox(height: 8),
                    Text('Then in TradingView Alert dialog:'),
                    Text('- Condition: Your alert condition'),
                    Text('- Webhook URL: http://YOUR_SERVER:3000/webhook'),
                    Text('- Message: {"type": "BOS", "price": {{close}}, "symbol": "{{ticker}}"}'),
                  ],
                ),
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveSettings,
                child: const Text('Save Settings'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
