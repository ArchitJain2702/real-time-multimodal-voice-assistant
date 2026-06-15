import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/foundation.dart';

import 'package:record/record.dart';

import 'vad_detector.dart';

/// Events emitted by [AudioController] that the rest of the app reacts to.
class VadEvent {
  final double rms;
  final bool isSpeech;
  const VadEvent({required this.rms, required this.isSpeech});
}

class AudioController {
  final VadDetector _vad = VadDetector();
  final AudioRecorder _recorder = AudioRecorder();

  // Broadcast streams for downstream consumers
  final StreamController<Uint8List> _audioStreamCtrl =
      StreamController<Uint8List>.broadcast();
  final StreamController<VadEvent> _vadStreamCtrl =
      StreamController<VadEvent>.broadcast();

  Stream<Uint8List> get audioChunks => _audioStreamCtrl.stream;
  Stream<VadEvent> get vadEvents => _vadStreamCtrl.stream;

  bool get isAssistantSpeaking => _vad.isAssistantSpeaking;
  set isAssistantSpeaking(bool value) => _vad.isAssistantSpeaking = value;

  // Trace counters
  int _chunkCount = 0;
  int _totalBytes = 0;

  /// Start mic capture and process audio on the main thread.
  Future<void> startCapture() async {
    _chunkCount = 0;
    _totalBytes = 0;
    // ignore: avoid_print
    print('[TRACE][AudioController] startCapture() called. kIsWeb=$kIsWeb');

    final stream = await _recorder.startStream(const RecordConfig(
      encoder: AudioEncoder.pcm16bits,
      sampleRate: 16000,
      numChannels: 1,
    ));

    // ignore: avoid_print
    print('[TRACE][AudioController] Recorder stream acquired, listening for chunks.');
    stream.listen(_onRawChunk);
  }

  Future<void> stopCapture() async {
    // ignore: avoid_print
    print('[TRACE][AudioController] stopCapture() called. '
        'Total chunks: $_chunkCount, total bytes: $_totalBytes');
    await _recorder.stop();
  }

  Future<void> dispose() async {
    await stopCapture();
    await _audioStreamCtrl.close();
    await _vadStreamCtrl.close();
    _recorder.dispose();
  }

  void _onRawChunk(Uint8List pcm) {
    _chunkCount++;
    _totalBytes += pcm.length;

    // Log every chunk so we can confirm the mic is producing data.
    // ignore: avoid_print
    print('[TRACE][AudioController] chunk #$_chunkCount '
        'size=${pcm.length}b total=${_totalBytes}b');

    // 1. Forward raw audio to websocket
    _audioStreamCtrl.add(pcm);

    // 2. Bypass RMS VAD on Web – browser outputs compressed WebM frames,
    //    so raw byte RMS is meaningless.
    if (kIsWeb) {
      _vadStreamCtrl.add(const VadEvent(rms: 0, isSpeech: false));
      return;
    }

    // 3. Compute RMS on native platforms and trigger VAD
    final double rms = VadDetector.computeRMS(pcm);
    final bool isSpeech = _vad.processFrame(rms);
    _vadStreamCtrl.add(VadEvent(rms: rms, isSpeech: isSpeech));
  }
}
