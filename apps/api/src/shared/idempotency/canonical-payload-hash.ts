import { createHash } from 'node:crypto';

type CanonicalJson = null | boolean | number | string | readonly CanonicalJson[] | { readonly [key: string]: CanonicalJson };
type CanonicalJsonArray = readonly CanonicalJson[];

export function canonicalPayloadHash(payload: CanonicalJson): string {
  return createHash('sha256').update(stableStringify(payload)).digest('hex');
}

function stableStringify(value: CanonicalJson): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (isCanonicalJsonArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }
  const objectValue: { readonly [key: string]: CanonicalJson } = value;
  return `{${Object.keys(objectValue).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(objectValue[key] ?? null)}`).join(',')}}`;
}

function isCanonicalJsonArray(value: CanonicalJson): value is CanonicalJsonArray {
  return Array.isArray(value);
}
