import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/session/session_service.dart';
import '../../core/session/session_state.dart';

class ConversationScreen extends ConsumerWidget {
  const ConversationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionServiceProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0D0D1A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF13132A),
        elevation: 0,
        title: const Text(
          'Conversation',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (session.lastE2eMs != null)
            Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Center(
                child: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF64FFDA).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: const Color(0xFF64FFDA).withOpacity(0.4)),
                  ),
                  child: Text(
                    '⚡ ${session.lastE2eMs}ms',
                    style: const TextStyle(
                      color: Color(0xFF64FFDA),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      body: session.turns.isEmpty
          ? _EmptyState()
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: session.turns.length +
                  (session.currentAssistantTokens.isNotEmpty ? 1 : 0),
              itemBuilder: (context, index) {
                // Show live streaming tokens as a temporary bubble
                if (index == session.turns.length &&
                    session.currentAssistantTokens.isNotEmpty) {
                  return _ChatBubble(
                    turn: ConversationTurn(
                      turnId: 'streaming',
                      role: 'assistant',
                      text: session.currentAssistantTokens,
                    ),
                    isStreaming: true,
                  );
                }
                return _ChatBubble(turn: session.turns[index]);
              },
            ),
    );
  }
}

class _ChatBubble extends StatelessWidget {
  final ConversationTurn turn;
  final bool isStreaming;

  const _ChatBubble({required this.turn, this.isStreaming = false});

  @override
  Widget build(BuildContext context) {
    final bool isUser = turn.role == 'user';
    final Color bubbleColor = isUser
        ? const Color(0xFF4F46E5)
        : const Color(0xFF1E2235);
    final Color textColor = Colors.white;
    final CrossAxisAlignment alignment =
        isUser ? CrossAxisAlignment.end : CrossAxisAlignment.start;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: alignment,
        children: [
          // Role label
          Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              isUser ? 'You' : isStreaming ? 'Assistant ●' : 'Assistant',
              style: TextStyle(
                color: isUser
                    ? const Color(0xFFA78BFA)
                    : const Color(0xFF64FFDA),
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.5,
              ),
            ),
          ),
          // Bubble
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.78,
            ),
            padding:
                const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: bubbleColor,
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(16),
                topRight: const Radius.circular(16),
                bottomLeft: Radius.circular(isUser ? 16 : 4),
                bottomRight: Radius.circular(isUser ? 4 : 16),
              ),
              boxShadow: [
                BoxShadow(
                  color: bubbleColor.withOpacity(0.25),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  turn.text,
                  style: TextStyle(
                    color: textColor,
                    fontSize: 15,
                    height: 1.5,
                  ),
                ),
                // Interrupted badge
                if (turn.interrupted)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'interrupted',
                        style: TextStyle(
                          color: Colors.orange,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ),
                // Latency badge for assistant turns
                if (!isUser && turn.e2eMs != null && !isStreaming)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '${turn.e2eMs}ms',
                      style: const TextStyle(
                        color: Colors.white30,
                        fontSize: 11,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.chat_bubble_outline_rounded,
              color: Colors.white24, size: 64),
          SizedBox(height: 16),
          Text(
            'No conversation yet',
            style: TextStyle(color: Colors.white38, fontSize: 16),
          ),
          SizedBox(height: 8),
          Text(
            'Go back and hold the orb to start speaking',
            style: TextStyle(color: Colors.white24, fontSize: 13),
          ),
        ],
      ),
    );
  }
}
