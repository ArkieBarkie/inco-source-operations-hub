import 'server-only';

import {z} from 'zod';
import type {PortalRole} from './auth-token';

const portalUserSchema = z.object({
  id: z.string().trim().min(1).max(100),
  login: z.string().trim().min(2).max(64).regex(/^[a-zA-Z0-9._-]+$/, 'Accountnaam bevat ongeldige tekens.'),
  displayName: z.string().trim().min(1).max(100),
  tenantId: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/),
  role: z.enum(['viewer', 'editor', 'admin']),
  passwordHash: z.string().min(50).max(100),
  sessionVersion: z.number().int().min(1).max(1_000_000).default(1),
  active: z.boolean().default(true),
});

export type PortalUserConfiguration = z.infer<typeof portalUserSchema>;

export function getPortalUsers(): PortalUserConfiguration[] {
  const raw = process.env.PORTAL_USERS_JSON?.trim();
  if (!raw) return [];
  try {
    const parsed = z.array(portalUserSchema).min(1).max(50).parse(JSON.parse(raw));
    const normalized = parsed.map((user) => ({...user, login: user.login.toLocaleLowerCase('nl-NL')}));
    if (new Set(normalized.map((user) => user.id)).size !== normalized.length) throw new Error('Dubbele gebruikers-ID.');
    if (new Set(normalized.map((user) => user.login)).size !== normalized.length) throw new Error('Dubbele accountnaam.');
    return normalized;
  } catch (error) {
    throw new Error(`PORTAL_USERS_JSON is ongeldig: ${error instanceof Error ? error.message : 'onbekende fout'}`);
  }
}

export function getPortalUserByLogin(login: string) {
  const normalized = login.trim().toLocaleLowerCase('nl-NL');
  return getPortalUsers().find((user) => user.active && user.login === normalized) ?? null;
}

export function getPortalUserById(id: string) {
  return getPortalUsers().find((user) => user.active && user.id === id) ?? null;
}

export function portalDataMode(): 'demo' | 'database' {
  const value = process.env.PORTAL_DATA_MODE?.trim();
  if (value === 'database') return 'database';
  if (value === 'demo') return 'demo';
  return process.env.NODE_ENV === 'development' ? 'demo' : 'database';
}

export function requireConfiguredRole(role: string): PortalRole {
  if (role === 'viewer' || role === 'editor' || role === 'admin') return role;
  throw new Error('Onbekende portalrol.');
}
