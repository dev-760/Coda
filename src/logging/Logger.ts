import { useLogStore, LogLevel } from '../store/logStore';

class Logger {
  private log(level: LogLevel, tag: string, message: string, data?: any) {
    // Add to ring buffer store
    useLogStore.getState().addEntry({ level, tag, message, data });

    // In development, also log to console
    if (__DEV__) {
      const formattedMessage = `[${tag}] ${message}`;
      switch (level) {
        case 'debug':
          console.debug(formattedMessage, data || '');
          break;
        case 'info':
          console.info(formattedMessage, data || '');
          break;
        case 'warn':
          console.warn(formattedMessage, data || '');
          break;
        case 'error':
          console.error(formattedMessage, data || '');
          break;
      }
    }
  }

  debug(tag: string, message: string, data?: any) {
    this.log('debug', tag, message, data);
  }

  info(tag: string, message: string, data?: any) {
    this.log('info', tag, message, data);
  }

  warn(tag: string, message: string, data?: any) {
    this.log('warn', tag, message, data);
  }

  error(tag: string, message: string, data?: any) {
    this.log('error', tag, message, data);
  }
}

export const logger = new Logger();
