import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';

import 'playback_stub.dart'
    if (dart.library.js) 'playback_web.dart' as web_player;

class MyCustomSource extends StreamAudioSource {
  final List<int> _bytes;
  MyCustomSource(this._bytes);

  @override
  Future<StreamAudioResponse> request([int? start, int? end]) async {
    start ??= 0;
    end ??= _bytes.length;
    return StreamAudioResponse(
      sourceLength: _bytes.length,
      contentLength: end - start,
      offset: start,
      stream: Stream.value(_bytes.sublist(start, end)),
      contentType: 'audio/wav',
    );
  }
}

class PlaybackController {
  final AudioPlayer _player = AudioPlayer();
  final List<int> _audioBuffer = [];
  bool _isPlaying = false;
  
  // Stream to notify when playback finishes
  final StreamController<void> _playbackFinishedCtrl = StreamController.broadcast();
  Stream<void> get playbackFinished => _playbackFinishedCtrl.stream;

  PlaybackController() {
    _player.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        _isPlaying = false;
        _playbackFinishedCtrl.add(null);
        _playNext();
      }
    });
  }

  /// Called by [SessionService] when a binary chunk arrives from WebSocket
  void enqueueChunk(Uint8List wavChunk) {
    if (kIsWeb) {
      if (wavChunk.length > 44) {
        // Strip 44-byte WAV header and send raw Int16 PCM to the browser's Web Audio API context
        final pcmBytes = wavChunk.sublist(44);
        web_player.playWebPcmChunk(pcmBytes);
      }
      return;
    }
    _audioBuffer.addAll(wavChunk);
    if (!_isPlaying) {
      _playNext();
    }
  }

  void _playNext() async {
    if (_audioBuffer.isEmpty) return;
    
    _isPlaying = true;
    
    // Copy the current buffer and clear it for the next chunks
    final chunkToPlay = List<int>.from(_audioBuffer);
    _audioBuffer.clear();

    try {
      final source = MyCustomSource(chunkToPlay);
      await _player.setAudioSource(source);
      await _player.play();
    } catch (e) {
      // Ignored for playback errors
      _isPlaying = false;
      _playNext();
    }
  }

  Future<void> stop() async {
    if (kIsWeb) {
      web_player.stopWebPcmPlayer();
      return;
    }
    _audioBuffer.clear();
    await _player.stop();
    _isPlaying = false;
  }

  Future<void> dispose() async {
    await stop();
    await _player.dispose();
    await _playbackFinishedCtrl.close();
  }
}
