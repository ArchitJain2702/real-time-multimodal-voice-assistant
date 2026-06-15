import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/session/session_service.dart';
import '../../core/session/session_state.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _waveController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _waveController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _pulseAnim = Tween<double>(begin: 0.95, end: 1.05)
        .animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(sessionServiceProvider.notifier).initialize();
    });
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _waveController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionServiceProvider);
    final notifier = ref.read(sessionServiceProvider.notifier);

    final bool isListening = session.status == VoiceSessionStatus.listening;
    final bool isSpeaking = session.status == VoiceSessionStatus.speaking;
    final bool isGenerating = session.status == VoiceSessionStatus.generating ||
        session.status == VoiceSessionStatus.transcribing;

    return Scaffold(
      backgroundColor: const Color(0xFF0D0D1A),
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Voice Assistant',
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.5,
                            ),
                      ),
                      const SizedBox(height: 4),
                      _StatusBadge(status: session.status),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.chat_bubble_outline_rounded,
                        color: Colors.white70),
                    onPressed: () => context.push('/conversation'),
                  ),
                ],
              ),
            ),

            // ── Main orb ────────────────────────────────────────────────
            Expanded(
              child: Center(
                child: GestureDetector(
                  onTapDown: (_) {
                    if (session.status == VoiceSessionStatus.idle) {
                      notifier.startListening();
                    }
                  },
                  onTapUp: (_) {
                    if (isListening) notifier.stopListening();
                  },
                  child: ScaleTransition(
                    scale: _pulseAnim,
                    child: _VoiceOrb(
                      isListening: isListening,
                      isSpeaking: isSpeaking,
                      isGenerating: isGenerating,
                    ),
                  ),
                ),
              ),
            ),

            // ── Subtitles / Live Captions Overlay ───────────────────────
            _SubtitlesOverlay(session: session),

            // ── Latency badge ────────────────────────────────────────────
            if (session.lastE2eMs != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(
                  '⚡ ${session.lastE2eMs}ms E2E',
                  style: const TextStyle(
                    color: Color(0xFF64FFDA),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

            // ── Bottom hint ──────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(bottom: 40),
              child: Text(
                isListening
                    ? 'Release to stop'
                    : isSpeaking
                        ? 'Tap to interrupt'
                        : 'Hold to speak',
                style: const TextStyle(
                  color: Colors.white38,
                  fontSize: 13,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Sub-widgets ─────────────────────────────────────────────────────────────

class _VoiceOrb extends StatelessWidget {
  final bool isListening;
  final bool isSpeaking;
  final bool isGenerating;

  const _VoiceOrb({
    required this.isListening,
    required this.isSpeaking,
    required this.isGenerating,
  });

  @override
  Widget build(BuildContext context) {
    final Color innerColor = isListening
        ? const Color(0xFF7C3AED)
        : isSpeaking
            ? const Color(0xFF0EA5E9)
            : isGenerating
                ? const Color(0xFFF59E0B)
                : const Color(0xFF1E1E3A);

    final List<Color> glowColors = isListening
        ? [const Color(0xFF7C3AED), const Color(0xFF4F46E5)]
        : isSpeaking
            ? [const Color(0xFF0EA5E9), const Color(0xFF06B6D4)]
            : isGenerating
                ? [const Color(0xFFF59E0B), const Color(0xFFEF4444)]
                : [const Color(0xFF1E1E3A), const Color(0xFF2D2D5E)];

    return Stack(
      alignment: Alignment.center,
      children: [
        // Outer glow ring
        Container(
          width: 220,
          height: 220,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: RadialGradient(
              colors: [glowColors[0].withOpacity(0.25), Colors.transparent],
            ),
          ),
        ),
        // Main orb
        Container(
          width: 160,
          height: 160,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: glowColors,
            ),
            boxShadow: [
              BoxShadow(
                color: glowColors[0].withOpacity(0.4),
                blurRadius: 40,
                spreadRadius: 5,
              ),
            ],
          ),
          child: Center(
            child: Icon(
              isListening
                  ? Icons.mic_rounded
                  : isSpeaking
                      ? Icons.volume_up_rounded
                      : isGenerating
                          ? Icons.psychology_rounded
                          : Icons.mic_none_rounded,
              color: Colors.white,
              size: 52,
            ),
          ),
        ),
      ],
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final VoiceSessionStatus status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    final (String label, Color color) = switch (status) {
      VoiceSessionStatus.disconnected => ('Disconnected', Colors.red),
      VoiceSessionStatus.connecting => ('Connecting…', Colors.orange),
      VoiceSessionStatus.idle => ('Ready', const Color(0xFF64FFDA)),
      VoiceSessionStatus.listening => ('Listening', const Color(0xFF7C3AED)),
      VoiceSessionStatus.transcribing => ('Transcribing', Colors.amber),
      VoiceSessionStatus.generating => ('Thinking', Colors.orange),
      VoiceSessionStatus.speaking => ('Speaking', const Color(0xFF0EA5E9)),
      VoiceSessionStatus.interrupted => ('Interrupted', Colors.orange),
      VoiceSessionStatus.error => ('Error', Colors.red),
    };

    return Row(
      children: [
        Container(
          width: 7,
          height: 7,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 6),
        Text(label,
            style: TextStyle(
                color: color, fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

class _SubtitlesOverlay extends StatelessWidget {
  final VoiceSessionState session;
  const _SubtitlesOverlay({required this.session});

  @override
  Widget build(BuildContext context) {
    String userText = '';
    String assistantText = '';

    if (session.turns.isNotEmpty) {
      // Find the last user turn
      for (int i = session.turns.length - 1; i >= 0; i--) {
        if (session.turns[i].role == 'user') {
          userText = session.turns[i].text;
          break;
        }
      }

      // Find the last assistant turn
      for (int i = session.turns.length - 1; i >= 0; i--) {
        if (session.turns[i].role == 'assistant') {
          assistantText = session.turns[i].text;
          break;
        }
      }
    }

    if (session.status == VoiceSessionStatus.listening ||
        session.status == VoiceSessionStatus.transcribing) {
      if (session.partialTranscript.isNotEmpty) {
        userText = session.partialTranscript;
      }
    }

    if (session.currentAssistantTokens.isNotEmpty) {
      assistantText = session.currentAssistantTokens;
    }

    if (userText.isEmpty && assistantText.isEmpty) {
      return const SizedBox(height: 80);
    }

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF13132A).withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E2235)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (userText.isNotEmpty) ...[
            const Row(
              children: [
                Icon(Icons.person_outline_rounded, color: Color(0xFFA78BFA), size: 14),
                SizedBox(width: 6),
                Text(
                  'YOU',
                  style: TextStyle(
                    color: Color(0xFFA78BFA),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              userText,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            if (assistantText.isNotEmpty) const SizedBox(height: 12),
          ],
          if (assistantText.isNotEmpty) ...[
            Row(
              children: [
                const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF64FFDA), size: 14),
                const SizedBox(width: 6),
                Text(
                  session.status == VoiceSessionStatus.generating
                      ? 'ASSISTANT (THINKING…)'
                      : 'ASSISTANT',
                  style: const TextStyle(
                    color: Color(0xFF64FFDA),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              assistantText,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w500,
                height: 1.4,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
