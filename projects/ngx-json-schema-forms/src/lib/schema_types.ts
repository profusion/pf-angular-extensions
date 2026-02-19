export const allSchemaTypes = ['object', 'string', 'number', 'integer', 'array', 'null', 'boolean'] as const;
export type AnySchemaType = (typeof allSchemaTypes)[number];
export const allSchemaScalarTypes = ['string', 'number', 'integer', 'boolean'] as const;
export type AnySchemaScalarType = (typeof allSchemaScalarTypes)[number];

export type AnySchema = Readonly<{
  type?: AnySchemaType | readonly AnySchemaType[];
  description?: string;
  additionalProperties?: boolean | AnySchema;
  properties?: {
    [k: string]: AnySchema;
  };
  items?: AnySchema;
  not?: AnySchema;
  anyOf?: readonly AnySchema[];
  oneOf?: readonly AnySchema[];
  allOf?: readonly AnySchema[];
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
  $ref?: string;
  definitions?: {
    [k: string]: AnySchema;
  };
}>;

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

export type AnyScalarSchema = Omit<AnySchema, 'type' | 'properties'> & {
  type: NonNullable<AnySchemaScalarType>;
};

export type AnyObjectSchema = Omit<AnySchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'object'>>;
};

export type AnyOfSchema = Omit<AnySchema, 'anyOf'> & {
  anyOf: NonNullable<AnySchema['anyOf']>;
};

export type OneOfSchema = Omit<AnySchema, 'oneOf'> & {
  oneOf: NonNullable<AnySchema['oneOf']>;
};

export type AllOfSchema = Omit<AnySchema, 'allOf'> & {
  allOf: NonNullable<AnySchema['allOf']>;
};

export type AnyArraySchema = Omit<AnySchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'array'>>;
};

export type AnyEnumSchema = Omit<AnySchema, 'enum'> & {
  enum: NonNullable<AnySchema['enum']>;
};

export type AnyPatternSchema = Omit<AnySchema, 'pattern'> & {
  pattern: NonNullable<AnySchema['pattern']>;
};

export type AnyNumberSchema = Omit<AnySchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'number'>>;
};

export type AnyIntegerSchema = Omit<AnySchema, 'type'> & {
  type: NonNullable<Extract<AnySchemaType, 'integer'>>;
};

export type AnyNullSchema = {
  type: 'null';
};

type ReplaceChar<
  S extends string,
  From extends string,
  To extends string
> = S extends `${infer L}${From}${infer R}` ? `${L}${To}${ReplaceChar<R, From, To>}` : S;

type StripJsonPointerPrefix<Ref extends string> = Ref extends `#/definitions/${infer DefKey}`
  ? DefKey
  : Ref;
type ParseRefStr<Ref extends string> = ReplaceChar<
  ReplaceChar<
    ReplaceChar<
      ReplaceChar<
        ReplaceChar<
          StripJsonPointerPrefix<Ref>,
          '%3C',
          '<'
        >,
        '%7C',
        '|'
      >,
      '%3E',
      '>'
    >,
    '%22',
    '\''
  >,
  '%2C',
  ','
>;

type MapSchemaArrayToResolvedTupleOrArray<
  TArr extends readonly unknown[],
  DefinitionsMap extends AnySchema['definitions']
> = TArr extends readonly [infer First, ...infer Rest]
  ? [
    (First extends AnySchema ? ResolveSchema<DefinitionsMap, First> : First),
    ...MapSchemaArrayToResolvedTupleOrArray<Rest, DefinitionsMap>
  ]
  : TArr extends readonly []
  ? []
  : TArr extends readonly (infer Element)[]
  ? (Element extends AnySchema ? ResolveSchema<DefinitionsMap, Element> : Element)[]
  : never;

export type ResolveSchema<
  DefinitionsMap extends AnySchema['definitions'],
  CurrentS extends AnySchema
> = '$ref' extends keyof CurrentS
  ? CurrentS['$ref'] extends string
  ? ParseRefStr<CurrentS['$ref']> extends keyof DefinitionsMap
  ? DefinitionsMap[ParseRefStr<CurrentS['$ref']>] extends AnySchema
  ? ResolveSchema<DefinitionsMap, DefinitionsMap[ParseRefStr<CurrentS['$ref']>]>
  : never // $ref Schema is undefined (should never happen)
  : never // $ref does not exist as a key in DefinitionsMap (should never happen)
  : never // $ref value is not a string (should never happen)
  : {
    [PropKey in keyof CurrentS]:
    PropKey extends 'properties'
    ? CurrentS[PropKey] extends { [k: string]: AnySchema | undefined; }
    ? { readonly [K in keyof CurrentS[PropKey]]:
      CurrentS[PropKey][K] extends AnySchema
      ? ResolveSchema<DefinitionsMap, CurrentS[PropKey][K]>
      : CurrentS[PropKey][K]
    }
    : CurrentS[PropKey]
    : PropKey extends 'definitions'
    ? CurrentS[PropKey] extends { [k: string]: AnySchema | undefined; }
    ? { readonly [K in keyof CurrentS[PropKey]]:
      CurrentS[PropKey][K] extends AnySchema
      ? ResolveSchema<DefinitionsMap, CurrentS[PropKey][K]>
      : CurrentS[PropKey][K]
    }
    : CurrentS[PropKey]
    : PropKey extends 'items'
    ? CurrentS[PropKey] extends AnySchema
    ? ResolveSchema<DefinitionsMap, CurrentS[PropKey]>
    : CurrentS[PropKey]
    : PropKey extends 'additionalProperties'
    ? CurrentS[PropKey] extends AnySchema
    ? ResolveSchema<DefinitionsMap, CurrentS[PropKey]>
    : CurrentS[PropKey]
    : PropKey extends 'anyOf' | 'oneOf' | 'allOf'
    ? CurrentS[PropKey] extends readonly AnySchema[]
    ? MapSchemaArrayToResolvedTupleOrArray<CurrentS[PropKey], DefinitionsMap>
    : CurrentS[PropKey]
    : CurrentS[PropKey] extends AnySchema
    ? ResolveSchema<DefinitionsMap, CurrentS[PropKey]>
    : CurrentS[PropKey];
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
  schema: AnySchema,
): schema is AnyObjectSchema {
  return schema.type === 'object';
}

export function isAnyOfSchema(
  schema: AnySchema,
): schema is AnyOfSchema {
  return schema.anyOf !== undefined;
}

export function isOneOfSchema(
  schema: AnySchema,
): schema is OneOfSchema {
  return schema.oneOf !== undefined;
}

export function isAllOfSchema(
  schema: AnySchema,
): schema is AllOfSchema {
  return schema.allOf !== undefined;
}

export function isArraySchema(
  schema: AnySchema,
): schema is AnyArraySchema {
  return schema.type === 'array';
}

export function isEnumSchema(
  schema: AnySchema,
): schema is AnyEnumSchema {
  return 'enum' in schema;
}

export function isPatternSchema(
  schema: AnySchema,
): schema is AnyPatternSchema {
  return 'pattern' in schema;
}

export function isNumberSchema(
  schema: AnySchema,
): schema is AnyNumberSchema {
  return schema.type === 'number';
}

export function isIntegerSchema(
  schema: AnySchema,
): schema is AnyIntegerSchema {
  return schema.type === 'integer';
}

export function isScalarSchema(
  schema: AnySchema,
): schema is AnyScalarSchema {
  return allSchemaScalarTypes.includes(schema.type as AnySchemaScalarType);
}

export function isNullSchema(
  schema: AnySchema,
): schema is AnyNullSchema {
  return schema.type === 'null';
}
