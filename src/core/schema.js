// The LLM output contract. The same object is sent to the API as the structured-output
// schema AND enforced locally by validateSchema() — we never trust that the provider
// enforced it. Hand-written validator because MV3 extension CSP forbids the eval-based
// code generation that libraries like ajv rely on.

import { CATEGORY_IDS, SEVERITIES } from './categories.js';

export const LLM_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['document_type', 'findings', 'not_assessable', 'page_instructions_observed'],
  properties: {
    document_type: { type: 'string', enum: ['terms_of_service', 'privacy_policy', 'subscription_terms', 'other_legal', 'not_legal'] },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['category', 'severity', 'segment_id', 'quote', 'explanation_tr', 'confidence'],
        properties: {
          category: { type: 'string', enum: CATEGORY_IDS },
          severity: { type: 'string', enum: SEVERITIES },
          segment_id: { type: 'string', pattern: '^s\\d+$' },
          quote: { type: 'string', minLength: 1, maxLength: 800 },
          explanation_tr: { type: 'string', minLength: 1, maxLength: 600 },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    not_assessable: {
      description: 'Belirsiz, metinde eksik ya da başka belgeye atıf yapılan konular (sade Türkçe).',
      type: 'array',
      items: { type: 'string', maxLength: 400 },
    },
    page_instructions_observed: {
      description: 'Belge metninde analiz aracına yönelik talimat görüldü mü?',
      type: 'boolean',
    },
  },
};

/**
 * Copy of the schema for the API's structured-output feature, with length/pattern
 * keywords removed (not all providers support them). They are still enforced locally.
 */
export function toApiSchema(schema = LLM_OUTPUT_SCHEMA) {
  if (Array.isArray(schema)) return schema.map((s) => toApiSchema(s));
  if (typeof schema !== 'object' || schema === null) return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (['minLength', 'maxLength', 'pattern'].includes(k)) continue;
    out[k] = k === 'enum' || k === 'required' ? v : toApiSchema(v);
  }
  return out;
}

/**
 * Minimal JSON-Schema subset validator (type, enum, required, additionalProperties:false,
 * items, minLength, maxLength, pattern). Returns a list of human-readable errors.
 */
export function validateSchema(value, schema = LLM_OUTPUT_SCHEMA, path = '$') {
  const errors = [];
  const t = schema.type;
  if (t === 'object') {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${path}: object bekleniyordu`];
    for (const key of schema.required || []) if (!(key in value)) errors.push(`${path}.${key}: zorunlu alan eksik`);
    for (const key of Object.keys(value)) {
      if (!schema.properties[key]) {
        if (schema.additionalProperties === false) errors.push(`${path}.${key}: şemada olmayan alan`);
        continue;
      }
      errors.push(...validateSchema(value[key], schema.properties[key], `${path}.${key}`));
    }
  } else if (t === 'array') {
    if (!Array.isArray(value)) return [`${path}: array bekleniyordu`];
    value.forEach((item, i) => errors.push(...validateSchema(item, schema.items, `${path}[${i}]`)));
  } else if (t === 'string') {
    if (typeof value !== 'string') return [`${path}: string bekleniyordu`];
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: '${value}' izinli değerlerden değil`);
    if (schema.minLength && value.length < schema.minLength) errors.push(`${path}: çok kısa`);
    if (schema.maxLength && value.length > schema.maxLength) errors.push(`${path}: çok uzun`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: biçim hatalı`);
  } else if (t === 'boolean') {
    if (typeof value !== 'boolean') errors.push(`${path}: boolean bekleniyordu`);
  }
  return errors;
}
