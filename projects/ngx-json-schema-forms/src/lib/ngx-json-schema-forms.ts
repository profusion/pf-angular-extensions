import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import {
  AnyArraySchema,
  AnyEnumSchema,
  AnyNullSchema,
  AnyObjectSchema,
  AnyResolvedSchema,
  AnyScalarSchema,
  AnySchemaScalarType,
  AnySchemaType,
  allSchemaScalarTypes,
  isAllOfSchema,
  isAnyOfSchema,
  isArraySchema,
  isEnumSchema,
  isNullSchema,
  isNumberSchema,
  isObjectSchema,
  isOneOfSchema,
  isPatternSchema,
  isScalarSchema,
  isSchemaNullable,
} from './schema_types';

type AnyScalarSchemaToTsType<T extends AnyScalarSchema> = T extends AnyEnumSchema
  ? T['enum'][number]
  : T['type'] extends 'string'
    ? string
    : T['type'] extends 'number' | 'integer'
      ? number
      : T['type'] extends 'boolean'
        ? boolean
        : never;

type AnyObjectSchemaToTsType<T extends AnyObjectSchema> = T['properties'] extends infer Properties
  ? Properties extends Record<string, AnyResolvedSchema>
    ? T['required'] extends readonly string[]
      ? {
          [K in Extract<keyof Properties, T['required'][number]>]: AnySchemaToTsType<Properties[K]>;
        } & Partial<{
          [K in Exclude<keyof Properties, T['required'][number]>]: AnySchemaToTsType<Properties[K]>;
        }>
      : Partial<{
          [K in keyof Properties]: AnySchemaToTsType<Properties[K]>;
        }>
    : never
  : T['additionalProperties'] extends infer AdditionalProperties
    ? AdditionalProperties extends AnyResolvedSchema
      ? { [x: string]: AnySchemaToTsType<AdditionalProperties> }
      : AdditionalProperties extends true
        ? { [x: string]: unknown }
        : AdditionalProperties extends false
          ? object
          : never
    : never;

type AnyArraySchemaToTsType<T extends AnyArraySchema> = T['items'] extends infer Items
  ? Items extends AnyResolvedSchema
    ? AnySchemaToTsType<Items>[]
    : unknown[]
  : never;

type AnyXOfSchemaToTsType<TArr extends readonly unknown[]> = TArr extends readonly [infer First, ...infer Rest]
  ? Rest extends readonly []
    ? First extends AnyResolvedSchema
      ? AnySchemaToTsType<First>
      : never
    : [First extends AnyResolvedSchema ? AnySchemaToTsType<First> : never, ...AnyXOfSchemaToTsType<Rest>]
  : TArr extends readonly []
    ? []
    : TArr extends readonly (infer Element)[]
      ? (Element extends AnyResolvedSchema ? AnySchemaToTsType<Element> : Element)[]
      : never;

type AnySchemaToTsType<T extends AnyResolvedSchema> = T['type'] extends 'null'
  ? null
  : // Example: ['string', 'null']...
    T['type'] extends readonly AnySchemaType[]
    ?
        | AnySchemaToTsType<Omit<T, 'type'> & { type: Exclude<T['type'][number], 'null'> }>
        | (Extract<T['type'][number], 'null'> extends 'null' ? null : never)
    : 'const' extends keyof T
      ? T['const']
      : T extends AnyScalarSchema
        ? AnyScalarSchemaToTsType<T>
        : T extends AnyObjectSchema
          ? AnyObjectSchemaToTsType<T>
          : T extends AnyArraySchema
            ? AnyArraySchemaToTsType<T>
            : T['anyOf'] extends infer AnyOf
              ? AnyOf extends readonly AnyResolvedSchema[]
                ? AnyXOfSchemaToTsType<AnyOf>
                : never
              : T['oneOf'] extends infer OneOf
                ? OneOf extends readonly AnyResolvedSchema[]
                  ? AnyXOfSchemaToTsType<OneOf>
                  : never
                : T['allOf'] extends infer AllOf
                  ? AllOf extends readonly AnyResolvedSchema[]
                    ? AnyXOfSchemaToTsType<AllOf>
                    : never
                  : never;

type AnyObjectSchemaToFormType<T extends AnyObjectSchema> = T['properties'] extends infer Properties
  ? Properties extends Record<string, AnyResolvedSchema>
    ? T['required'] extends readonly string[]
      ? FormGroup<
          { [K in Extract<keyof Properties, T['required'][number]>]: AnySchemaToFormType<Properties[K], true> } & {
            [K in Exclude<keyof Properties, T['required'][number]>]: AnySchemaToFormType<Properties[K], false>;
          }
        >
      : FormGroup<{ [K in keyof Properties]: AnySchemaToFormType<Properties[K], false> }>
    : never
  : T['additionalProperties'] extends infer AdditionalProperties
    ? AdditionalProperties extends AnyResolvedSchema
      ? FormGroup<{ [x: string]: AnySchemaToFormType<AdditionalProperties, true> }>
      : AdditionalProperties extends true
        ? FormGroup<{ [x: string]: FormControl<unknown> }>
        : AdditionalProperties extends false
          ? FormGroup<object>
          : never
    : never;

type AnyArraySchemaToFormType<T extends AnyArraySchema> = T['items'] extends infer Items
  ? Items extends AnyResolvedSchema
    ? Items extends AnyScalarSchema
      ? FormControl<AnySchemaToTsType<Items>[]>
      : FormArray<AnySchemaToFormType<Items, true>>
    : FormArray<FormControl<unknown>>
  : never;

type FilterNullSchemas<T extends readonly AnyResolvedSchema[]> = {
  filteredSchemas: FilterNullSchemasArray<T>;
  hadNullSchema: HasNullSchema<T>;
};

type FilterNullSchemasArray<T extends readonly AnyResolvedSchema[]> = T extends readonly [infer First, ...infer Rest]
  ? Rest extends readonly AnyResolvedSchema[]
    ? First extends AnyResolvedSchema
      ? First extends { type: 'null' }
        ? FilterNullSchemasArray<Rest>
        : [First, ...FilterNullSchemasArray<Rest>]
      : FilterNullSchemasArray<Rest>
    : []
  : [];

type HasNullSchema<T extends readonly AnyResolvedSchema[]> = T extends readonly [infer First, ...infer Rest]
  ? Rest extends readonly AnyResolvedSchema[]
    ? First extends { type: 'null' }
      ? true
      : HasNullSchema<Rest>
    : false
  : false;

type AnyXOfSchemaToFormTypeFiltered<T extends readonly AnyResolvedSchema[]> =
  FilterNullSchemas<T> extends { filteredSchemas: infer Filtered; hadNullSchema: infer HadNull }
    ? Filtered extends readonly AnyResolvedSchema[]
      ? HadNull extends boolean
        ? Filtered extends readonly []
          ? HadNull extends true
            ? FormControl<null>
            : never
          : Filtered extends readonly [infer Single]
            ? Single extends AnyResolvedSchema
              ? AnySchemaToFormType<Single, false> // Not required if had null
              : never
            : AnyXOfSchemaToFormType<Filtered> // Multiple schemas, use original FormGroup logic
        : never
      : never
    : never;

type AnyXOfSchemaToFormType<T extends readonly AnyResolvedSchema[]> = FormGroup<{
  [K in (keyof T & `${number}`)]: AnySchemaToFormType<T[K], true>;
}>;

type AnyScalarSchemaToFormType<T extends AnyScalarSchema, R extends boolean, NonNull extends boolean> = R extends true
  ? NonNull extends false
    ? FormControl<AnyScalarSchemaToTsType<T> | null>
    : FormControl<AnyScalarSchemaToTsType<T>>
  : NonNull extends false
    ? FormControl<AnyScalarSchemaToTsType<T> | undefined | null>
    : FormControl<AnyScalarSchemaToTsType<T> | undefined>;

type AnySchemaToFormType<T extends AnyResolvedSchema, R extends boolean> = 'const' extends keyof T
  ? FormControl<T['const']>
  : T extends AnyNullSchema
    ? FormControl<null>
    : T extends AnyScalarSchema
      ? AnyScalarSchemaToFormType<T, R, true>
      : T extends AnyObjectSchema
        ? AnyObjectSchemaToFormType<T>
        : T extends AnyArraySchema
          ? AnyArraySchemaToFormType<T>
          : T['type'] extends infer TypeArray
            ? TypeArray extends readonly AnySchemaType[]
              ? TypeArray extends readonly [AnySchemaScalarType, 'null']
                ? AnyScalarSchemaToFormType<Omit<T, 'type'> & { type: TypeArray[0] }, false, false>
                : never
              : T['anyOf'] extends infer AnyOf
                ? AnyOf extends AnyResolvedSchema[]
                  ? AnyXOfSchemaToFormTypeFiltered<AnyOf>
                  : T['oneOf'] extends infer OneOf
                    ? OneOf extends AnyResolvedSchema[]
                      ? AnyXOfSchemaToFormTypeFiltered<OneOf>
                      : T['allOf'] extends AnyResolvedSchema[]
                        ? never
                        : never
                    : never
                : never
            : never;

function filterNullSchemas(schemas: readonly AnyResolvedSchema[]): {
  filteredSchemas: AnyResolvedSchema[];
  hadNullSchema: boolean;
} {
  const filteredSchemas: AnyResolvedSchema[] = [];
  let hadNullSchema = false;

  for (const schema of schemas) {
    if (isNullSchema(schema)) {
      hadNullSchema = true;
    } else {
      filteredSchemas.push(schema);
    }
  }

  return { filteredSchemas, hadNullSchema };
}

function anyXOfSchemasToForm<T extends readonly AnyResolvedSchema[]>(
  s: T,
  required: boolean,
  requiredEntries: boolean,
  defaultValue?: AnyXOfSchemaToTsType<T>,
): AnyXOfSchemaToFormType<T> {
  const controls = {} as AnyXOfSchemaToFormType<T>['controls'];
  for (let i = 0; i < s.length; i++) {
    const xof = s[i];
    const k = i as keyof typeof controls;
    const control = anySchemaToForm(xof, requiredEntries, defaultValue?.[i]);

    if (control) {
      controls[k] = control as (typeof controls)[typeof k];
    }
  }

  return new FormGroup(controls, {
    validators: required ? Validators.required : null,
  }) as AnyXOfSchemaToFormType<T>;
}

function anySchemaToForm<T extends AnyResolvedSchema, R extends boolean>(
  s: T,
  required: R,
  defaultValue?: AnySchemaToTsType<T>,
): AnySchemaToFormType<T, R> | undefined {
  const allowsNull = isSchemaNullable(s);
  const applyRequired = required && !allowsNull;

  if (Array.isArray(s.type)) {
    const types = s.type.filter((t) => t !== 'null');

    if (types.length === 1 && allSchemaScalarTypes.includes(types[0])) {
      const type = types[0] as AnySchemaScalarType;
      const scalarSchema = { ...s, type };
      return scalarSchemaToFormControl(
        scalarSchema,
        applyRequired,
        defaultValue as AnyScalarSchemaToTsType<typeof scalarSchema>,
      ) as AnySchemaToFormType<T, R>;
    } else if (types.length === 0 && allowsNull) {
      return new FormControl(undefined) as AnySchemaToFormType<T, R>;
    } else {
      return new FormControl(defaultValue ?? undefined, {
        nonNullable: true,
        validators: applyRequired ? Validators.required : null,
      }) as AnySchemaToFormType<T, R>;
    }
  }

  if (isNullSchema(s)) {
    return new FormControl(null) as AnySchemaToFormType<T, R>;
  }

  if (isScalarSchema(s)) {
    return scalarSchemaToFormControl(
      s,
      applyRequired,
      defaultValue as AnyScalarSchemaToTsType<typeof s>,
    ) as AnySchemaToFormType<T, R>;
  }

  if (isObjectSchema(s)) {
    const formGroup = objSchemaToFormGroup(s, defaultValue as AnyObjectSchemaToTsType<typeof s>);
    if (applyRequired) {
      (formGroup as FormGroup).addValidators(Validators.required);
    }
    return formGroup;
  }

  if (isArraySchema(s)) {
    const formArray = arraySchemaToFormArray(s, applyRequired, defaultValue as AnyArraySchemaToTsType<typeof s>);
    if (applyRequired) {
      formArray.addValidators(Validators.required);
    }
    return formArray as AnySchemaToFormType<T, R>;
  }

  if (isAnyOfSchema(s)) {
    const { filteredSchemas, hadNullSchema } = filterNullSchemas(s.anyOf);

    if (filteredSchemas.length === 0 && hadNullSchema) {
      return new FormControl(null) as AnySchemaToFormType<T, R>;
    }

    if (filteredSchemas.length === 1) {
      const singleSchema = filteredSchemas[0];
      const shouldBeRequired = hadNullSchema ? false : applyRequired;
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion required for complex generic schema transformation
      return anySchemaToForm(singleSchema, shouldBeRequired, defaultValue as any) as AnySchemaToFormType<T, R>;
    }

    const shouldBeRequired = hadNullSchema ? false : applyRequired;
    return anyXOfSchemasToForm(
      filteredSchemas,
      shouldBeRequired,
      false,
      defaultValue as AnyXOfSchemaToTsType<typeof filteredSchemas>,
    ) as AnySchemaToFormType<T, R>;
  }

  if (isOneOfSchema(s)) {
    const { filteredSchemas, hadNullSchema } = filterNullSchemas(s.oneOf);

    if (filteredSchemas.length === 0 && hadNullSchema) {
      return new FormControl(null) as AnySchemaToFormType<T, R>;
    }

    if (filteredSchemas.length === 1) {
      const singleSchema = filteredSchemas[0];
      const shouldBeRequired = hadNullSchema ? false : applyRequired;
      // biome-ignore lint/suspicious/noExplicitAny: Type assertion required for complex generic schema transformation
      return anySchemaToForm(singleSchema, shouldBeRequired, defaultValue as any) as AnySchemaToFormType<T, R>;
    }

    const shouldBeRequired = hadNullSchema ? false : applyRequired;
    return anyXOfSchemasToForm(
      filteredSchemas,
      shouldBeRequired,
      false,
      defaultValue as AnyXOfSchemaToTsType<typeof filteredSchemas>,
    ) as AnySchemaToFormType<T, R>;
  }

  if (isAllOfSchema(s)) {
    return anyXOfSchemasToForm(
      s.allOf,
      applyRequired,
      true,
      defaultValue as AnyXOfSchemaToTsType<typeof s.allOf>,
    ) as AnySchemaToFormType<T, R>;
  }

  console.warn('schemaToForm: Unhandled or complex schema structure, unable to generate Form', s);
  return undefined; // Undefined means a `never` branch. We handle it internally, but the type won't be exposed.
}

function getScalarSchemaFormValidators<T extends AnyScalarSchema>(s: T, required: boolean): ValidatorFn | null {
  const validators: ValidatorFn[] = [];

  if (isNumberSchema(s)) {
    if (s.minimum !== undefined) {
      validators.push(Validators.min(s.minimum));
    }
    if (s.maximum !== undefined) {
      validators.push(Validators.max(s.maximum));
    }
  } else if (isEnumSchema(s)) {
    // no-op
  } else if (isPatternSchema(s) && s.pattern) {
    validators.push(Validators.pattern(s.pattern));
  } else {
    if (s.minLength !== undefined) {
      validators.push(Validators.minLength(s.minLength));
    }
    if (s.maxLength !== undefined) {
      validators.push(Validators.maxLength(s.maxLength));
    }
  }

  if (required) {
    validators.push(Validators.required);
  }

  return Validators.compose(validators);
}

export function scalarSchemaToFormControl<T extends AnyScalarSchema, R extends boolean>(
  s: T,
  required: R,
  defaultValue?: AnyScalarSchemaToTsType<T>,
): AnyScalarSchemaToFormType<T, R, R> {
  const value = s.const ? s.const : (defaultValue ?? undefined);
  return new FormControl(value, {
    validators: getScalarSchemaFormValidators(s, required),
    nonNullable: true,
  }) as AnyScalarSchemaToFormType<T, R, R>;
}

export function objSchemaToFormGroup<T extends AnyObjectSchema>(
  obj: T,
  defaultValues?: Partial<AnyObjectSchemaToTsType<T>>,
): AnyObjectSchemaToFormType<T> {
  if (obj.properties) {
    const controls = {} as AnyObjectSchemaToFormType<T>['controls'];

    for (const [k, prop] of Object.entries(obj.properties)) {
      const key = k as keyof T['properties'];
      const required = obj.required?.includes(k) === true;
      const propDefaultValue = defaultValues?.[key];

      const propForm = anySchemaToForm(prop, required, propDefaultValue);
      if (propForm) {
        controls[key] = propForm as (typeof controls)[typeof key];
      }
    }

    return new FormGroup(controls) as AnyObjectSchemaToFormType<T>;
  }

  if (typeof obj.additionalProperties === 'object' && obj.additionalProperties) {
    const controls: { [key: string]: AbstractControl } = {};

    if (defaultValues) {
      for (const [key, value] of Object.entries(defaultValues)) {
        const form = anySchemaToForm(
          obj.additionalProperties,
          false,
          value as AnySchemaToTsType<typeof obj.additionalProperties>,
        );
        if (form) {
          controls[key] = form;
        }
      }
    }

    return new FormGroup(controls) as AnyObjectSchemaToFormType<T>;
  }

  if (obj.additionalProperties === true || obj.additionalProperties === undefined) {
    const controls: { [key: string]: FormControl<unknown> } = {};
    if (defaultValues) {
      for (const [key, value] of Object.entries(defaultValues)) {
        controls[key] = new FormControl(value ?? undefined, { nonNullable: true });
      }
    }
    return new FormGroup(controls) as AnyObjectSchemaToFormType<T>;
  }

  if (obj.additionalProperties === false) {
    return new FormGroup({}) as AnyObjectSchemaToFormType<T>;
  }

  return new FormGroup({}) as AnyObjectSchemaToFormType<T>;
}

export function arraySchemaToFormArray<T extends AnyArraySchema>(
  arr: T,
  required: boolean,
  defaultValues?: AnyArraySchemaToTsType<T>,
): AnyArraySchemaToFormType<T> {
  if (arr.items && isScalarSchema(arr.items)) {
    return new FormControl(defaultValues ?? undefined, {
      nonNullable: true,
      validators: getScalarSchemaFormValidators(arr.items, required),
    }) as unknown as AnyArraySchemaToFormType<T>;
  }

  const controls: AnyArraySchemaToFormType<T>['controls'] = [];

  if (Array.isArray(defaultValues)) {
    for (const v of defaultValues) {
      if (arr.items) {
        const form = anySchemaToForm(arr.items, true, v as AnySchemaToTsType<typeof arr.items>);
        if (form) {
          controls.push(form);
        }
      } else {
        controls.push(new FormControl(v || undefined, { nonNullable: true }));
      }
    }
  }

  const validatorFns: ValidatorFn[] = [];
  if (arr.minItems !== undefined) {
    validatorFns.push(Validators.minLength(arr.minItems));
  }
  if (arr.maxItems !== undefined) {
    validatorFns.push(Validators.maxLength(arr.maxItems));
  }

  if (required) {
    validatorFns.push(Validators.required);
  }

  return new FormArray(controls, validatorFns) as AnyArraySchemaToFormType<T>;
}
