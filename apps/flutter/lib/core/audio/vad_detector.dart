import 'dart:math' as math;
import 'dart:typed_data';

class VadDetector {
  final double baseThreshold; // e.g., 300.0 (depends on microphone scale)
  final double echoGainFactor; // e.g., 5.0 (as specified in §8.2)
  final int debounceFrames; // e.g., 3 frames (300ms)

  bool isAssistantSpeaking = false;
  int _consecutiveSpeechFrames = 0;

  VadDetector({
    this.baseThreshold = 250.0,
    this.echoGainFactor = 5.0,
    this.debounceFrames = 3,
  });

  /// Computes the Root Mean Square (RMS) of a 16-bit signed PCM audio chunk.
  static double computeRMS(Uint8List pcm) {
    if (pcm.isEmpty) return 0.0;
    
    double sum = 0.0;
    final int sampleCount = pcm.length ~/ 2;
    
    final ByteData byteData = ByteData.sublistView(pcm);
    for (int i = 0; i < sampleCount; i++) {
      // 16-bit little endian PCM
      final int sample = byteData.getInt16(i * 2, Endian.little);
      sum += sample * sample;
    }
    
    if (sampleCount == 0) return 0.0;
    return math.sqrt(sum / sampleCount);
  }

  /// Returns the current active threshold based on assistant speaker state.
  double getCurrentThreshold() {
    return isAssistantSpeaking ? (baseThreshold * echoGainFactor) : baseThreshold;
  }

  /// Analyzes a PCM chunk's RMS energy and returns true if speech is detected
  /// and confirmed by the debounce counter.
  bool processFrame(double rms) {
    final double activeThreshold = getCurrentThreshold();
    
    if (rms > activeThreshold) {
      _consecutiveSpeechFrames++;
      if (_consecutiveSpeechFrames >= debounceFrames) {
        return true;
      }
    } else {
      _consecutiveSpeechFrames = 0;
    }
    return false;
  }

  void resetDebounce() {
    _consecutiveSpeechFrames = 0;
  }
}
