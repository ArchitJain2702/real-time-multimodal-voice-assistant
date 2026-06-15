# Real-Time Multimodal Voice Assistant

A low-latency voice assistant built with Flutter, Node.js, WebSockets, Deepgram, Groq, Cartesia, Redis, and MongoDB.

Unlike traditional voice assistants that wait for the entire LLM response before generating speech, this project implements a clause-streaming architecture that overlaps speech recognition, language generation, and speech synthesis to significantly reduce perceived latency.

---

## Key Features

### Real-Time Voice Conversations

* Live microphone capture from Flutter client
* Bidirectional WebSocket communication
* Streaming speech-to-text pipeline
* Streaming language model responses
* Real-time speech synthesis

### Clause Streaming Pipeline

The core innovation of this project.

Instead of waiting for the LLM to finish generating an entire response, the server continuously monitors the token stream and detects natural clause boundaries.

As soon as a clause is completed:

1. The clause is flushed immediately to the TTS engine.
2. Audio generation begins.
3. Playback starts.
4. Meanwhile the LLM continues generating the next clause.

This creates a fully overlapped pipeline where:

* Speech recognition
* Language generation
* Speech synthesis
* Audio playback

all run concurrently.

The result is significantly lower perceived latency compared to traditional stop-and-wait voice assistants.

### Barge-In / Interruption Handling

Users can interrupt assistant speech and immediately begin speaking again without waiting for playback to finish.

### Session Management

* Persistent session tracking
* Conversation state management
* Redis-backed session coordination

### Production-Oriented Backend Architecture

* Express.js backend
* WebSocket communication layer
* Resilience utilities
* Timeout handling
* Retry strategies
* Structured logging

---

## Architecture

Flutter Client
↓
WebSocket Layer
↓
Audio Processing Pipeline
↓
Deepgram (Speech-to-Text)
↓
Groq (LLM)
↓
Clause Streaming Engine
↓
Cartesia (Text-to-Speech)
↓
Audio Playback

---

## Tech Stack

### Frontend

* Flutter
* Dart

### Backend

* Node.js
* Express.js
* TypeScript
* WebSockets

### Infrastructure

* Redis
* MongoDB

### AI Services

* Deepgram
* Groq
* Cartesia

---

## Engineering Challenges Solved

### Low-Latency Voice Interaction

A major challenge with voice assistants is latency accumulation:

Speech → STT → LLM → TTS → Playback

Each stage adds delay.

This project reduces perceived latency using clause-level streaming and pipeline parallelism, allowing audio playback to begin before the LLM has completed its full response.

### Real-Time Streaming Architecture

The system coordinates multiple streaming components simultaneously:

* Incoming audio streams
* STT streams
* LLM token streams
* TTS audio streams
* Playback streams

while maintaining synchronization and interruption support.

---

## Future Improvements

* Long-term conversational memory
* Voice personalization
* Multi-agent workflows
* Offline speech processing
* Mobile deployment optimizations

---

## Demo

Demo video coming soon.

---

## Screenshots

Screenshots coming soon.
