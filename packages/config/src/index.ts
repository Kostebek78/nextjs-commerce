import { z } from 'zod';

const devDefaults = {
  DATABASE_URL: 'postgresql://temmuz:temmuz_dev_password@localhost:5432/temmuz_support',
  JWT_SECRET: 'development-only-jwt-secret-change-before-production',
  SESSION_SECRET: 'development-only-session-secret-change-before-production',
};

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().optional(),
    JWT_SECRET: z.string().min(32),
    SESSION_SECRET: z.string().min(32),
    CORS_ORIGIN: z
      .string()
      .default('http://localhost:3000,http://localhost:5173,https://temmuzonline.com'),
    WIDGET_SITE_ID: z.string().default('temmuz-online'),
    WHATSAPP_NUMBER: z.string().default('905000000000'),
    ADMIN_URL: z.string().default('http://localhost:3000'),
    API_URL: z.string().default('http://localhost:4000'),
    SEED_DEMO_DATA: z.enum(['true', 'false']).default('false'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      for (const key of ['JWT_SECRET', 'SESSION_SECRET'] as const) {
        if (value[key].includes('development-only') || value[key].includes('change-me')) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: `${key} must be changed in production`,
          });
        }
      }
    }
  });

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = env.NODE_ENV ?? 'development';
  return envSchema.parse({ ...(nodeEnv === 'production' ? {} : devDefaults), ...env });
}
