import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('Prescriptionly'),
  APP_URL: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().default('mysql://root:password@127.0.0.1:3306/prescriptionly'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters').default('prescriptionly_development_session_secret_min_32_characters_long_12345'),
  COOKIE_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  STORAGE_LOCAL_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(15728640), // 15MB

  // AI & OCR Model Configuration
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('gemini-1.5-flash'),
  AI_PROVIDER: z.enum(['auto', 'gemini', 'openai', 'mock']).default('auto'),
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment variables:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
