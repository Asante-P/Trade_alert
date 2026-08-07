import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'screens/home_screen.dart';
import 'services/notification_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Only initialize Firebase on non-web platforms
  if (!kIsWeb) {
    try {
      await Firebase.initializeApp();
    } catch (e) {
      print('Firebase initialization error: $e');
    }
  }
  
  try {
    await NotificationService().initialize();
  } catch (e) {
    print('Notification service initialization error: $e');
  }
  
  runApp(const TradeAlertApp());
}

class TradeAlertApp extends StatelessWidget {
  const TradeAlertApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Trade Alert',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}
