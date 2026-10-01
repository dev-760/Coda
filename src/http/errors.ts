export class AppError extends Error {
  public code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed. Check your connection and try again.') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends AppError {
  constructor(message: string = 'Request timed out. Try again in a moment.') {
    super(message, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

export class ParseError extends AppError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class AudioPlaybackError extends AppError {
  constructor(message: string) {
    super(message, 'AUDIO_PLAYBACK_ERROR');
    this.name = 'AudioPlaybackError';
  }
}