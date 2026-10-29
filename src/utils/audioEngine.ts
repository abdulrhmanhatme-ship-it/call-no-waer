// Ultra-Lightweight Two-Way Radio Voice Engine with Battery-Conservation & Replay

export class AudioEngine {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private isRecording = false;
  private playbackContext: AudioContext | null = null;
  private chunkSequence = 0;
  private onAudioChunkCallback: ((base64Data: string, seq: number) => void) | null = null;
  private onVolumeLevelCallback: ((level: number) => void) | null = null;
  private animFrameId: number | null = null;
  private audioQueue: string[] = [];
  private isPlayingQueue = false;

  // Buffer to store recent transmission chunks for instant replay
  private currentTransmissionChunks: string[] = [];
  private lastCompleteTransmissionChunks: string[] = [];

  constructor() {
    // Initialized lazily
  }

  public setOnAudioChunk(cb: (base64Data: string, seq: number) => void) {
    this.onAudioChunkCallback = cb;
  }

  public setOnVolumeLevel(cb: (level: number) => void) {
    this.onVolumeLevelCallback = cb;
  }

  private initPlaybackContext(): AudioContext {
    if (!this.playbackContext) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.playbackContext = new AudioCtx();
    }
    if (this.playbackContext.state === 'suspended') {
      this.playbackContext.resume();
    }
    return this.playbackContext;
  }

  // Start recording using minimal hardware resources
  public async startRecording(bitrateMode: 'low' | 'balanced' | 'high' = 'low'): Promise<boolean> {
    if (this.isRecording) return true;

    try {
      const bitrate = bitrateMode === 'low' ? 12000 : bitrateMode === 'balanced' ? 24000 : 36000;

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono saves 50% CPU & bandwidth
          sampleRate: 16000, // 16kHz speech standard saves 66% CPU
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);

      this.monitorVolume();

      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          mimeType = 'audio/ogg;codecs=opus';
        } else {
          mimeType = '';
        }
      }

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: bitrate,
      };
      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      this.mediaRecorder = new MediaRecorder(this.mediaStream, recorderOptions);
      this.chunkSequence = 0;

      this.mediaRecorder.ondataavailable = async (e: BlobEvent) => {
        if (e.data && e.data.size > 0 && this.onAudioChunkCallback) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = (reader.result as string).split(',')[1];
            if (base64data && this.onAudioChunkCallback) {
              this.onAudioChunkCallback(base64data, ++this.chunkSequence);
            }
          };
          reader.readAsDataURL(e.data);
        }
      };

      this.mediaRecorder.start(150);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Error starting audio recording:', err);
      this.stopRecording();
      return false;
    }
  }

  private monitorVolume() {
    if (!this.analyser) return;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const checkLevel = () => {
      if (!this.isRecording || !this.analyser) {
        if (this.onVolumeLevelCallback) this.onVolumeLevelCallback(0);
        return;
      }

      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const normalized = Math.min(100, Math.round((average / 128) * 100));

      if (this.onVolumeLevelCallback) {
        this.onVolumeLevelCallback(normalized);
      }

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    this.animFrameId = requestAnimationFrame(checkLevel);
  }

  public stopRecording() {
    this.isRecording = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.onVolumeLevelCallback) {
      this.onVolumeLevelCallback(0);
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
      this.mediaRecorder = null;
    }

    // Stop all media tracks to power down microphone sensor and save phone battery
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // ignore
      }
      this.audioContext = null;
      this.analyser = null;
    }
  }

  // Receive and enqueue remote audio chunk
  public async receiveAudioChunk(base64Audio: string) {
    this.currentTransmissionChunks.push(base64Audio);
    this.audioQueue.push(base64Audio);
    if (!this.isPlayingQueue) {
      this.processAudioQueue();
    }
  }

  // Mark the end of an incoming transmission
  public finishIncomingTransmission() {
    if (this.currentTransmissionChunks.length > 0) {
      this.lastCompleteTransmissionChunks = [...this.currentTransmissionChunks];
      this.currentTransmissionChunks = [];
    }
  }

  // Instant Replay feature: plays the last complete transmission
  public replayLastTransmission(): boolean {
    if (this.lastCompleteTransmissionChunks.length === 0) {
      return false;
    }
    this.audioQueue = [...this.lastCompleteTransmissionChunks];
    if (!this.isPlayingQueue) {
      this.processAudioQueue();
    }
    return true;
  }

  public hasRecordedTransmission(): boolean {
    return this.lastCompleteTransmissionChunks.length > 0;
  }

  private async processAudioQueue() {
    if (this.audioQueue.length === 0) {
      this.isPlayingQueue = false;
      return;
    }

    this.isPlayingQueue = true;
    const chunk = this.audioQueue.shift();
    if (!chunk) {
      this.isPlayingQueue = false;
      return;
    }

    try {
      const ctx = this.initPlaybackContext();
      const binaryString = window.atob(chunk);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);

      source.onended = () => {
        this.processAudioQueue();
      };

      source.start(0);
    } catch {
      this.processAudioQueue();
    }
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const globalAudioEngine = new AudioEngine();
