// hooks/use-webrtc.ts
'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Conversation } from '@/lib/ai/realtime/conversations';
import { Message } from 'ai';
import useSound from 'use-sound';
const ringSound= '/sounds/start_call.mp3';
const failSound= '/sounds/end_call.mp3';
const endSound = '/sounds/end_call.mp3';

export interface Tool {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

/**
 * The return type for the hook, matching Approach A
 * (RefObject<HTMLDivElement | null> for the audioIndicatorRef).
 */
interface UseWebRTCAudioSessionReturn {
  status: string;
  isSessionActive: boolean;
  isConnecting: boolean;
  callDuration: number;
  audioIndicatorRef: React.RefObject<HTMLDivElement | null>;
  startSession: () => Promise<void>;
  stopSession: () => void;
  handleStartStopClick: () => void;
  registerFunction: (name: string, fn: Function) => void;
  msgs: any[];
  currentVolume: number;
  conversation: Conversation[];
  sendTextMessage: (text: string) => void;
}

/**
 * Hook to manage a real-time session with OpenAI's Realtime endpoints.
 */
export default function useWebRTCAudioSession(
  voice: string,
  chatId: string,
  messages: Message[],
  setMessages: (msgs: Message[]) => void,
  tools?: Tool[],
): UseWebRTCAudioSessionReturn {
  // Connection/session states
  const [status, setStatus] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Audio references for local mic
  // Approach A: explicitly typed as HTMLDivElement | null
  const audioIndicatorRef = useRef<HTMLDivElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // WebRTC references
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);

  // Keep track of all raw events/messages
  const [msgs, setMsgs] = useState<any[]>([]);

  // Main conversation state
  const [conversation, setConversation] = useState<Conversation[]>([]);

  // For function calls (AI "tools")
  const functionRegistry = useRef<Record<string, Function>>({});

  // Volume analysis (assistant inbound audio)
  const [currentVolume, setCurrentVolume] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  // interface and DB
  const callMessageIdRef = useRef<string | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const callUpdateIntervalRef = useRef<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);

  const [playRing, { stop: stopRing }] = useSound(ringSound, {
    volume: 0.7,
    loop: true,
  });
  const [playFail] = useSound(failSound, { volume: 1.0 });
  const [playEnd] = useSound(endSound, { volume: 1.0 });


  // Actual messages
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /**
   * We track only the ephemeral user message **ID** here.
   * While user is speaking, we update that conversation item by ID.
   */
  const ephemeralUserMessageIdRef = useRef<string | null>(null);

  /**
   * Register a function (tool) so the AI can message it.
   */
  function registerFunction(name: string, fn: Function) {
    functionRegistry.current[name] = fn;
  }

  /**
   * Configure the data channel on open, sending a session update to the server.
   */
  function configureDataChannel(dataChannel: RTCDataChannel) {
    // Send session update
    const sessionUpdate = {
      type: 'session.update',
      session: {
        modalities: ['text', 'audio'],
        tools: tools || [],
        input_audio_transcription: {
          model: 'whisper-1',
        },
      },
    };
    dataChannel.send(JSON.stringify(sessionUpdate));

    console.log('Session update sent:', sessionUpdate);
    // console.log("Setting locale: " + ("language") + " : " + locale);

    const prompt = 'You a talking with child ';

    // Send language preference message
    const languageMessage = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
        ],
      },
    };
    dataChannel.send(JSON.stringify(languageMessage));
  }

  /**
   * Return an ephemeral user ID, creating a new ephemeral message in conversation if needed.
   */
  function getOrCreateEphemeralUserId(): string {
    let ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) {
      // Use uuidv4 for a robust unique ID
      ephemeralId = uuidv4();
      ephemeralUserMessageIdRef.current = ephemeralId;

      const newMessage: Conversation = {
        id: ephemeralId,
        role: 'user',
        text: '',
        timestamp: new Date().toISOString(),
        isFinal: false,
        status: 'speaking',
        saved: false,
      };

      // Append the ephemeral item to conversation
      setConversation((prev) => [...prev, newMessage]);
    }
    return ephemeralId;
  }

  /**
   * Update the ephemeral user message (by ephemeralUserMessageIdRef) with partial changes.
   */
  function updateEphemeralUserMessage(partial: Partial<Conversation>) {
    const ephemeralId = ephemeralUserMessageIdRef.current;
    if (!ephemeralId) return; // no ephemeral user message to update

    setConversation((prev) =>
      prev.map((msg) => {
        if (msg.id === ephemeralId) {
          return { ...msg, ...partial };
        }
        return msg;
      }),
    );
  }

  /**
   * Clear ephemeral user message ID so the next user speech starts fresh.
   */
  function clearEphemeralUserMessage() {
    ephemeralUserMessageIdRef.current = null;
  }

  /**
   * Main data channel message handler: interprets events from the server.
   */
  async function handleDataChannelMessage(event: MessageEvent) {
    try {
      const msg = JSON.parse(event.data);
      // console.log("Incoming dataChannel message:", msg);

      switch (msg.type) {
        /**
         * User speech started
         */
        case 'input_audio_buffer.speech_started': {
          getOrCreateEphemeralUserId();
          updateEphemeralUserMessage({ status: 'speaking' });
          break;
        }

        /**
         * User speech stopped
         */
        case 'input_audio_buffer.speech_stopped': {
          // optional: you could set "stopped" or just keep "speaking"
          updateEphemeralUserMessage({ status: 'speaking' });
          break;
        }

        /**
         * Audio buffer committed => "Processing speech..."
         */
        case 'input_audio_buffer.committed': {
          updateEphemeralUserMessage({
            text: 'Processing speech...',
            status: 'processing',
            saved: false,
          });
          break;
        }

        /**
         * Partial user transcription
         */
        case 'conversation.item.input_audio_transcription': {
          const partialText =
            msg.transcript ?? msg.text ?? 'User is speaking...';
          updateEphemeralUserMessage({
            text: partialText,
            status: 'speaking',
            isFinal: false,
            saved: false,
          });
          break;
        }

        /**
         * Final user transcription
         */
        case 'conversation.item.input_audio_transcription.completed': {
          console.log('Final user transcription:', msg.transcript);
          updateEphemeralUserMessage({
            text: msg.transcript || '',
            isFinal: true,
            status: 'final',
            saved: false,
          });
          clearEphemeralUserMessage();
          break;
        }

        /**
         * Streaming AI transcripts (assistant partial)
         */
        case 'response.audio_transcript.delta': {
          const newMessage: Conversation = {
            id: uuidv4(), // generate a fresh ID for each assistant partial
            role: 'assistant',
            text: msg.delta,
            timestamp: new Date().toISOString(),
            isFinal: false,
            saved: false,
          };

          setConversation((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.isFinal) {
              // Append to existing assistant partial
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...lastMsg,
                text: lastMsg.text + msg.delta,
              };
              return updated;
            } else {
              // Start a new assistant partial
              return [...prev, newMessage];
            }
          });
          break;
        }

        /**
         * Mark the last assistant message as final
         */
        case 'response.audio_transcript.done': {
          setConversation((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            updated[updated.length - 1].isFinal = true;
            return updated;
          });
          break;
        }

        /**
         * AI calls a function (tool)
         */
        case 'response.function_call_arguments.done': {
          const fn = functionRegistry.current[msg.name];
          if (fn) {
            const args = JSON.parse(msg.arguments);
            const result = await fn(args);

            // Respond with function output
            const response = {
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: msg.call_id,
                output: JSON.stringify(result),
              },
            };
            dataChannelRef.current?.send(JSON.stringify(response));

            const responseCreate = {
              type: 'response.create',
            };
            dataChannelRef.current?.send(JSON.stringify(responseCreate));
          }
          break;
        }

        default: {
          // console.warn("Unhandled message type:", msg.type);
          break;
        }
      }

      // Always log the raw message
      setMsgs((prevMsgs) => [...prevMsgs, msg]);
      return msg;
    } catch (error) {
      console.error('Error handling data channel message:', error);
    }
  }

  /**
   * Fetch ephemeral token from your Next.js endpoint
   */
  async function getEphemeralToken() {
    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Failed to get ephemeral token: ${response.status}`);
      }
      const data = await response.json();
      return data.client_secret.value;
    } catch (err) {
      console.error('getEphemeralToken error:', err);
      throw err;
    }
  }

  /**
   * Sets up a local audio visualization for mic input (toggle wave CSS).
   */
  function setupAudioVisualization(stream: MediaStream) {
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    analyzer.fftSize = 256;
    source.connect(analyzer);

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateIndicator = () => {
      if (!audioContext) return;
      analyzer.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Toggle an "active" class if volume is above a threshold
      if (audioIndicatorRef.current) {
        audioIndicatorRef.current.classList.toggle('active', average > 30);
      }
      requestAnimationFrame(updateIndicator);
    };
    updateIndicator();

    audioContextRef.current = audioContext;
  }

  /**
   * Calculate RMS volume from inbound assistant audio
   */
  function getVolume(): number {
    if (!analyserRef.current) return 0;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const float = (dataArray[i] - 128) / 128;
      sum += float * float;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * Create message in history
   */

  async function createCallMessage() {
    const newCallId = uuidv4();
    const newCallMessage = {
      id: newCallId,
      role: 'call',
      content: {
        messageType: 'call',
        toolCallId: 'call_' + uuidv4(),
        toolName: 'voiceCall',
        result: {
          duration: 0,
          startTimestamp: new Date().toISOString(),
        },
      },
      createdAt: new Date().toISOString(),
    };
    // @ts-ignore
    setMessages((prev) => [...prev, newCallMessage]);
    // setMessages([...messages, newCallMessage]);
    try {
      const response = await fetch('/api/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: /* переданный id чата */ chatId, // Если в URL чата уже есть id, используйте его
          message: {
            id: newCallMessage.id,
            role: newCallMessage.role,
            content: newCallMessage.content,
          },
          modelId: 'your-model-id', // подставьте актуальное значение
          chatType: 'default', // или другое значение
        }),
      });
      if (!response.ok) {
        console.error('Failed to create message message');
      }
      callMessageIdRef.current = newCallId;
      callStartTimeRef.current = Date.now();
    } catch (error) {
      console.error('Error creating message message', error);
    }
  }

  /**
   * Update call message
   */

  async function updateCallMessage(duration: number) {
    console.log('callMessageId', callMessageIdRef.current);
    if (!callMessageIdRef.current) return;

    // Объект обновлённого содержимого звонкового сообщения
    const updatedContentObj = {
      messageType: 'call',
      toolCallId: 'call', // сохраняем тот же идентификатор (при необходимости можно оставить исходный)
      toolName: 'voiceCall',
      result: {
        duration,
      },
    };

    // Преобразуем объект в строку, чтобы удовлетворить тип Message (content: string)
    const updatedContentStr = JSON.stringify(updatedContentObj);

    // Обновляем локальное состояние, используя messagesRef.current, чтобы всегда брать актуальное значение
    setMessages(
      messagesRef.current.map((msg) => {
        if (msg.id === callMessageIdRef.current) {
          return { ...msg, content: updatedContentStr };
        }
        return msg;
      }),
    );

    try {
      const response = await fetch('/api/message', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        // Передаем объект (не строку) на сервер, там ожидают объект для обновления
        body: JSON.stringify({
          id: callMessageIdRef.current,
          content: updatedContentObj,
        }),
      });
      if (!response.ok) {
        console.error('Failed to update message message');
      }
    } catch (error) {
      console.error('Error updating message message', error);
    }
  }

  /**
   * Update call transcription
   */

  async function updateCallTranscriptions() {
    // Отбираем из conversation только финальные сообщения (isFinal === true)
    // с ролями "user" или "assistant" и флагом saved !== true
    const unsaved = conversation.filter(
      (msg) =>
        (msg.role === 'user' || msg.role === 'assistant') &&
        msg.isFinal === true &&
        !msg.saved,
    );
    if (unsaved.length > 0 && callMessageIdRef.current) {
      try {
        const payload = {
          chatId,
          callMessageId: callMessageIdRef.current,
          transcriptions: unsaved.map((msg) => ({
            id: msg.id,
            role: msg.role,
            text: msg.text,
            timestamp: msg.timestamp, // используется как createdAt
          })),
        };
        const res = await fetch('/api/message/call-transcriptions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          // Помечаем сохранённые сообщения
          setConversation((prev) =>
            prev.map((msg) => {
              if (
                (msg.role === 'user' || msg.role === 'assistant') &&
                msg.isFinal === true &&
                !msg.saved
              ) {
                return { ...msg, saved: true };
              }
              return msg;
            }),
          );
        } else {
          console.error('Failed to save call transcriptions');
        }
      } catch (error) {
        console.error('Error saving call transcriptions', error);
      }
    }
  }

  /**
   * Start a new session:
   */
  async function startSession() {
    try {
      playRing();
      setIsConnecting(true);
      setStatus('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setupAudioVisualization(stream);

      setStatus('Fetching ephemeral token...');
      const ephemeralToken = await getEphemeralToken();

      setStatus('Establishing connection...');
      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      // Hidden <audio> element for inbound assistant TTS
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;

      // Inbound track => assistant's TTS
      pc.ontrack = (event) => {
        audioEl.srcObject = event.streams[0];

        // Optional: measure inbound volume
        const audioCtx = new (window.AudioContext || window.AudioContext)();
        const src = audioCtx.createMediaStreamSource(event.streams[0]);
        const inboundAnalyzer = audioCtx.createAnalyser();
        inboundAnalyzer.fftSize = 256;
        src.connect(inboundAnalyzer);
        analyserRef.current = inboundAnalyzer;

        // Start volume monitoring
        volumeIntervalRef.current = window.setInterval(() => {
          setCurrentVolume(getVolume());
        }, 100);
      };

      // Data channel for transcripts
      const dataChannel = pc.createDataChannel('response');
      dataChannelRef.current = dataChannel;

      dataChannel.onopen = () => {
        // console.log("Data channel open");
        configureDataChannel(dataChannel);
      };
      dataChannel.onmessage = handleDataChannelMessage;

      // Add local (mic) track
      pc.addTrack(stream.getTracks()[0]);

      // Create offer & set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Send SDP offer to OpenAI Realtime
      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const response = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralToken}`,
          'Content-Type': 'application/sdp',
        },
      });

      // Set remote description
      const answerSdp = await response.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      callStartTimeRef.current = Date.now();
      setIsSessionActive(true)
      setIsConnecting(false);
      stopRing();
      setStatus('Session established successfully!');


      // crate message in DB
      await createCallMessage();
      window.history.replaceState({}, '', `/chat/${chatId}`);
      // Запускаем интервал обновления message-сообщения каждые 3 секунды
      callUpdateIntervalRef.current = window.setInterval(() => {
        if (callStartTimeRef.current) {
          // Считаем количество секунд
          const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
          console.log("duration update:", duration);
          // Обновляем состояние в React
          setCallDuration(duration);

          if (duration % 5 === 0) {
            updateCallMessage(duration);
            updateCallTranscriptions();
          }
        }
      }, 1000);
    } catch (err) {
      stopRing();
      playFail();
      console.error('startSession error:', err);
      setStatus(`Error: ${err}`);
      stopSession();
    }
  }

  /**
   * Stop the session & cleanup
   */
  function stopSession() {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }
    if (audioIndicatorRef.current) {
      audioIndicatorRef.current.classList.remove('active');
    }
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }
    analyserRef.current = null;

    ephemeralUserMessageIdRef.current = null;

    setCurrentVolume(0);
    setCallDuration(0);
    setIsConnecting(false);
    setIsSessionActive(false);
    setStatus('Session stopped');
    setMsgs([]);
    setConversation([]);
    // final update message

    if (callUpdateIntervalRef.current) {
      clearInterval(callUpdateIntervalRef.current);
      callUpdateIntervalRef.current = null;
    }
    // Выполняем финальное обновление звонка, если данные установлены
    if (callStartTimeRef.current && callMessageIdRef.current) {
      const duration = Math.floor(
        (Date.now() - callStartTimeRef.current) / 1000,
      );
      playEnd();
      updateCallMessage(duration);
      updateCallTranscriptions();
    }
    // Сбрасываем идентификаторы звонка
    callMessageIdRef.current = null;
    callStartTimeRef.current = null;
  }

  /**
   * Toggle start/stop from a single button
   */
  function handleStartStopClick() {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  }

  /**
   * Send a text message through the data channel
   */
  function sendTextMessage(text: string) {
    if (
      !dataChannelRef.current ||
      dataChannelRef.current.readyState !== 'open'
    ) {
      console.error('Data channel not ready');
      return;
    }

    const messageId = uuidv4();

    // Add message to conversation immediately
    const newMessage: Conversation = {
      id: messageId,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      isFinal: true,
      status: 'final',
      saved: false, // ?? maybe not false
    };

    setConversation((prev) => [...prev, newMessage]);

    // Send message through data channel
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: text,
          },
        ],
      },
    };

    const response = {
      type: 'response.create',
    };

    dataChannelRef.current.send(JSON.stringify(message));
    dataChannelRef.current.send(JSON.stringify(response));
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => stopSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log("callDuration changed:", callDuration);
  }, [callDuration]);

  return {
    status,
    isSessionActive,
    isConnecting,
    callDuration,
    audioIndicatorRef,
    startSession,
    stopSession,
    handleStartStopClick,
    registerFunction,
    msgs,
    currentVolume,
    conversation,
    sendTextMessage,
  };
}
