export type LogMetadata = Record<string, boolean | number | string | null | undefined>;

export interface AppLogger {
  debug(message: string, metadata?: LogMetadata): void;
  info(message: string, metadata?: LogMetadata): void;
  warn(message: string, metadata?: LogMetadata): void;
  error(message: string, metadata?: LogMetadata): void;
}

export class JsonConsoleLogger implements AppLogger {
  private write(level: string, message: string, metadata: LogMetadata = {}): void {
    const safeMetadata = Object.fromEntries(
      Object.entries(metadata).filter(
        ([key]) => !/token|secret|password|content|message/i.test(key),
      ),
    );
    console.log(
      JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...safeMetadata }),
    );
  }

  debug(message: string, metadata?: LogMetadata): void {
    this.write('debug', message, metadata);
  }
  info(message: string, metadata?: LogMetadata): void {
    this.write('info', message, metadata);
  }
  warn(message: string, metadata?: LogMetadata): void {
    this.write('warn', message, metadata);
  }
  error(message: string, metadata?: LogMetadata): void {
    this.write('error', message, metadata);
  }
}
