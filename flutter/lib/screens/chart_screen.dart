import 'dart:async';
import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'dart:convert' as convert;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/market_data_service.dart';

// Web-specific imports
import 'dart:html' as html;
import 'dart:ui_web' as ui_web;

class ChartScreen extends StatefulWidget {
  const ChartScreen({super.key, this.symbol = 'XAUUSD'});

  final String symbol;

  @override
  State<ChartScreen> createState() => _ChartScreenState();
}

class _ChartScreenState extends State<ChartScreen> {
  // WebView controller for mobile
  WebViewController? _controller;
  
  // IFrame element for web
  final html.IFrameElement _iframeElement = html.IFrameElement();
  static const String _viewType = 'iframe-chart-view';
  
  Timer? _liveFeedTimer;
  final MarketDataService _marketDataService = MarketDataService();
  final Random _rng = Random();
  
  List<CandleData>? _candleData;
  bool _isLoading = true;
  String _selectedSymbol = 'XAUUSD';
  int _lastTime = DateTime.now().millisecondsSinceEpoch ~/ 1000;

  @override
  void initState() {
    super.initState();
    _selectedSymbol = widget.symbol;
    
    if (kIsWeb) {
      _initWebChart();
    } else {
      _initMobileChart();
    }
  }

  void _initMobileChart() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF131722))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            _loadInitialCandles();
            _startLiveFeed();
          },
        ),
      )
      ..loadFlutterAsset('assets/chart.html');
  }

  void _initWebChart() {
    _iframeElement.style.width = '100%';
    _iframeElement.style.height = '100%';
    _iframeElement.style.border = 'none';
    _iframeElement.style.overflow = 'hidden';
    
    // Register the iframe element
    ui_web.platformViewRegistry.registerViewFactory(
      _viewType,
      (int viewId) => _iframeElement,
    );
    
    // Load data and chart
    _loadData();
    _startLiveFeed();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final candles = await _marketDataService.fetchData(_selectedSymbol, limit: 200);
      
      if (candles.isNotEmpty) {
        _candleData = candles;
        _lastTime = candles.last.time;
        print('Loaded ${candles.length} candles from market data');
      } else {
        print('No candles from market data, using mock data');
        _candleData = _generateMockCandles();
      }
    } catch (e) {
      print('Error loading real data: $e, using mock data');
      // Generate mock data on error
      _candleData = _generateMockCandles();
    }

    print('Total candles to display: ${_candleData?.length}');
    
    setState(() {
      _isLoading = false;
    });
    
    if (kIsWeb) {
      _loadWebChartContent();
    }
  }

  Future<void> _loadInitialCandles() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final candles = await _marketDataService.fetchData(_selectedSymbol, limit: 200);
      
      if (candles.isNotEmpty) {
        _candleData = candles;
        _lastTime = candles.last.time;
        
        // Convert to JSON format for JavaScript
        final candleJson = candles.map((candle) => candle.toJson()).toList();
        _controller?.runJavaScript('setCandles(${jsonEncode(jsonEncode(candleJson))});');
      } else {
        // Use mock data if no real data available
        _loadMockCandles();
      }
    } catch (e) {
      print('Error loading real data: $e');
      // Fallback to mock data
      _loadMockCandles();
    }

    setState(() {
      _isLoading = false;
    });
  }

  void _loadMockCandles() {
    final candles = <Map<String, dynamic>>[];
    var time = _lastTime - 200 * 60;
    var close = _getBasePrice(_selectedSymbol);
    final priceScale = _getPriceScale(_selectedSymbol);
    
    for (var i = 0; i < 200; i++) {
      final open = close;
      // More realistic price movement
      final change = (_rng.nextDouble() - 0.5) * priceScale * 0.02;
      close = open + change;
      
      // Ensure high and low are properly set
      final upperWick = _rng.nextDouble() * priceScale * 0.01;
      final lowerWick = _rng.nextDouble() * priceScale * 0.01;
      final high = max(open, close) + upperWick;
      final low = min(open, close) - lowerWick;
      
      candles.add({
        'time': time,
        'open': open,
        'high': high,
        'low': low,
        'close': close,
      });
      time += 60;
    }
    
    _lastTime = time;
    _candleData = candles.map((data) => CandleData(
      time: data['time'] as int,
      open: data['open'] as double,
      high: data['high'] as double,
      low: data['low'] as double,
      close: data['close'] as double,
    )).toList();
    
    _controller?.runJavaScript('setCandles(${jsonEncode(jsonEncode(candles))});');
  }

  List<CandleData> _generateMockCandles() {
    final candles = <CandleData>[];
    final now = DateTime.now();
    var time = (now.millisecondsSinceEpoch ~/ 1000) - 200 * 60;
    var close = _getBasePrice(_selectedSymbol);
    final priceScale = _getPriceScale(_selectedSymbol);
    
    for (var i = 0; i < 200; i++) {
      final open = close;
      // More realistic price movement
      final change = (_rng.nextDouble() - 0.5) * priceScale * 0.02;
      close = open + change;
      
      // Ensure high and low are properly set
      final upperWick = _rng.nextDouble() * priceScale * 0.01;
      final lowerWick = _rng.nextDouble() * priceScale * 0.01;
      final high = max(open, close) + upperWick;
      final low = min(open, close) - lowerWick;
      
      candles.add(CandleData(
        time: time,
        open: open,
        high: high,
        low: low,
        close: close,
      ));
      time += 60;
    }
    
    _lastTime = time;
    print('Generated ${candles.length} mock candles');
    return candles;
  }

  void _loadWebChartContent() {
    final htmlContent = _getChartHtml();
    final blob = html.Blob([htmlContent], 'text/html');
    final url = html.Url.createObjectUrlFromBlob(blob);
    _iframeElement.src = url;
  }

  String _getChartHtml() {
    final candleData = _candleData;
    if (candleData == null || candleData.isEmpty) {
      return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>No Data</title>
</head>
<body>
    <div style="color: white; text-align: center; padding-top: 50px;">No data available</div>
</body>
</html>
      ''';
    }
    
    // Encode data as base64 to avoid any escaping issues
    final data = candleData.map((candle) => candle.toJson()).toList();
    final dataJson = jsonEncode(data);
    final dataBase64 = base64Encode(utf8.encode(dataJson));
    
    print('Embedding ${candleData.length} candles in HTML');
    print('Base64 length: ${dataBase64.length}');

    return '''
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$_selectedSymbol Chart</title>
    <script src="https://unpkg.com/lightweight-charts@4.1.3/dist/lightweight-charts.standalone.production.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background-color: #131722;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }
        #chart-container {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div id="chart-container"></div>
    <script>
        const container = document.getElementById('chart-container');
        
        const chart = LightweightCharts.createChart(container, {
            width: container.clientWidth,
            height: container.clientHeight,
            layout: {
                background: { color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#1e222d' },
                horzLines: { color: '#1e222d' },
            },
            crosshair: {
                mode: LightweightCharts.CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: true,
            borderUpColor: '#26a69a',
            borderDownColor: '#ef5350',
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
        });

        // Decode base64 data
        const dataBase64 = '$dataBase64';
        const dataJson = atob(dataBase64);
        const data = JSON.parse(dataJson);
        console.log('Base64 length:', dataBase64.length);
        console.log('Chart data length:', data.length);
        console.log('First candle:', data[0]);
        console.log('Last candle:', data[data.length - 1]);
        
        if (data.length > 0) {
            candlestickSeries.setData(data);
            chart.timeScale().fitContent();
        } else {
            console.error('No data to display');
        }

        new ResizeObserver(entries => {
            if (entries.length === 0 || entries[0].target !== container) {
                return;
            }
            const newRect = entries[0].contentRect;
            chart.applyOptions({ 
                width: newRect.width,
                height: newRect.height,
            });
        }).observe(container);
    </script>
</body>
</html>
    ''';
  }

  void _startLiveFeed() {
    _liveFeedTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      if (kIsWeb) {
        // On web, reload the entire chart with new data less frequently
        // Only reload if not currently loading
        if (!_isLoading) {
          await _loadData();
        }
      } else {
        // On mobile, use candle updates
        try {
          final newCandles = await _marketDataService.fetchData(_selectedSymbol, limit: 5);
          
          if (newCandles.isNotEmpty) {
            final latestCandle = newCandles.last;
            _updateChartWithCandle(latestCandle);
          } else {
            _updateWithMockCandle();
          }
        } catch (e) {
          _updateWithMockCandle();
        }
      }
    });
  }

  void _updateChartWithCandle(CandleData candle) {
    final candleJson = {
      'time': candle.time,
      'open': candle.open,
      'high': candle.high,
      'low': candle.low,
      'close': candle.close,
    };
    _controller?.runJavaScript('updateCandle(${jsonEncode(jsonEncode(candleJson))});');
    _lastTime = candle.time;
  }

  void _updateWithMockCandle() {
    if (_candleData == null || _candleData!.isEmpty) return;
    
    final lastClose = _candleData!.last.close;
    final priceScale = _getPriceScale(_selectedSymbol);
    final change = (_rng.nextDouble() - 0.5) * priceScale * 0.02;
    final close = lastClose + change;
    
    final upperWick = _rng.nextDouble() * priceScale * 0.01;
    final lowerWick = _rng.nextDouble() * priceScale * 0.01;
    
    final candle = {
      'time': _lastTime,
      'open': lastClose,
      'high': max(lastClose, close) + upperWick,
      'low': min(lastClose, close) - lowerWick,
      'close': close,
    };
    
    _controller?.runJavaScript('updateCandle(${jsonEncode(jsonEncode(candle))});');
    
    if (_rng.nextDouble() < 0.3) {
      _lastTime += 60;
    }
    
    _candleData!.add(CandleData(
      time: candle['time'] as int,
      open: candle['open'] as double,
      high: candle['high'] as double,
      low: candle['low'] as double,
      close: candle['close'] as double,
    ));
  }

  double _getBasePrice(String symbol) {
    switch (symbol.toUpperCase()) {
      case 'XAUUSD':
        return 2500.0;
      case 'EURUSD':
        return 1.0850;
      case 'BTCUSD':
        return 65000.0;
      case 'NAS100':
        return 18500.0;
      default:
        return 100.0;
    }
  }

  double _getPriceScale(String symbol) {
    switch (symbol.toUpperCase()) {
      case 'XAUUSD':
        return 10.0; // Gold moves in ~$10 increments
      case 'EURUSD':
        return 0.01; // Forex moves in pips
      case 'BTCUSD':
        return 100.0; // Bitcoin moves in ~$100 increments
      case 'NAS100':
        return 50.0; // Index moves in ~$50 increments
      default:
        return 1.0;
    }
  }

  void _changeSymbol(String newSymbol) {
    setState(() {
      _selectedSymbol = newSymbol;
      _isLoading = true;
      _candleData = null;
    });
    
    if (kIsWeb) {
      _loadData();
    } else {
      _controller?.runJavaScript('location.reload();');
      Future.delayed(const Duration(milliseconds: 500), () {
        _loadInitialCandles();
      });
    }
  }

  @override
  void dispose() {
    _liveFeedTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF131722),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E222D),
        title: Row(
          children: [
            DropdownButton<String>(
              value: _selectedSymbol,
              dropdownColor: const Color(0xFF1E222D),
              style: const TextStyle(color: Colors.white),
              items: const [
                DropdownMenuItem(value: 'XAUUSD', child: Text('XAUUSD')),
                DropdownMenuItem(value: 'BTCUSD', child: Text('BTCUSD')),
                DropdownMenuItem(value: 'EURUSD', child: Text('EURUSD')),
                DropdownMenuItem(value: 'NAS100', child: Text('NAS100')),
              ],
              onChanged: (value) {
                if (value != null) {
                  _changeSymbol(value);
                }
              },
            ),
            const SizedBox(width: 8),
            const Text('H1', style: TextStyle(color: Colors.white)),
          ],
        ),
        actions: [
          IconButton(
            icon: _isLoading 
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Color(0xFF089981),
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.refresh, color: Colors.white),
            onPressed: _isLoading ? null : () {
              if (kIsWeb) {
                _loadData();
              } else {
                _loadInitialCandles();
              }
            },
          ),
        ],
      ),
      body: _isLoading 
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF089981),
              ),
            )
          : kIsWeb 
              ? HtmlElementView(viewType: _viewType)
              : WebViewWidget(controller: _controller!),
    );
  }
}