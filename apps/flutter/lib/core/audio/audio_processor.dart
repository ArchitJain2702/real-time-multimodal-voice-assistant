import 'dart:isolate';
import 'dart:typed_data';
import 'vad_detector.dart';

/// Message sent from the background audio isolate back to the main thread.
class AudioProcessorResult {
  final Uint8List pcm;
  final double rms;

  AudioProcessorResult({required this.pcm, required this.rms});
}

class AudioProcessor {
  /// The entrypoint for our spawned background isolate.
  static void entryPoint(SendPort mainSendPort) {
    // 1. Establish the communication channel for incoming commands/data from main thread
    final receivePort = ReceivePort();
    
    // 2. Send the sendPort back to the main thread so it knows where to write
    mainSendPort.send(receivePort.sendPort);

    // 3. Listen to incoming raw PCM audio chunks (Uint8List)
    receivePort.listen((message) {
      if (message is Uint8List) {
        try {
          // Compute RMS in background thread (CPU-intensive loop)
          final double rms = VadDetector.computeRMS(message);
          
          // Send result back to main isolate
          mainSendPort.send(AudioProcessorResult(pcm: message, rms: rms));
        } catch (e) {
          // Log or handle error in isolate
        }
      } else if (message == 'close') {
        receivePort.close();
      }
    });
  }
}
