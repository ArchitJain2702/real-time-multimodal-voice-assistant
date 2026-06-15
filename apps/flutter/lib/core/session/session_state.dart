import 'package:freezed_annotation/freezed_annotation.dart';

part 'session_state.freezed.dart';

/// Mirrors the server-side PipelineState enum (§3.3).
enum VoiceSessionStatus {
  disconnected,
  connecting,
  idle,
  listening,
  transcribing,
  generating,
  speaking,
  interrupted,
  error,
}

@freezed
class ConversationTurn with _$ConversationTurn {
  const factory ConversationTurn({
    required String turnId,
    required String role, // 'user' or 'assistant'
    required String text,
    @Default(false) bool interrupted,
    int? e2eMs,
  }) = _ConversationTurn;
}

@freezed
class VoiceSessionState with _$VoiceSessionState {
  const factory VoiceSessionState({
    @Default(VoiceSessionStatus.disconnected) VoiceSessionStatus status,
    @Default('') String partialTranscript,
    @Default('') String currentAssistantTokens,
    @Default([]) List<ConversationTurn> turns,
    String? errorMessage,
    int? lastE2eMs,
  }) = _VoiceSessionState;
}
