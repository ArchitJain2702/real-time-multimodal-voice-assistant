import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:web_socket_channel/status.dart' as status;

class WsManager {
  final String serverUrl;
  final String Function() getToken;
  final String Function() getSessionId;

  WebSocketChannel? _channel;
  bool _isConnected = false;
  bool _isIntentionalClose = false;

  final StreamController<Map<String, dynamic>> _jsonEventsCtrl =
      StreamController<Map<String, dynamic>>.broadcast();
  final StreamController<Uint8List> _binaryEventsCtrl =
      StreamController<Uint8List>.broadcast();

  Stream<Map<String, dynamic>> get jsonEvents => _jsonEventsCtrl.stream;
  Stream<Uint8List> get binaryEvents => _binaryEventsCtrl.stream;

  // Trace counters
  int _framesSent = 0;
  int _bytesSent = 0;

  WsManager({
    required this.serverUrl,
    required this.getToken,
    required this.getSessionId,
  });

  /// Connect to the WebSocket server.
  Future<void> connect() async {
    if (_isConnected) return;
    _isIntentionalClose = false;

    // ignore: avoid_print
    print('[TRACE][WsManager] Connecting to $serverUrl');

    try {
      final uri = Uri.parse(serverUrl);
      _channel = WebSocketChannel.connect(uri);

      _channel!.stream.listen(
        _onMessage,
        onError: _onError,
        onDone: _onDone,
        cancelOnError: false,
      );

      _isConnected = true;
      // ignore: avoid_print
      print('[TRACE][WsManager] WebSocket connected. Authenticating...');
      _authenticate();
    } catch (e) {
      // ignore: avoid_print
      print('[TRACE][WsManager] Connection failed: $e');
      _scheduleReconnect();
    }
  }

  void _authenticate() {
    sendJson({
      'type': 'auth',
      'token': getToken(),
      'sessionId': getSessionId(),
      'clientVersion': '1.0.0',
    });
  }

  void _onMessage(dynamic message) {
    if (message is String) {
      try {
        final payload = jsonDecode(message) as Map<String, dynamic>;
        // ignore: avoid_print
        print('[TRACE][WsManager] JSON message received: ${payload['type']}');
        _jsonEventsCtrl.add(payload);
      } catch (e) {
        // Ignored
      }
    } else if (message is Uint8List) {
      // ignore: avoid_print
      print('[TRACE][WsManager] Binary message received: ${message.length}b');
      _binaryEventsCtrl.add(message);
    } else if (message is List<int>) {
      // ignore: avoid_print
      print('[TRACE][WsManager] Binary message received (List<int>): ${message.length}b');
      _binaryEventsCtrl.add(Uint8List.fromList(message));
    }
  }

  void _onError(Object error) {
    // ignore: avoid_print
    print('[TRACE][WsManager] WebSocket error: $error');
    _isConnected = false;
  }

  void _onDone() {
    // ignore: avoid_print
    print('[TRACE][WsManager] WebSocket closed. intentional=$_isIntentionalClose '
        'frames_sent=$_framesSent bytes_sent=$_bytesSent');
    _isConnected = false;
    if (!_isIntentionalClose) {
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_isIntentionalClose) return;
    // ignore: avoid_print
    print('[TRACE][WsManager] Scheduling reconnect in 2s...');
    Future.delayed(const Duration(seconds: 2), () {
      connect();
    });
  }

  /// Send a JSON event over the websocket.
  void sendJson(Map<String, dynamic> payload) {
    if (!_isConnected || _channel == null) {
      // ignore: avoid_print
      print('[TRACE][WsManager] sendJson DROPPED (not connected): ${payload['type']}');
      return;
    }
    _channel!.sink.add(jsonEncode(payload));
  }

  /// Send raw PCM bytes with a 4-byte LE uint32 sequence number prefix.
  int _outboundSeq = 0;
  void sendAudio(Uint8List pcm) {
    if (!_isConnected || _channel == null) {
      // ignore: avoid_print
      print('[TRACE][WsManager] sendAudio DROPPED (not connected). pcm=${pcm.length}b');
      return;
    }

    final frame = ByteData(4);
    frame.setUint32(0, _outboundSeq++, Endian.little);

    // Concatenate the 4-byte sequence header with the PCM payload
    final bytes = Uint8List.fromList([
      ...frame.buffer.asUint8List(),
      ...pcm,
    ]);

    _framesSent++;
    _bytesSent += bytes.length;

    // ignore: avoid_print
    print('[TRACE][WsManager] sendAudio frame#${_outboundSeq - 1} '
        'frameBytes=${bytes.length}b (4B header + ${pcm.length}B pcm) '
        'totalFrames=$_framesSent totalBytes=$_bytesSent');

    _channel!.sink.add(bytes);
  }

  /// Gracefully close the connection without triggering reconnect.
  Future<void> close() async {
    _isIntentionalClose = true;
    if (_isConnected && _channel != null) {
      await _channel!.sink.close(status.normalClosure);
    }
    _isConnected = false;
    _channel = null;
  }

  Future<void> dispose() async {
    await close();
    await _jsonEventsCtrl.close();
    await _binaryEventsCtrl.close();
  }
}
