import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OTHER_DEFAULT_DESCRIPTION, reportMetadataSchema } from './report.js';

const valid = { id: '550e8400-e29b-41d4-a716-446655440000', categoryId: 'pothole', aiCategoryId: null, aiConfidence: null, description: 'Yolda büyük bir çukur var.', descriptionEdited: false, latitude: 37, longitude: 27, accuracy: null, address: null, capturedAt: Date.now(), locationPrecision: 'precise', locationIsMocked: null, city: null, subregion: null, district: null, postalCode: null, countryCode: null };
const accepts = (change: object) => reportMetadataSchema.safeParse({ ...valid, ...change }).success;
const clientRoles = new Set(['anon', 'authenticated', 'public']);

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--.*$/gm, '');
}

function unsafeGrantRoles(sql: string) {
  const roles: string[] = [];
  for (const statement of stripSqlComments(sql).split(';')) {
    if (!/\bgrant\b/i.test(statement)) continue;
    for (const match of statement.matchAll(/\bto\s+((?:"[^"]+"|[a-z_][\w$]*)(?:\s*,\s*(?:"[^"]+"|[a-z_][\w$]*))*)/gi)) {
      for (const role of match[1]!.split(',')) {
        const normalized = role.trim().replace(/^"|"$/g, '').toLowerCase();
        if (clientRoles.has(normalized)) roles.push(normalized);
      }
    }
  }
  return roles;
}

describe('report metadata', () => {
  it('temel geçerli girdiyi kabul eder', () => expect(accepts({})).toBe(true));
  it('address içinde LF kabul eder', () => expect(accepts({ address: 'Atatürk Mahallesi\nKuşadası / Aydın' })).toBe(true));
  it('description içinde LF kabul eder', () => expect(accepts({ description: 'Yolda büyük bir çukur var.\nLütfen kontrol edin.' })).toBe(true));
  it('description içinde TAB kabul eder', () => expect(accepts({ description: 'Yolda\tbüyük bir çukur bulunmaktadır.' })).toBe(true));
  it('description içindeki U+0001 karakterini reddeder', () => expect(accepts({ description: 'Yolda büyük\u0001 bir çukur var.' })).toBe(false));
  it('address içindeki U+0001 karakterini reddeder', () => expect(accepts({ address: 'Atatürk\u0001 Mahallesi' })).toBe(false));
  it('10 Unicode code point kabul eder', () => expect(accepts({ description: '😀'.repeat(10) })).toBe(true));
  it('9 Unicode code point reddeder', () => expect(accepts({ description: '😀'.repeat(9) })).toBe(false));
  it('1001 Unicode code point reddeder', () => expect(accepts({ description: 'a'.repeat(1001) })).toBe(false));
  it('country code kuralını korur', () => { expect(accepts({ countryCode: 'T' })).toBe(false); expect(accepts({ countryCode: 'TR' })).toBe(true); });
  it('capturedAt aralığını korur', () => expect(accepts({ capturedAt: Date.now() - 8 * 86_400_000 })).toBe(false));
  it('other varsayılanını reddeder', () => expect(accepts({ categoryId: 'other', description: OTHER_DEFAULT_DESCRIPTION, descriptionEdited: true })).toBe(false));
  it('migration aynı açık karakter politikasını kullanır', () => { const sql = readFileSync('../supabase/migrations/202610140001_create_reports.sql', 'utf8'); expect(sql).not.toContain('[[:cntrl:]]'); expect(sql).toContain('\\\\x00-\\\\x08\\\\x0B\\\\x0C\\\\x0E-\\\\x1F\\\\x7F'); });
  it('ayrı migration service_role için yalnızca minimum yetkileri verir', () => {
    const sql = stripSqlComments(readFileSync('../supabase/migrations/20261015000100_grant_service_role_reports.sql', 'utf8')).toLowerCase();
    expect(sql).toMatch(/revoke\s+all\s+on table public\.reports\s+from service_role/);
    expect(sql).toContain('grant usage on schema public to service_role');
    expect(sql).toMatch(/grant\s+select,\s*insert\s+on table public\.reports\s+to service_role/);
    const reportGrants = sql.split(';').filter(statement => /\bgrant\b/.test(statement) && /on table public\.reports/.test(statement));
    expect(reportGrants.join(' ')).not.toMatch(/grant\s+[\s\S]*?\b(update|delete)\b[\s\S]*?on table public\.reports/);
  });
  it('hiçbir migration istemci rollerine grant vermez', () => {
    const directory = '../supabase/migrations';
    const migrations = readdirSync(directory)
      .filter(file => file.endsWith('.sql'))
      .map(file => readFileSync(join(directory, file), 'utf8'));
    expect(migrations.flatMap(unsafeGrantRoles)).toEqual([]);
  });
  it('istemci rolü grant taraması çoklu, yorum sonrası, default privilege ve tırnaklı rolleri yakalar', () => {
    expect(unsafeGrantRoles('grant select on table public.reports to service_role, anon;')).toContain('anon');
    expect(unsafeGrantRoles('-- güvenli yorum\ngrant select on table public.reports to anon;')).toContain('anon');
    expect(unsafeGrantRoles('alter default privileges in schema public grant select on tables to anon;')).toContain('anon');
    expect(unsafeGrantRoles('grant select on table public.reports to "anon", "authenticated", "public";')).toEqual(['anon', 'authenticated', 'public']);
  });
});
