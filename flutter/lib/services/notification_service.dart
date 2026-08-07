import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:http/http.dart' as http;

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  FirebaseMessaging? _firebaseMessaging;
  
  String? _fcmToken;
  String? _serverUrl = 'http://localhost:3000'; // Change to your server URL
  bool _isWeb = kIsWeb;

  String? get fcmToken => _fcmToken;

  Future<void> initialize() async {
    // Skip Firebase and local notifications on web
    if (_isWeb) {
      print('Running on web - skipping notification service initialization');
      return;
    }

    // Initialize Firebase messaging only on mobile
    _firebaseMessaging = FirebaseMessaging.instance;

    // Initialize local notifications
    const AndroidInitializationSettings initializationSettingsAndroid =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const InitializationSettings initializationSettings =
        InitializationSettings(android: initializationSettingsAndroid);

    await _localNotifications.initialize(
      initializationSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        // Handle notification tap
      },
    );

    // Request permission
    await _requestPermission();

    // Get FCM token
    await _getFCMToken();

    // Configure Firebase messaging
    _configureFirebaseMessaging();
  }

  Future<void> _requestPermission() async {
    if (_firebaseMessaging == null) return;
    
    NotificationSettings settings = await _firebaseMessaging!.requestPermission(
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
      sound: true,
    );

    if (kDebugMode) {
      print('Notification permission granted: ${settings.authorizationStatus}');
    }
  }

  Future<void> _getFCMToken() async {
    if (_firebaseMessaging == null) return;
    
    _fcmToken = await _firebaseMessaging!.getToken();
    if (_fcmToken != null) {
      if (kDebugMode) {
        print('FCM Token: $_fcmToken');
      }
      await _registerTokenWithServer();
    }

    _firebaseMessaging!.onTokenRefresh.listen((token) {
      _fcmToken = token;
      if (kDebugMode) {
        print('FCM Token refreshed: $token');
      }
      _registerTokenWithServer();
    });
  }

  Future<void> _registerTokenWithServer() async {
    if (_fcmToken == null) return;

    try {
      final response = await http.post(
        Uri.parse('$_serverUrl/register-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': _fcmToken}),
      );

      if (kDebugMode) {
        print('Token registration response: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error registering token: $e');
      }
    }
  }

  void _configureFirebaseMessaging() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (kDebugMode) {
        print('Received message in foreground: ${message.notification?.title}');
      }
      _showLocalNotification(message);
    });

    // Handle message when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) {
        print('Message opened from background: ${message.notification?.title}');
      }
    });
  }

  Future<void> _showLocalNotification(RemoteMessage message) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'trade_alert_channel',
      'Trade Alerts',
      channelDescription: 'Notifications for trading alerts',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
    );

    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);

    await _localNotifications.show(
      message.notification?.hashCode ?? 0,
      message.notification?.title ?? 'Trade Alert',
      message.notification?.body ?? '',
      platformChannelSpecifics,
      payload: jsonEncode(message.data),
    );
  }

  void setServerUrl(String url) {
    _serverUrl = url;
    _registerTokenWithServer();
  }
}
