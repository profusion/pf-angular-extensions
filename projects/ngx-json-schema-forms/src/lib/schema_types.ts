export const allSchemaTypes = ['object', 'string', 'number', 'integer', 'array', 'null', 'boolean'] as const;
export type AnySchemaType = (typeof allSchemaTypes)[number];
export const allSchemaScalarTypes = ['string', 'number', 'integer', 'boolean'] as const;
export type AnySchemaScalarType = (typeof allSchemaScalarTypes)[number];

export type AnyResolvedSchema = Readonly<{
  type?: AnySchemaType | readonly AnySchemaType[];
  description?: string;
  additionalProperties?: boolean | AnyResolvedSchema;
  properties?: {
    [k: string]: AnyResolvedSchema;
  };
  items?: AnyResolvedSchema;
  not?: AnyResolvedSchema;
  anyOf?: readonly AnyResolvedSchema[];
  oneOf?: readonly AnyResolvedSchema[];
  allOf?: readonly AnyResolvedSchema[];
  required?: readonly string[];
  enum?: readonly any[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  const?: string | number | boolean;
  definitions?: {
    [k: string]: AnyResolvedSchema;
  };
}>;

export type AnyScalarSchema = Omit<AnyResolvedSchema, 'type' | 'properties'> & {
  type: NonNullable<AnySchemaScalarType>;
};

export type AnyObjectSchema = Omit<AnyResolvedSchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'object'>>;
};

export type AnyOfSchema = Omit<AnyResolvedSchema, 'anyOf'> & {
  anyOf: NonNullable<AnyResolvedSchema['anyOf']>;
};

export type OneOfSchema = Omit<AnyResolvedSchema, 'oneOf'> & {
  oneOf: NonNullable<AnyResolvedSchema['oneOf']>;
};

export type AllOfSchema = Omit<AnyResolvedSchema, 'allOf'> & {
  allOf: NonNullable<AnyResolvedSchema['allOf']>;
};

export type AnyArraySchema = Omit<AnyResolvedSchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'array'>>;
};

export type AnyEnumSchema = Omit<AnyResolvedSchema, 'enum'> & {
  enum: NonNullable<AnyResolvedSchema['enum']>;
};

export type AnyPatternSchema = Omit<AnyResolvedSchema, 'pattern'> & {
  pattern: NonNullable<AnyResolvedSchema['pattern']>;
};

export type AnyNumberSchema = Omit<AnyResolvedSchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'number'>>;
};

export type AnyIntegerSchema = Omit<AnyResolvedSchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'integer'>>;
};

export function isSchemaNullable(
  schema: AnyResolvedSchema,
): boolean {
  if (schema.const) {
    return schema.const === null;
  }

  if (Array.isArray(schema.type)) {
    return schema.type.includes('null');
  }

  if (schema.type === 'null') {
    return true;
  }

  return false;
}

export function isObjectSchema(
  schema: AnyResolvedSchema,
): schema is AnyObjectSchema {
  return schema.type === 'object';
}

export function isAnyOfSchema(
  schema: AnyResolvedSchema,
): schema is AnyOfSchema {
  return schema.anyOf !== undefined;
}

export function isOneOfSchema(
  schema: AnyResolvedSchema,
): schema is OneOfSchema {
  return schema.oneOf !== undefined;
}

export function isAllOfSchema(
  schema: AnyResolvedSchema,
): schema is AllOfSchema {
  return schema.allOf !== undefined;
}

export function isArraySchema(
  schema: AnyResolvedSchema,
): schema is AnyArraySchema {
  return schema.type === 'array';
}

export function isEnumSchema(
  schema: AnyResolvedSchema,
): schema is AnyEnumSchema {
  return 'enum' in schema;
}

export function isPatternSchema(
  schema: AnyResolvedSchema,
): schema is AnyPatternSchema {
  return 'pattern' in schema;
}

export function isNumberSchema(
  schema: AnyResolvedSchema,
): schema is AnyNumberSchema {
  return schema.type === 'number';
}

export function isIntegerSchema(
  schema: AnyResolvedSchema,
): schema is AnyIntegerSchema {
  return schema.type === 'integer';
}

export function isScalarSchema(
  schema: AnyResolvedSchema,
): schema is AnyScalarSchema {
  return allSchemaScalarTypes.includes(schema.type as AnySchemaScalarType);
}
