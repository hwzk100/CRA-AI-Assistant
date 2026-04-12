export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let currentLevel: LogLevel = 'info';

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function formatLog(level: LogLevel, module: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
  if (data !== undefined) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export function createLogger(module: string) {
  return {
    debug: (message: string, data?: unknown) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.debug) {
        console.log(formatLog('debug', module, message, data));
      }
    },
    info: (message: string, data?: unknown) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.info) {
        console.log(formatLog('info', module, message, data));
      }
    },
    warn: (message: string, data?: unknown) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.warn) {
        console.warn(formatLog('warn', module, message, data));
      }
    },
    error: (message: string, data?: unknown) => {
      if (LOG_LEVELS[currentLevel] <= LOG_LEVELS.error) {
        console.error(formatLog('error', module, message, data));
      }
    },
  };
}
