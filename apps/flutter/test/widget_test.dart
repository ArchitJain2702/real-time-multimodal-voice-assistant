import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:voice_assistant_flutter/app.dart';

void main() {
  testWidgets('Smoke test for VoiceAssistantApp', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: VoiceAssistantApp(),
      ),
    );

    // Verify that the app launches successfully by finding the root MaterialApp
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
