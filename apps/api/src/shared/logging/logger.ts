const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'sessionsecret',
  'authorization',
  'cookie',
  'set-cookie',
  'csrf',
  'csrftoken',
  'apikey',
  'gemini_api_key',
  'openai_api_key',
]);

function redactSensitiveData(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
  warn(message: string, meta?: unknown): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
  error(message: string, error?: unknown, meta?: unknown): void {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
        ...(meta ? { meta: redactSensitiveData(meta) } : {}),
      })
    );
  },
};
