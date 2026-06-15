import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../audio/audio_controller.dart';
import '../audio/playback_controller.dart';
import '../ws/ws_manager.dart';
import 'session_constants.dart';
import 'session_state.dart';

final sessionServiceProvider =
    StateNotifierProvider<SessionService, VoiceSessionState>(
  (ref) => SessionService(),
);

class SessionService extends StateNotifier<VoiceSessionState> {
  SessionService() : super(const VoiceSessionState());

  final AudioController _audio = AudioController();
  final PlaybackController _playback = PlaybackController();
  WsManager? _ws;
  final Uuid _uuid = const Uuid();

  String _sessionId = '';
  String _token = '';
  String _currentTurnId = '';
  bool _isCapturing = false; // Guard against double startListening() calls

  // Subscriptions to be cancelled on dispose
  StreamSubscription? _audioSub;
  StreamSubscription? _vadSub;
  StreamSubscription? _jsonSub;
  StreamSubscription? _binarySub;

  Future<void> _cleanup() async {
    await _audioSub?.cancel();
    _audioSub = null;
    await _vadSub?.cancel();
    _vadSub = null;
    await _jsonSub?.cancel();
    _jsonSub = null;
    await _binarySub?.cancel();
    _binarySub = null;
    if (_ws != null) {
      await _ws!.dispose();
      _ws = null;
    }
  }

  Future<void> initialize() async {
    if (state.status == VoiceSessionStatus.connecting ||
        state.status == VoiceSessionStatus.idle ||
        state.status == VoiceSessionStatus.listening ||
        state.status == VoiceSessionStatus.transcribing ||
        state.status == VoiceSessionStatus.generating ||
        state.status == VoiceSessionStatus.speaking ||
        state.status == VoiceSessionStatus.interrupted) {
      // ignore: avoid_print
      print('[TRACE][SessionService] initialize() called but already active, status: ${state.status} — IGNORED');
      return;
    }

    await _cleanup();

    _sessionId = _uuid.v4();
    _currentTurnId = _uuid.v4();
    // In a real app, fetch a JWT from the REST endpoint first.
    _token = 'dev-placeholder-token';

    _ws = WsManager(
      serverUrl: kWsUrl,
      getToken: () => _token,
      getSessionId: () => _sessionId,
    );

    state = state.copyWith(status: VoiceSessionStatus.connecting);
    await _ws!.connect();

    _listenToWsEvents();
  }

  void _listenToWsEvents() {
    if (_ws != null) {
      _jsonSub = _ws!.jsonEvents.listen(_handleJsonEvent);
      _binarySub = _ws!.binaryEvents.listen(_handleBinaryAudio);
    }
  }

  void _handleJsonEvent(Map<String, dynamic> event) {
    final String type = event['type'] as String? ?? '';

    switch (type) {
      case 'auth_ok':
        state = state.copyWith(status: VoiceSessionStatus.idle);
        break;

      case 'auth_error':
        state = state.copyWith(
          status: VoiceSessionStatus.error,
          errorMessage: event['message'] as String?,
        );
        break;

      case 'transcript_partial':
        state = state.copyWith(
          status: VoiceSessionStatus.listening,
          partialTranscript: event['text'] as String? ?? '',
        );
        break;

      case 'transcript_final':
        final text = event['text'] as String? ?? '';
        _currentTurnId = event['turnId'] as String? ?? _currentTurnId;
        final turn = ConversationTurn(
          turnId: _currentTurnId,
          role: 'user',
          text: text,
        );
        state = state.copyWith(
          status: VoiceSessionStatus.transcribing,
          partialTranscript: '',
          turns: [...state.turns, turn],
        );
        break;

      case 'llm_token':
        state = state.copyWith(
          status: VoiceSessionStatus.generating,
          currentAssistantTokens:
              state.currentAssistantTokens + (event['token'] as String? ?? ''),
        );
        break;

      case 'tts_clause_start':
        state = state.copyWith(status: VoiceSessionStatus.speaking);
        _audio.isAssistantSpeaking = true;
        break;

      case 'turn_complete':
        final latency = event['latency'] as Map<String, dynamic>?;
        final int e2e = (latency?['e2eMs'] as num?)?.toInt() ?? 0;
        final assistantTurn = ConversationTurn(
          turnId: _currentTurnId,
          role: 'assistant',
          text: state.currentAssistantTokens,
          e2eMs: e2e,
        );
        state = state.copyWith(
          status: VoiceSessionStatus.idle,
          currentAssistantTokens: '',
          turns: [...state.turns, assistantTurn],
          lastE2eMs: e2e,
        );
        _audio.isAssistantSpeaking = false;
        _currentTurnId = _uuid.v4();
        break;

      case 'interrupt_ack':
        state = state.copyWith(
          status: VoiceSessionStatus.idle,
          currentAssistantTokens: '',
        );
        _audio.isAssistantSpeaking = false;
        break;

      case 'error':
        state = state.copyWith(
          status: VoiceSessionStatus.error,
          errorMessage: event['message'] as String?,
        );
        break;
    }
  }

  void _handleBinaryAudio(Uint8List bytes) {
    if (bytes.length < 4) return;
    // Strip 4-byte sequence header and forward audio to playback
    final audioData = bytes.sublist(4);
    _playback.enqueueChunk(audioData);
    if (state.status == VoiceSessionStatus.transcribing ||
        state.status == VoiceSessionStatus.generating) {
      state = state.copyWith(status: VoiceSessionStatus.speaking);
      _audio.isAssistantSpeaking = true;
    }
  }

  Future<void> startListening() async {
    if (state.status != VoiceSessionStatus.idle) {
      // ignore: avoid_print
      print('[TRACE][SessionService] startListening() called but status=${state.status} — IGNORED');
      return;
    }
    if (_isCapturing) {
      // ignore: avoid_print
      print('[TRACE][SessionService] startListening() called but _isCapturing=true — DOUBLE CALL BLOCKED');
      return;
    }
    _isCapturing = true;
    state = state.copyWith(status: VoiceSessionStatus.listening);
    _currentTurnId = _uuid.v4();
    // ignore: avoid_print
    print('[TRACE][SessionService] startListening() — stopping playback, starting mic capture...');

    await _playback.stop(); // stop any ongoing assistant playback
    await _audio.startCapture();
    // ignore: avoid_print
    print('[TRACE][SessionService] startListening() — mic capture started, subscribing to audioChunks.');

    int _audioFramesSent = 0;

    // Forward audio chunks over WebSocket
    _audioSub = _audio.audioChunks.listen((pcm) {
      _audioFramesSent++;
      // ignore: avoid_print
      print('[TRACE][SessionService] audioChunks event #$_audioFramesSent size=${pcm.length}b — calling sendAudio');
      _ws?.sendAudio(pcm);
    });
    // ignore: avoid_print
    print('[TRACE][SessionService] audioChunks subscription active: ${_audioSub != null}');

    // VAD-triggered interrupt detection
    _vadSub = _audio.vadEvents.listen((vadEvent) {
      if (vadEvent.isSpeech &&
          state.status == VoiceSessionStatus.speaking) {
        // ignore: avoid_print
        print('[TRACE][SessionService] VAD speech detected while speaking — triggering interrupt');
        _triggerInterrupt();
      }
    });
  }

  Future<void> stopListening() async {
    if (!_isCapturing) return;
    _isCapturing = false;
    await _audioSub?.cancel();
    _audioSub = null;
    await _vadSub?.cancel();
    _vadSub = null;
    await _audio.stopCapture();

    // Send speech_completed message to the server
    _ws?.sendJson({
      'type': 'speech_completed',
      'turnId': _currentTurnId,
    });

    if (state.status == VoiceSessionStatus.listening) {
      state = state.copyWith(status: VoiceSessionStatus.transcribing);
    }
  }

  void _triggerInterrupt() {
    _audio.isAssistantSpeaking = false;
    _playback.stop();
    _ws?.sendJson({
      'type': 'interrupt',
      'turnId': _currentTurnId,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    state = state.copyWith(
      status: VoiceSessionStatus.interrupted,
      currentAssistantTokens: '',
    );
  }

  @override
  Future<void> dispose() async {
    await _cleanup();
    await _audio.dispose();
    await _playback.dispose();
    super.dispose();
  }
}
