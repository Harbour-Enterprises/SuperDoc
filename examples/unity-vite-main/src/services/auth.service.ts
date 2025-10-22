import { ATTESTATION_LAST_UPDATED_DATE } from 'components/UserAttestationModal';
import cookie from 'cookie';
import { jwtDecode } from 'jwt-decode';

const AUTH_SERVICE_PORT = '8110';
const AUTH_SERVICE_BASE_URL = `https://gprd-auth.abbvienet.com:${AUTH_SERVICE_PORT}/auth.service`;
const AUTH_SERVICE_TOKEN_REQUEST_URL = `${AUTH_SERVICE_BASE_URL}/auth/token`;
// Needs to match the service side value in authentication.service
const AUTH_TOKEN_COOKIE_KEY = 'abbvieLoginTokenKey';
const MILLISECONDS_IN_HOUR = 3.6e6;
const MILLISECONDS_IN_SECOND = 1000;

const USER_ATTESTATION_LOCALSTORAGE_KEY = 'abbvieUserAttestationKey-';

export interface AuthUser {
  domain: string;
  email: string;
  exp: number;
  fn: string;
  iss: string;
  roles: string[];
  sub: string;
  upi: string;
}

function storeToken(rawToken: string): void {
  const token = decodeToken(rawToken);
  document.cookie = cookie.serialize(AUTH_TOKEN_COOKIE_KEY, rawToken, {
    path: '/',
    // token.exp is a unix timestamp in seconds
    expires: new Date(token.exp * MILLISECONDS_IN_SECOND),
  });
}

export function clearToken(): void {
  document.cookie = cookie.serialize(AUTH_TOKEN_COOKIE_KEY, '');
}

export function getToken(): string | undefined {
  const parsedCookies = cookie.parse(document.cookie);
  return parsedCookies[AUTH_TOKEN_COOKIE_KEY];
}

export function getDecodedToken(): AuthUser | null {
  const token = getToken();
  return token ? decodeToken(token) : null;
}

export function decodeToken(token: string): AuthUser {
  return jwtDecode<AuthUser>(token);
}

function expiresSoon(auth: AuthUser) {
  return new Date().valueOf() + MILLISECONDS_IN_HOUR >= auth.exp * 1000;
}

export async function getOrFetchToken() {
  const rawToken = getToken();
  const decodedToken = rawToken ? decodeToken(rawToken) : null;

  if (decodedToken && decodedToken.upi && !expiresSoon(decodedToken))
    return rawToken;

  const response = await fetch(AUTH_SERVICE_TOKEN_REQUEST_URL, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'x-auth-popup': 'false',
    },
  });

  const jsonObj = await response.json();

  storeToken(jsonObj.token);

  return jsonObj.token;
}

export async function fetchTokenManually(username: string, password: string) {
  const encodedCredentials = btoa(`${username}:${password}`);

  const response = await fetch(AUTH_SERVICE_TOKEN_REQUEST_URL, {
    method: 'GET',
    headers: {
      'x-auth-popup': 'false',
      Authorization: `Basic ${encodedCredentials}`,
    },
  });

  const jsonObj = await response.json();

  storeToken(jsonObj.token);

  return jsonObj.token;
}

export const serializeDate = (d: Date) => d.getTime().toString();
export function deserializeDate(s: string | number | null): Date | null {
  if (s == null) return s;
  const d = new Date();
  d.setTime(Number(s));
  return d;
}

export function storeUserAttestation(userId: string | undefined, date: Date) {
  localStorage.setItem(
    `${USER_ATTESTATION_LOCALSTORAGE_KEY}${userId}`,
    serializeDate(date),
  );
}

export function getUserAttestationDate(userId: string | undefined) {
  const item = window.localStorage.getItem(
    `${USER_ATTESTATION_LOCALSTORAGE_KEY}${userId}`,
  );
  return deserializeDate(item);
}

export function isAttestationRecent(date: Date | null) {
  return !!date && ATTESTATION_LAST_UPDATED_DATE.getTime() < date.getTime();
}
