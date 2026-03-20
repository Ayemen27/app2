import type { CookieOptions } from 'express';
import { ENV } from '../config/env';

const isProduction = ENV.isProduction;

const BASE_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export const ACCESS_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 24 * 60 * 60 * 1000,
};

export const REFRESH_TOKEN_COOKIE_OPTIONS: CookieOptions = {
  ...BASE_COOKIE_OPTIONS,
  maxAge: 90 * 24 * 60 * 60 * 1000,
};

export const CLEAR_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
};

export function setAuthCookies(res: any, accessToken: string, refreshToken: string) {
  res.cookie('accessToken', accessToken, ACCESS_TOKEN_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE_OPTIONS);
}

export function clearAuthCookies(res: any) {
  res.clearCookie('accessToken', CLEAR_COOKIE_OPTIONS);
  res.clearCookie('refreshToken', CLEAR_COOKIE_OPTIONS);
}
