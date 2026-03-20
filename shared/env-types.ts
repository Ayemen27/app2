export type AppEnv = 'production' | 'development';
export type ServerRuntime = 'replit' | 'vps' | 'local';
export type ClientPlatform = 'web' | 'android' | 'ios';
export type AuthStrategy = 'cookie' | 'bearer';
export type DatabaseSource = 'CENTRAL' | 'RAILWAY' | 'NONE';

export interface ServerEnvConfig {
  readonly NODE_ENV: AppEnv;
  readonly runtime: ServerRuntime;
  readonly isProduction: boolean;
  readonly PORT: number;
  readonly DOMAIN: string;
  readonly PRODUCTION_DOMAIN: string;
  readonly DATABASE_URL: string;
  readonly DATABASE_SOURCE: DatabaseSource;
  readonly JWT_ACCESS_SECRET: string;
  readonly JWT_REFRESH_SECRET: string;
  readonly ENCRYPTION_KEY: string;
}

export interface ClientEnvConfig {
  readonly platform: ClientPlatform;
  readonly environment: AppEnv;
  readonly isProduction: boolean;
  readonly isNative: boolean;
  readonly authStrategy: AuthStrategy;
  readonly apiBaseUrl: string;
  readonly productionDomain: string;
}
