/**
 * Supabase data layer.
 *
 * Exposes a small Firestore-shaped API (collection / doc / query / addDoc /
 * setDoc / getDocs / onSnapshot / serverTimestamp / auth) backed entirely by
 * Supabase Postgres + Auth. The Firestore-shape is purely ergonomic for the
 * existing call sites in `App.tsx` — no Firebase SDK is used or installed.
 *
 * Notes:
 *   - `onSnapshot` performs ONE fetch and never re-fires. Re-call (or rely on
 *     the `vault:data-changed` event) to refresh after mutations.
 *   - Timestamps come back as ISO strings; use `new Date(value)`.
 *   - `serverTimestamp()` returns a client ISO string.
 */

'use client';

import { createClient } from './supabase/client';
import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Error surface
// ---------------------------------------------------------------------------

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DbErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: { providerId: string; displayName: string | null; email: string | null; photoUrl: string | null }[];
  };
}

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts = [e.message, e.details, e.hint, e.code]
      .filter(Boolean)
      .map(String);
    if (parts.length) return parts.join(' | ');
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return String(error);
}

export function handleDbError(error: unknown, operationType: OperationType, path: string | null) {
  const u = auth.currentUser;
  const errInfo: DbErrorInfo = {
    error: serializeError(error),
    authInfo: {
      userId: u?.uid,
      email: u?.email,
      emailVerified: u?.emailVerified,
      isAnonymous: u?.isAnonymous,
      tenantId: null,
      providerInfo: u?.providerData ?? [],
    },
    operationType,
    path,
  };
  console.error('Supabase Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ---------------------------------------------------------------------------
// Supabase client (lazy)
// ---------------------------------------------------------------------------

const sb = () => createClient();

// ---------------------------------------------------------------------------
// Collection name + field name mapping (camelCase ↔ snake_case)
// ---------------------------------------------------------------------------

const COLLECTION_TO_TABLE: Record<string, string> = {
  users: 'users',
  inventory: 'inventory',
  transactions: 'transactions',
  notifications: 'notifications',
  branches: 'branches',
  invites: 'invites',
  reconciliations: 'reconciliations',
  warehouses: 'warehouses',
  organizations: 'organizations',
  bankAccounts: 'bank_accounts',
  bankTransactions: 'bank_transactions',
  loans: 'loans',
  test: 'users', // legacy testConnection target — harmless
};

function tableFor(collectionName: string): string {
  return COLLECTION_TO_TABLE[collectionName] ?? collectionName;
}

function camelToSnake(s: string): string {
  // Handle acronyms like photoURL -> photo_url, IMEINumber -> imei_number.
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function encodeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    if (row[k] === undefined) continue;
    out[camelToSnake(k)] = row[k];
  }
  return out;
}

function decodeRow<T = any>(row: Record<string, any> | null | undefined): T {
  if (!row) return row as any;
  const out: Record<string, any> = {};
  for (const k of Object.keys(row)) {
    out[snakeToCamel(k)] = row[k];
  }
  return out as T;
}

// ---------------------------------------------------------------------------
// Reference objects (collection / doc / query)
// ---------------------------------------------------------------------------

type Constraint =
  | { kind: 'where'; field: string; op: string; value: any }
  | { kind: 'orderBy'; field: string; dir: 'asc' | 'desc' };

export interface CollectionRef {
  __kind: 'collection';
  name: string;
}

export interface DocRef {
  __kind: 'doc';
  name: string;
  id: string;
}

export interface QueryRef {
  __kind: 'query';
  name: string;
  constraints: Constraint[];
}

export type AnyRef = CollectionRef | DocRef | QueryRef;

export function collection(_db: unknown, name: string): CollectionRef {
  return { __kind: 'collection', name };
}

export function doc(arg1: any, arg2?: any, arg3?: any): DocRef {
  // doc(db, 'users', uid)  OR  doc(collectionRef, id)
  if (arg1 && arg1.__kind === 'collection') {
    return { __kind: 'doc', name: arg1.name, id: String(arg2) };
  }
  return { __kind: 'doc', name: String(arg2), id: String(arg3) };
}

export function query(coll: CollectionRef | QueryRef, ...constraints: Constraint[]): QueryRef {
  const name = coll.name;
  const existing = (coll as QueryRef).constraints ?? [];
  return { __kind: 'query', name, constraints: [...existing, ...constraints] };
}

export function where(field: string, op: string, value: any): Constraint {
  return { kind: 'where', field, op, value };
}

export function orderBy(field: string, dir: 'asc' | 'desc' = 'asc'): Constraint {
  return { kind: 'orderBy', field, dir };
}

// ---------------------------------------------------------------------------
// Query execution
// ---------------------------------------------------------------------------

function applyConstraints(builder: any, constraints: Constraint[]) {
  for (const c of constraints) {
    if (c.kind === 'where') {
      const col = camelToSnake(c.field);
      switch (c.op) {
        case '==': builder = builder.eq(col, c.value); break;
        case '!=': builder = builder.neq(col, c.value); break;
        case '<':  builder = builder.lt(col, c.value); break;
        case '<=': builder = builder.lte(col, c.value); break;
        case '>':  builder = builder.gt(col, c.value); break;
        case '>=': builder = builder.gte(col, c.value); break;
        case 'in': builder = builder.in(col, c.value); break;
        case 'array-contains': builder = builder.contains(col, [c.value]); break;
        default: console.warn('Unsupported where op:', c.op);
      }
    } else if (c.kind === 'orderBy') {
      builder = builder.order(camelToSnake(c.field), { ascending: c.dir === 'asc' });
    }
  }
  return builder;
}

interface QuerySnapshot<T = any> {
  docs: { id: string; data: () => T; exists: () => boolean }[];
  forEach: (cb: (d: { id: string; data: () => T }) => void) => void;
  size: number;
  empty: boolean;
}
interface DocSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T | undefined;
}

function makeQuerySnapshot<T = any>(rows: any[]): QuerySnapshot<T> {
  const docs = rows.map((r) => ({
    id: String(r.id),
    data: () => decodeRow<T>(r),
    exists: () => true,
  }));
  return {
    docs,
    forEach: (cb) => docs.forEach(cb),
    size: docs.length,
    empty: docs.length === 0,
  };
}

export async function getDocs<T = any>(ref: CollectionRef | QueryRef): Promise<QuerySnapshot<T>> {
  const table = tableFor(ref.name);
  let q: any = sb().from(table).select('*');
  if (ref.__kind === 'query') q = applyConstraints(q, ref.constraints);
  const { data, error } = await q;
  if (error) throw error;
  return makeQuerySnapshot<T>(data ?? []);
}

export async function getDoc<T = any>(ref: DocRef): Promise<DocSnapshot<T>> {
  const table = tableFor(ref.name);
  const { data, error } = await sb().from(table).select('*').eq('id', ref.id).maybeSingle();
  if (error && error.code !== 'PGRST116') throw error;
  return {
    id: ref.id,
    exists: () => !!data,
    data: () => (data ? decodeRow<T>(data) : undefined),
  };
}

// Alias for callers that wanted a server-only fetch (Supabase has no client cache distinction)
export const getDocFromServer = getDoc;

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

function genId(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID().replace(/-/g, '');
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Tables whose rows MUST be tagged with the caller's organization_id.
// addDoc auto-injects organization_id from public.current_org() when the
// caller didn't supply one, so individual call sites in App.tsx don't have
// to remember to add it (and RLS policies don't reject the insert).
const ORG_SCOPED_TABLES = new Set<string>([
  'inventory',
  'transactions',
  'branches',
  'warehouses',
  'bank_accounts',
  'loans',
  'invites',
  'reconciliations',
]);

let _cachedOrgId: string | null = null;
async function currentOrgId(): Promise<string | null> {
  if (_cachedOrgId) return _cachedOrgId;
  const { data: { user: authUser } } = await sb().auth.getUser();
  if (!authUser) return null;
  const { data } = await sb()
    .from('users')
    .select('organization_id')
    .eq('id', authUser.id)
    .maybeSingle();
  _cachedOrgId = (data as any)?.organization_id ?? null;
  return _cachedOrgId;
}
export function clearOrgCache() {
  _cachedOrgId = null;
}

// Broadcast a data-changed event after every mutation so subscribers
// (e.g. App.tsx) can refresh their one-shot data fetches.
function emitDataChanged(table: string) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('vault:data-changed', { detail: { table } }));
  } catch {
    /* ignore */
  }
}

export async function addDoc(ref: CollectionRef, data: Record<string, any>): Promise<DocRef> {
  const table = tableFor(ref.name);
  const id = data.id ? String(data.id) : genId();
  const payload: Record<string, any> = { ...data, id };
  if (ORG_SCOPED_TABLES.has(table) && payload.organizationId == null && payload.organization_id == null) {
    const org = await currentOrgId();
    if (org) payload.organizationId = org;
  }
  const row = encodeRow(payload);
  const { error } = await sb().from(table).insert(row);
  if (error) throw error;
  emitDataChanged(table);
  return { __kind: 'doc', name: ref.name, id };
}

export interface SetOptions {
  merge?: boolean;
}

export async function setDoc(ref: DocRef, data: Record<string, any>, opts?: SetOptions): Promise<void> {
  const table = tableFor(ref.name);
  if (opts?.merge) {
    // Merge semantics: update only the supplied fields on the existing row.
    // Avoids clobbering NOT NULL columns (e.g. email) that aren't in `data`.
    const row = encodeRow(data);
    const { data: updated, error } = await sb()
      .from(table)
      .update(row)
      .eq('id', ref.id)
      .select('id');
    if (error) throw error;
    if (!updated || updated.length === 0) {
      // Row didn't exist — fall back to upsert with the supplied fields + id.
      // Caller is responsible for supplying all NOT NULL columns in this case.
      const insertRow = encodeRow({ ...data, id: ref.id });
      const { error: upErr } = await sb().from(table).upsert(insertRow, { onConflict: 'id' });
      if (upErr) throw upErr;
    }
    emitDataChanged(table);
    return;
  }
  const row = encodeRow({ ...data, id: ref.id });
  const { error } = await sb().from(table).upsert(row, { onConflict: 'id' });
  if (error) throw error;
  emitDataChanged(table);
}

export async function updateDoc(ref: DocRef, data: Record<string, any>): Promise<void> {
  const table = tableFor(ref.name);
  const row = encodeRow(data);
  const { error } = await sb().from(table).update(row).eq('id', ref.id);
  if (error) throw error;
  emitDataChanged(table);
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const table = tableFor(ref.name);
  const { error } = await sb().from(table).delete().eq('id', ref.id);
  if (error) throw error;
  emitDataChanged(table);
}

// ---------------------------------------------------------------------------
// onSnapshot — ONE-SHOT (no realtime)
// ---------------------------------------------------------------------------

type Unsubscribe = () => void;

export function onSnapshot<T = any>(
  ref: CollectionRef | QueryRef | DocRef,
  next: (snap: any) => void,
  errCb?: (err: Error) => void
): Unsubscribe {
  let cancelled = false;
  (async () => {
    try {
      const snap =
        ref.__kind === 'doc'
          ? await getDoc<T>(ref)
          : await getDocs<T>(ref);
      if (!cancelled) next(snap);
    } catch (e) {
      if (!cancelled && errCb) errCb(e as Error);
      else if (!cancelled) console.error('onSnapshot error:', e);
    }
  })();
  return () => {
    cancelled = true;
  };
}

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

export function serverTimestamp(): string {
  return new Date().toISOString();
}

export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number = 0) {}
  static now(): Timestamp {
    const ms = Date.now();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  static fromDate(d: Date): Timestamp {
    const ms = d.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1e6);
  }
  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1e6);
  }
  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / 1e6;
  }
}

// ---------------------------------------------------------------------------
// Auth (Supabase-backed facade)
// ---------------------------------------------------------------------------

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  providerData: { providerId: string; displayName: string | null; email: string | null; photoUrl: string | null }[];
}

function wrapUser(u: SupabaseUser | null | undefined): User | null {
  if (!u) return null;
  const meta = (u.user_metadata ?? {}) as any;
  return {
    uid: u.id,
    email: u.email ?? null,
    displayName: meta.full_name ?? meta.name ?? null,
    photoURL: meta.avatar_url ?? meta.picture ?? null,
    emailVerified: !!u.email_confirmed_at,
    isAnonymous: false,
    providerData: (u.identities ?? []).map((i) => ({
      providerId: i.provider,
      displayName: (i.identity_data as any)?.full_name ?? null,
      email: (i.identity_data as any)?.email ?? null,
      photoUrl: (i.identity_data as any)?.avatar_url ?? null,
    })),
  };
}

class AuthFacade {
  currentUser: User | null = null;
  private _listeners: ((u: User | null) => void)[] = [];
  private _initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      sb().auth.getUser().then(({ data }) => {
        this.currentUser = wrapUser(data.user);
        this._initialized = true;
        this._listeners.forEach((l) => l(this.currentUser));
      });
      sb().auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        this.currentUser = wrapUser(session?.user ?? null);
        this._initialized = true;
        this._listeners.forEach((l) => l(this.currentUser));
      });
    }
  }

  _subscribe(cb: (u: User | null) => void): Unsubscribe {
    this._listeners.push(cb);
    if (this._initialized) cb(this.currentUser);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== cb);
    };
  }
}

export const auth = new AuthFacade();
export const db = { __kind: 'db' as const };
export const googleProvider = { providerId: 'google.com' };

export function onAuthStateChanged(_auth: AuthFacade, cb: (user: User | null) => void): Unsubscribe {
  return _auth._subscribe(cb);
}

export async function loginWithGoogle(): Promise<void> {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined;
  const { error } = await sb().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function loginWithEmail(email: string, password: string): Promise<void> {
  const { error } = await sb().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<void> {
  const { error } = await sb().auth.signUp({
    email,
    password,
    options: {
      data: displayName ? { full_name: displayName } : undefined,
    },
  });
  if (error) throw error;
}

export async function logout(): Promise<void> {
  const { error } = await sb().auth.signOut();
  if (error) throw error;
}
