// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'session_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$ConversationTurn {
  String get turnId => throw _privateConstructorUsedError;
  String get role =>
      throw _privateConstructorUsedError; // 'user' or 'assistant'
  String get text => throw _privateConstructorUsedError;
  bool get interrupted => throw _privateConstructorUsedError;
  int? get e2eMs => throw _privateConstructorUsedError;

  /// Create a copy of ConversationTurn
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ConversationTurnCopyWith<ConversationTurn> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ConversationTurnCopyWith<$Res> {
  factory $ConversationTurnCopyWith(
    ConversationTurn value,
    $Res Function(ConversationTurn) then,
  ) = _$ConversationTurnCopyWithImpl<$Res, ConversationTurn>;
  @useResult
  $Res call({
    String turnId,
    String role,
    String text,
    bool interrupted,
    int? e2eMs,
  });
}

/// @nodoc
class _$ConversationTurnCopyWithImpl<$Res, $Val extends ConversationTurn>
    implements $ConversationTurnCopyWith<$Res> {
  _$ConversationTurnCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ConversationTurn
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? turnId = null,
    Object? role = null,
    Object? text = null,
    Object? interrupted = null,
    Object? e2eMs = freezed,
  }) {
    return _then(
      _value.copyWith(
            turnId: null == turnId
                ? _value.turnId
                : turnId // ignore: cast_nullable_to_non_nullable
                      as String,
            role: null == role
                ? _value.role
                : role // ignore: cast_nullable_to_non_nullable
                      as String,
            text: null == text
                ? _value.text
                : text // ignore: cast_nullable_to_non_nullable
                      as String,
            interrupted: null == interrupted
                ? _value.interrupted
                : interrupted // ignore: cast_nullable_to_non_nullable
                      as bool,
            e2eMs: freezed == e2eMs
                ? _value.e2eMs
                : e2eMs // ignore: cast_nullable_to_non_nullable
                      as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ConversationTurnImplCopyWith<$Res>
    implements $ConversationTurnCopyWith<$Res> {
  factory _$$ConversationTurnImplCopyWith(
    _$ConversationTurnImpl value,
    $Res Function(_$ConversationTurnImpl) then,
  ) = __$$ConversationTurnImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String turnId,
    String role,
    String text,
    bool interrupted,
    int? e2eMs,
  });
}

/// @nodoc
class __$$ConversationTurnImplCopyWithImpl<$Res>
    extends _$ConversationTurnCopyWithImpl<$Res, _$ConversationTurnImpl>
    implements _$$ConversationTurnImplCopyWith<$Res> {
  __$$ConversationTurnImplCopyWithImpl(
    _$ConversationTurnImpl _value,
    $Res Function(_$ConversationTurnImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationTurn
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? turnId = null,
    Object? role = null,
    Object? text = null,
    Object? interrupted = null,
    Object? e2eMs = freezed,
  }) {
    return _then(
      _$ConversationTurnImpl(
        turnId: null == turnId
            ? _value.turnId
            : turnId // ignore: cast_nullable_to_non_nullable
                  as String,
        role: null == role
            ? _value.role
            : role // ignore: cast_nullable_to_non_nullable
                  as String,
        text: null == text
            ? _value.text
            : text // ignore: cast_nullable_to_non_nullable
                  as String,
        interrupted: null == interrupted
            ? _value.interrupted
            : interrupted // ignore: cast_nullable_to_non_nullable
                  as bool,
        e2eMs: freezed == e2eMs
            ? _value.e2eMs
            : e2eMs // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc

class _$ConversationTurnImpl implements _ConversationTurn {
  const _$ConversationTurnImpl({
    required this.turnId,
    required this.role,
    required this.text,
    this.interrupted = false,
    this.e2eMs,
  });

  @override
  final String turnId;
  @override
  final String role;
  // 'user' or 'assistant'
  @override
  final String text;
  @override
  @JsonKey()
  final bool interrupted;
  @override
  final int? e2eMs;

  @override
  String toString() {
    return 'ConversationTurn(turnId: $turnId, role: $role, text: $text, interrupted: $interrupted, e2eMs: $e2eMs)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationTurnImpl &&
            (identical(other.turnId, turnId) || other.turnId == turnId) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.text, text) || other.text == text) &&
            (identical(other.interrupted, interrupted) ||
                other.interrupted == interrupted) &&
            (identical(other.e2eMs, e2eMs) || other.e2eMs == e2eMs));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, turnId, role, text, interrupted, e2eMs);

  /// Create a copy of ConversationTurn
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ConversationTurnImplCopyWith<_$ConversationTurnImpl> get copyWith =>
      __$$ConversationTurnImplCopyWithImpl<_$ConversationTurnImpl>(
        this,
        _$identity,
      );
}

abstract class _ConversationTurn implements ConversationTurn {
  const factory _ConversationTurn({
    required final String turnId,
    required final String role,
    required final String text,
    final bool interrupted,
    final int? e2eMs,
  }) = _$ConversationTurnImpl;

  @override
  String get turnId;
  @override
  String get role; // 'user' or 'assistant'
  @override
  String get text;
  @override
  bool get interrupted;
  @override
  int? get e2eMs;

  /// Create a copy of ConversationTurn
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ConversationTurnImplCopyWith<_$ConversationTurnImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$VoiceSessionState {
  VoiceSessionStatus get status => throw _privateConstructorUsedError;
  String get partialTranscript => throw _privateConstructorUsedError;
  String get currentAssistantTokens => throw _privateConstructorUsedError;
  List<ConversationTurn> get turns => throw _privateConstructorUsedError;
  String? get errorMessage => throw _privateConstructorUsedError;
  int? get lastE2eMs => throw _privateConstructorUsedError;

  /// Create a copy of VoiceSessionState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $VoiceSessionStateCopyWith<VoiceSessionState> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VoiceSessionStateCopyWith<$Res> {
  factory $VoiceSessionStateCopyWith(
    VoiceSessionState value,
    $Res Function(VoiceSessionState) then,
  ) = _$VoiceSessionStateCopyWithImpl<$Res, VoiceSessionState>;
  @useResult
  $Res call({
    VoiceSessionStatus status,
    String partialTranscript,
    String currentAssistantTokens,
    List<ConversationTurn> turns,
    String? errorMessage,
    int? lastE2eMs,
  });
}

/// @nodoc
class _$VoiceSessionStateCopyWithImpl<$Res, $Val extends VoiceSessionState>
    implements $VoiceSessionStateCopyWith<$Res> {
  _$VoiceSessionStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of VoiceSessionState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? partialTranscript = null,
    Object? currentAssistantTokens = null,
    Object? turns = null,
    Object? errorMessage = freezed,
    Object? lastE2eMs = freezed,
  }) {
    return _then(
      _value.copyWith(
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as VoiceSessionStatus,
            partialTranscript: null == partialTranscript
                ? _value.partialTranscript
                : partialTranscript // ignore: cast_nullable_to_non_nullable
                      as String,
            currentAssistantTokens: null == currentAssistantTokens
                ? _value.currentAssistantTokens
                : currentAssistantTokens // ignore: cast_nullable_to_non_nullable
                      as String,
            turns: null == turns
                ? _value.turns
                : turns // ignore: cast_nullable_to_non_nullable
                      as List<ConversationTurn>,
            errorMessage: freezed == errorMessage
                ? _value.errorMessage
                : errorMessage // ignore: cast_nullable_to_non_nullable
                      as String?,
            lastE2eMs: freezed == lastE2eMs
                ? _value.lastE2eMs
                : lastE2eMs // ignore: cast_nullable_to_non_nullable
                      as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$VoiceSessionStateImplCopyWith<$Res>
    implements $VoiceSessionStateCopyWith<$Res> {
  factory _$$VoiceSessionStateImplCopyWith(
    _$VoiceSessionStateImpl value,
    $Res Function(_$VoiceSessionStateImpl) then,
  ) = __$$VoiceSessionStateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    VoiceSessionStatus status,
    String partialTranscript,
    String currentAssistantTokens,
    List<ConversationTurn> turns,
    String? errorMessage,
    int? lastE2eMs,
  });
}

/// @nodoc
class __$$VoiceSessionStateImplCopyWithImpl<$Res>
    extends _$VoiceSessionStateCopyWithImpl<$Res, _$VoiceSessionStateImpl>
    implements _$$VoiceSessionStateImplCopyWith<$Res> {
  __$$VoiceSessionStateImplCopyWithImpl(
    _$VoiceSessionStateImpl _value,
    $Res Function(_$VoiceSessionStateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of VoiceSessionState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? partialTranscript = null,
    Object? currentAssistantTokens = null,
    Object? turns = null,
    Object? errorMessage = freezed,
    Object? lastE2eMs = freezed,
  }) {
    return _then(
      _$VoiceSessionStateImpl(
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as VoiceSessionStatus,
        partialTranscript: null == partialTranscript
            ? _value.partialTranscript
            : partialTranscript // ignore: cast_nullable_to_non_nullable
                  as String,
        currentAssistantTokens: null == currentAssistantTokens
            ? _value.currentAssistantTokens
            : currentAssistantTokens // ignore: cast_nullable_to_non_nullable
                  as String,
        turns: null == turns
            ? _value._turns
            : turns // ignore: cast_nullable_to_non_nullable
                  as List<ConversationTurn>,
        errorMessage: freezed == errorMessage
            ? _value.errorMessage
            : errorMessage // ignore: cast_nullable_to_non_nullable
                  as String?,
        lastE2eMs: freezed == lastE2eMs
            ? _value.lastE2eMs
            : lastE2eMs // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc

class _$VoiceSessionStateImpl implements _VoiceSessionState {
  const _$VoiceSessionStateImpl({
    this.status = VoiceSessionStatus.disconnected,
    this.partialTranscript = '',
    this.currentAssistantTokens = '',
    final List<ConversationTurn> turns = const [],
    this.errorMessage,
    this.lastE2eMs,
  }) : _turns = turns;

  @override
  @JsonKey()
  final VoiceSessionStatus status;
  @override
  @JsonKey()
  final String partialTranscript;
  @override
  @JsonKey()
  final String currentAssistantTokens;
  final List<ConversationTurn> _turns;
  @override
  @JsonKey()
  List<ConversationTurn> get turns {
    if (_turns is EqualUnmodifiableListView) return _turns;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_turns);
  }

  @override
  final String? errorMessage;
  @override
  final int? lastE2eMs;

  @override
  String toString() {
    return 'VoiceSessionState(status: $status, partialTranscript: $partialTranscript, currentAssistantTokens: $currentAssistantTokens, turns: $turns, errorMessage: $errorMessage, lastE2eMs: $lastE2eMs)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VoiceSessionStateImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.partialTranscript, partialTranscript) ||
                other.partialTranscript == partialTranscript) &&
            (identical(other.currentAssistantTokens, currentAssistantTokens) ||
                other.currentAssistantTokens == currentAssistantTokens) &&
            const DeepCollectionEquality().equals(other._turns, _turns) &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage) &&
            (identical(other.lastE2eMs, lastE2eMs) ||
                other.lastE2eMs == lastE2eMs));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    status,
    partialTranscript,
    currentAssistantTokens,
    const DeepCollectionEquality().hash(_turns),
    errorMessage,
    lastE2eMs,
  );

  /// Create a copy of VoiceSessionState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$VoiceSessionStateImplCopyWith<_$VoiceSessionStateImpl> get copyWith =>
      __$$VoiceSessionStateImplCopyWithImpl<_$VoiceSessionStateImpl>(
        this,
        _$identity,
      );
}

abstract class _VoiceSessionState implements VoiceSessionState {
  const factory _VoiceSessionState({
    final VoiceSessionStatus status,
    final String partialTranscript,
    final String currentAssistantTokens,
    final List<ConversationTurn> turns,
    final String? errorMessage,
    final int? lastE2eMs,
  }) = _$VoiceSessionStateImpl;

  @override
  VoiceSessionStatus get status;
  @override
  String get partialTranscript;
  @override
  String get currentAssistantTokens;
  @override
  List<ConversationTurn> get turns;
  @override
  String? get errorMessage;
  @override
  int? get lastE2eMs;

  /// Create a copy of VoiceSessionState
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$VoiceSessionStateImplCopyWith<_$VoiceSessionStateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
