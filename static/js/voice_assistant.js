/**
 * Vignan Spandana - AI Voice Assistant Prototype
 * Real microphone capture via Web Audio API + Speech Recognition (STT),
 * Multi-turn context management, bilingual (Telugu & English) support,
 * Real audio waveform analyzer, and Speech Synthesis (TTS).
 */

(function () {
  'use strict';

  // State Management
  const state = {
    active: false,
    listening: false,
    processing: false,
    responding: false,
    language: 'en', // 'en' or 'te'
    history: [],    // Array of {role: 'user'|'assistant', text: string}
    audioStream: null,
    audioContext: null,
    analyser: null,
    animFrameId: null,
    recognition: null,
    currentUtterance: null
  };

  // DOM Elements
  const elements = {
    statusPill: document.getElementById('vaStatusPill'),
    statusText: document.getElementById('vaStatusText'),
    micBtn: document.getElementById('vaMicBtn'),
    micIcon: document.getElementById('vaMicIcon'),
    startBtn: document.getElementById('vaStartBtn'),
    endBtn: document.getElementById('vaEndBtn'),
    stopAudioBtn: document.getElementById('vaStopAudioBtn'),
    clearBtn: document.getElementById('vaClearBtn'),
    langSelect: document.getElementById('vaLangSelect'),
    waveformCanvas: document.getElementById('vaWaveformCanvas'),
    transcriptBody: document.getElementById('vaTranscriptBody'),
    textForm: document.getElementById('vaTextForm'),
    textInput: document.getElementById('vaTextInput'),
    errorAlert: document.getElementById('vaErrorAlert'),
    errorText: document.getElementById('vaErrorText')
  };

  // Check Web Speech API Availability
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const hasTTS = 'speechSynthesis' in window;

  // Initialize
  function init() {
    setupLanguageSelector();
    setupButtons();
    setupTextInput();
    setupRecognition();
    setupCanvas();
    updateUIState('ready');
  }

  // Language Setup
  function setupLanguageSelector() {
    if (!elements.langSelect) return;
    elements.langSelect.addEventListener('change', function () {
      state.language = this.value;
      if (state.recognition) {
        state.recognition.lang = state.language === 'te' ? 'te-IN' : 'en-IN';
      }
      showError(null);
    });
  }

  // Setup Button Handlers
  function setupButtons() {
    if (elements.startBtn) {
      elements.startBtn.addEventListener('click', startConversation);
    }
    if (elements.endBtn) {
      elements.endBtn.addEventListener('click', endConversation);
    }
    if (elements.stopAudioBtn) {
      elements.stopAudioBtn.addEventListener('click', stopAudioPlayback);
    }
    if (elements.clearBtn) {
      elements.clearBtn.addEventListener('click', clearTranscript);
    }
    if (elements.micBtn) {
      elements.micBtn.addEventListener('click', toggleMicAction);
    }
  }

  // Setup Text Alternative Input
  function setupTextInput() {
    if (!elements.textForm) return;
    elements.textForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const text = (elements.textInput.value || '').trim();
      if (!text) return;
      elements.textInput.value = '';
      sendUserMessage(text);
    });
  }

  // Speech Recognition Configuration
  function setupRecognition() {
    if (!SpeechRecognition) {
      showError(
        'Speech Recognition is not natively supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari, or use the text box below.'
      );
      return;
    }

    try {
      state.recognition = new SpeechRecognition();
      state.recognition.continuous = false;
      state.recognition.interimResults = true;
      state.recognition.maxAlternatives = 1;
      state.recognition.lang = state.language === 'te' ? 'te-IN' : 'en-IN';

      state.recognition.onstart = function () {
        state.listening = true;
        updateUIState('listening');
      };

      state.recognition.onresult = function (event) {
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText) {
          updateLivePreviewBubble(interimText);
        }

        if (finalText && finalText.trim().length > 0) {
          removeLivePreviewBubble();
          sendUserMessage(finalText.trim());
        }
      };

      state.recognition.onerror = function (event) {
        state.listening = false;
        removeLivePreviewBubble();

        if (event.error === 'no-speech') {
          // If no speech detected and conversation is active, return to ready
          if (state.active) {
            updateUIState('ready');
          }
        } else if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showError('Microphone permission was denied. Please allow microphone access in your browser settings.');
          updateUIState('error');
        } else if (event.error !== 'aborted') {
          showError(`Speech Recognition notice: ${event.error}. You can also type your message below.`);
          updateUIState('ready');
        }
      };

      state.recognition.onend = function () {
        state.listening = false;
        removeLivePreviewBubble();
        if (state.active && !state.processing && !state.responding) {
          updateUIState('ready');
        }
      };
    } catch (err) {
      console.error('Speech recognition setup failed:', err);
    }
  }

  // Microphone Audio Waveform using Web Audio API
  async function initMicrophoneStream() {
    if (state.audioStream) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioStream = stream;

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioContext();
      const source = state.audioContext.createMediaStreamSource(stream);
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 64;
      source.connect(state.analyser);

      startWaveformAnimation();
      showError(null);
      return true;
    } catch (err) {
      console.warn('Microphone stream access denied or failed:', err);
      showError('Microphone access was denied. Please allow microphone access or use the text input below.');
      updateUIState('error');
      return false;
    }
  }

  function stopMicrophoneStream() {
    if (state.animFrameId) {
      cancelAnimationFrame(state.animFrameId);
      state.animFrameId = null;
    }
    if (state.audioStream) {
      state.audioStream.getTracks().forEach((track) => track.stop());
      state.audioStream = null;
    }
    if (state.audioContext && state.audioContext.state !== 'closed') {
      state.audioContext.close();
      state.audioContext = null;
    }
    clearWaveformCanvas();
  }

  // Real-time Canvas Waveform Drawing
  function setupCanvas() {
    if (!elements.waveformCanvas) return;
    elements.waveformCanvas.width = 300;
    elements.waveformCanvas.height = 54;
    clearWaveformCanvas();
  }

  function clearWaveformCanvas() {
    if (!elements.waveformCanvas) return;
    const ctx = elements.waveformCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.waveformCanvas.width, elements.waveformCanvas.height);
    // Draw flat calm baseline
    ctx.beginPath();
    ctx.moveTo(0, 27);
    ctx.lineTo(elements.waveformCanvas.width, 27);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function startWaveformAnimation() {
    if (!elements.waveformCanvas || !state.analyser) return;
    const canvas = elements.waveformCanvas;
    const ctx = canvas.getContext('2d');
    const bufferLength = state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
      state.animFrameId = requestAnimationFrame(renderFrame);
      state.analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i]; // 0 to 255
        // Scale bar height based on real volume
        const barHeight = Math.max(2, (val / 255) * (canvas.height - 8));

        // Use dynamic gradient reflecting listening vs responding
        if (state.listening) {
          ctx.fillStyle = `rgb(${180 + Math.floor(val * 0.3)}, 40, 50)`;
        } else if (state.responding) {
          ctx.fillStyle = `rgb(37, ${99 + Math.floor(val * 0.4)}, 235)`;
        } else {
          ctx.fillStyle = '#94a3b8';
        }

        const y = (canvas.height - barHeight) / 2;
        ctx.fillRect(x, y, barWidth - 2, barHeight);
        x += barWidth;
      }
    }

    renderFrame();
  }

  // Start Conversation Workflow
  async function startConversation() {
    state.active = true;
    showError(null);

    // Request real microphone permission
    const micReady = await initMicrophoneStream();
    if (!micReady && !SpeechRecognition) {
      return;
    }

    // If starting fresh with no messages, assistant gives welcome greeting
    if (state.history.length === 0) {
      const greetingText =
        state.language === 'te'
          ? 'నమస్కారం! నేను విఘ్నాన్ స్పందన AI అసిస్టెంట్ని. మీరు నాతో తెలుగులో లేదా ఇంగ్లీష్లో మాట్లాడవచ్చు. మీకు ఎలా సహాయం చేయగలను?'
          : 'Hello! I am Vignan Spandana AI Assistant. You can speak with me in Telugu or English. How can I help you?';

      addMessageBubble('assistant', greetingText, {
        provider: 'assistant',
        mode: 'greeting'
      });
      state.history.push({ role: 'assistant', text: greetingText });

      // Speak greeting then auto-listen
      speakText(greetingText, function () {
        if (state.active) {
          startListening();
        }
      });
    } else {
      startListening();
    }
  }

  // End Conversation Workflow
  function endConversation() {
    state.active = false;
    stopListening();
    stopAudioPlayback();
    stopMicrophoneStream();
    updateUIState('ended');
  }

  // Listening Control
  function startListening() {
    if (!state.active) state.active = true;
    stopAudioPlayback();

    if (!state.recognition) {
      updateUIState('ready');
      return;
    }

    try {
      state.recognition.lang = state.language === 'te' ? 'te-IN' : 'en-IN';
      state.recognition.start();
    } catch (err) {
      // If already started, ignore error
      if (err.name !== 'InvalidStateError') {
        console.warn('Recognition start notice:', err);
      }
    }
  }

  function stopListening() {
    if (state.recognition && state.listening) {
      try {
        state.recognition.stop();
      } catch (e) {}
    }
    state.listening = false;
  }

  // Toggle Mic Button
  function toggleMicAction() {
    if (!state.active) {
      startConversation();
      return;
    }

    if (state.responding) {
      stopAudioPlayback();
      startListening();
      return;
    }

    if (state.listening) {
      stopListening();
      updateUIState('ready');
    } else {
      startListening();
    }
  }

  // Dispatch Message to Backend AI Model
  async function sendUserMessage(text) {
    if (!text || !text.trim()) return;

    // Display recognized user speech
    addMessageBubble('user', text);
    state.history.push({ role: 'user', text: text });

    stopListening();
    updateUIState('processing');

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          message: text,
          language: state.language,
          history: state.history
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.response || "I apologize, but I could not formulate a response. Please try again.";

      // Display AI response
      addMessageBubble('assistant', aiReply, {
        provider: data.provider,
        mode: data.mode,
        disclaimer: data.disclaimer
      });
      state.history.push({ role: 'assistant', text: aiReply });

      // Speak AI response aloud
      speakText(aiReply, function () {
        // After AI finishes speaking, seamlessly resume listening for user reply
        if (state.active) {
          setTimeout(startListening, 300);
        }
      });
    } catch (err) {
      console.error('AI chat error:', err);
      showError(`AI Service connection error: ${err.message}. Please check connection or try again.`);
      updateUIState('error');
    }
  }

  // Text-To-Speech (TTS)
  function speakText(text, onCompleteCallback) {
    if (!hasTTS) {
      console.warn('SpeechSynthesis not available in browser');
      if (onCompleteCallback) onCompleteCallback();
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Clean markdown/bullet points for spoken audio
    const spokenText = text.replace(/[*_#`[\]()]/g, ' ').replace(/\s+/g, ' ').trim();

    const utterance = new SpeechSynthesisUtterance(spokenText);
    state.currentUtterance = utterance;

    // Select language voice
    const isTe = state.language === 'te';
    utterance.lang = isTe ? 'te-IN' : 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Attempt to match best available voice
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      let matchedVoice = null;
      if (isTe) {
        matchedVoice = voices.find(v => v.lang.includes('te') || v.lang.includes('Telugu'));
      }
      if (!matchedVoice) {
        // Fallback to Indian English or first voice matching language
        matchedVoice = voices.find(v => v.lang.includes('en-IN') || v.lang.includes('hi-IN'));
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onstart = function () {
      state.responding = true;
      updateUIState('responding');
    };

    utterance.onend = function () {
      state.responding = false;
      state.currentUtterance = null;
      updateUIState('ready');
      if (onCompleteCallback) onCompleteCallback();
    };

    utterance.onerror = function (event) {
      console.warn('TTS error:', event);
      state.responding = false;
      state.currentUtterance = null;
      updateUIState('ready');
      if (onCompleteCallback) onCompleteCallback();
    };

    window.speechSynthesis.speak(utterance);
  }

  function stopAudioPlayback() {
    if (hasTTS) {
      window.speechSynthesis.cancel();
    }
    state.responding = false;
    state.currentUtterance = null;
    if (state.active) {
      updateUIState('ready');
    }
  }

  // UI State Coordinator
  function updateUIState(statusName) {
    if (!elements.statusPill || !elements.statusText) return;

    elements.statusPill.className = 'va-status-pill ' + statusName;
    elements.micBtn.className = 'va-mic-btn ' + statusName;

    if (elements.stopAudioBtn) {
      elements.stopAudioBtn.style.display = statusName === 'responding' ? 'inline-flex' : 'none';
    }

    switch (statusName) {
      case 'ready':
        elements.statusText.textContent = state.active ? 'Ready to talk' : 'Ready (Click Start)';
        elements.micIcon.textContent = '🎙️';
        break;
      case 'listening':
        elements.statusText.textContent = 'Listening... Speak now';
        elements.micIcon.textContent = '🔴';
        break;
      case 'processing':
        elements.statusText.textContent = 'Processing your speech...';
        elements.micIcon.textContent = '⏳';
        break;
      case 'responding':
        elements.statusText.textContent = 'AI responding (Speaking)...';
        elements.micIcon.textContent = '🔊';
        break;
      case 'ended':
        elements.statusText.textContent = 'Conversation ended';
        elements.micIcon.textContent = '🎙️';
        break;
      case 'error':
        elements.statusText.textContent = 'Connection or Mic Error';
        elements.micIcon.textContent = '⚠️';
        break;
      default:
        elements.statusText.textContent = statusName;
        elements.micIcon.textContent = '🎙️';
    }
  }

  // Conversation Transcript DOM Helpers
  function addMessageBubble(role, text, meta) {
    if (!elements.transcriptBody) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `va-msg ${role}`;

    const headerDiv = document.createElement('div');
    headerDiv.className = 'va-msg-header';

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (role === 'user') {
      headerDiv.innerHTML = `<span>You</span> &bull; <span>${timeString}</span>`;
    } else {
      let badgeHtml = '';
      if (meta && meta.mode === 'demo') {
        badgeHtml = `<span class="va-badge-mode va-badge-demo" title="${meta.disclaimer || 'Demo Simulation'}">Demo Mode</span>`;
      } else if (meta && meta.mode === 'live') {
        badgeHtml = `<span class="va-badge-mode va-badge-live">Live AI (${meta.provider || 'Gemini'})</span>`;
      }
      headerDiv.innerHTML = `<span>🏛️ Vignan AI</span> &bull; <span>${timeString}</span> ${badgeHtml}`;
    }

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'va-msg-bubble';
    bubbleDiv.textContent = text;

    // If assistant, add small audio replay icon
    if (role === 'assistant') {
      const replayBtn = document.createElement('button');
      replayBtn.className = 'va-replay-btn';
      replayBtn.title = 'Replay spoken audio';
      replayBtn.innerHTML = '🔊 Speak';
      replayBtn.addEventListener('click', function () {
        speakText(text);
      });
      bubbleDiv.appendChild(replayBtn);
    }

    msgDiv.appendChild(headerDiv);
    msgDiv.appendChild(bubbleDiv);

    elements.transcriptBody.appendChild(msgDiv);
    elements.transcriptBody.scrollTop = elements.transcriptBody.scrollHeight;
  }

  function updateLivePreviewBubble(interimText) {
    let preview = document.getElementById('vaLivePreviewBubble');
    if (!preview) {
      preview = document.createElement('div');
      preview.id = 'vaLivePreviewBubble';
      preview.className = 'va-msg user';
      preview.innerHTML = `
        <div class="va-msg-header"><span>You (transcribing...)</span></div>
        <div class="va-msg-bubble" style="opacity: 0.7; font-style: italic;"></div>
      `;
      elements.transcriptBody.appendChild(preview);
    }
    const bubble = preview.querySelector('.va-msg-bubble');
    if (bubble) bubble.textContent = interimText;
    elements.transcriptBody.scrollTop = elements.transcriptBody.scrollHeight;
  }

  function removeLivePreviewBubble() {
    const preview = document.getElementById('vaLivePreviewBubble');
    if (preview && preview.parentNode) {
      preview.parentNode.removeChild(preview);
    }
  }

  function clearTranscript() {
    if (elements.transcriptBody) {
      elements.transcriptBody.innerHTML = '';
      state.history = [];
      updateUIState('ready');
    }
  }

  function showError(msg) {
    if (!elements.errorAlert || !elements.errorText) return;
    if (msg) {
      elements.errorText.textContent = msg;
      elements.errorAlert.style.display = 'block';
    } else {
      elements.errorAlert.style.display = 'none';
      elements.errorText.textContent = '';
    }
  }

  // Pre-load available voices when browser loads them
  if (hasTTS) {
    window.speechSynthesis.onvoiceschanged = function () {
      window.speechSynthesis.getVoices();
    };
  }

  // Run on page load
  document.addEventListener('DOMContentLoaded', init);
})();
