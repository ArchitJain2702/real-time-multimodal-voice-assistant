import 'dart:typed_data';
import 'dart:js' as js;

void initWebPcmPlayer(int sampleRate) {
  js.context.callMethod('initPcmPlayer', [sampleRate]);
}

void playWebPcmChunk(Uint8List chunk) {
  js.context.callMethod('playPcmChunk', [chunk]);
}

void stopWebPcmPlayer() {
  js.context.callMethod('stopPcmPlayer');
}
