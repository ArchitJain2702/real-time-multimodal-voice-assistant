import 'dart:typed_data';
void main() {
  final a = Uint8List.fromList([1, 2]);
  final b = Uint8List.fromList([3, 4]);
  final c = Uint8List.fromList(a + b);
  print(c);
}
