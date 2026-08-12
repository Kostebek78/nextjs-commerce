import { z } from 'zod';
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32),
  SESSION_SECRET: z.string().min(32),
  CORS_ORIGIN: z.string().default('http://localhost:3000,https://temmuzonline.com'),
  WIDGET_SITE_ID: z.string().default('temmuz-online'),
  WHATSAPP_NUMBER: z.string().default('905000000000'),
  ADMIN_URL: z.string().default('http://localhost:3000'),
  API_URL: z.string().default('http://localhost:4000'),
});
export type AppConfig = z.infer<typeof envSchema>;
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return envSchema.parse(env);
}
