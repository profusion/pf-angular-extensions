import { FormArray, FormControl, FormGroup } from '@angular/forms';
import {
  scalarSchemaToFormControl,
  objSchemaToFormGroup,
  arraySchemaToFormArray,
} from './ngx-json-schema-forms';

describe('scalarSchemaToFormControl', () => {
  it('should create a FormControl for a string schema', () => {
    const schema = { type: 'string' } as const;
    const control = scalarSchemaToFormControl(schema, false);
    expect(control).toBeInstanceOf(FormControl);
    expect(control.value).toBeFalsy();
  });

  it('should create a FormControl for a number schema', () => {
    const schema = { type: 'number' } as const;
    const control = scalarSchemaToFormControl(schema, false);
    expect(control).toBeInstanceOf(FormControl);
    expect(control.value).toBeFalsy();
  });

  it('should create a FormControl for an integer schema', () => {
    const schema = { type: 'integer' } as const;
    const control = scalarSchemaToFormControl(schema, true);
    expect(control).toBeInstanceOf(FormControl);
  });

  it('should create a FormControl for a boolean schema', () => {
    const schema = { type: 'boolean' } as const;
    const control = scalarSchemaToFormControl(schema, false);
    expect(control).toBeInstanceOf(FormControl);
    expect(control.value).toBeFalsy();
  });

  it('should use the default value when provided', () => {
    const schema = { type: 'string' } as const;
    const control = scalarSchemaToFormControl(schema, false, 'hello');
    expect(control.value).toBe('hello');
  });

  it('should use const value over default value', () => {
    const schema = { type: 'string', const: 'fixed' } as const;
    const control = scalarSchemaToFormControl(schema, false, 'other');
    expect(control.value).toBe('fixed');
  });

  it('should apply required validator when required is true', () => {
    const schema = { type: 'string' } as const;
    const control = scalarSchemaToFormControl(schema, true);
    control.setValue('');
    expect(control.valid).toBeFalse();

    // Non-nullable required: null should be invalid
    control.setValue(null as unknown as string);
    expect(control.valid).toBeFalse();

    control.setValue('test');
    expect(control.valid).toBeTrue();
  });

  it('should not apply required validator when required is false', () => {
    const schema = { type: 'string' } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue('');
    expect(control.valid).toBeTrue();
  });

  it('should apply min validator for number schema', () => {
    const schema = { type: 'number', minimum: 5 } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue(3);
    expect(control.valid).toBeFalse();

    control.setValue(5);
    expect(control.valid).toBeTrue();

    control.setValue(10);
    expect(control.valid).toBeTrue();
  });

  it('should apply max validator for number schema', () => {
    const schema = { type: 'number', maximum: 10 } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue(15);
    expect(control.valid).toBeFalse();

    control.setValue(10);
    expect(control.valid).toBeTrue();
  });

  it('should apply both min and max validators for number schema', () => {
    const schema = { type: 'number', minimum: 1, maximum: 100 } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue(0);
    expect(control.valid).toBeFalse();

    control.setValue(101);
    expect(control.valid).toBeFalse();

    control.setValue(50);
    expect(control.valid).toBeTrue();
  });

  it('should apply minLength validator for string schema', () => {
    const schema = { type: 'string', minLength: 3 } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue('ab');
    expect(control.valid).toBeFalse();

    control.setValue('abc');
    expect(control.valid).toBeTrue();
  });

  it('should apply maxLength validator for string schema', () => {
    const schema = { type: 'string', maxLength: 5 } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue('abcdef');
    expect(control.valid).toBeFalse();

    control.setValue('abcde');
    expect(control.valid).toBeTrue();
  });

  it('should apply pattern validator for string schema', () => {
    const schema = { type: 'string', pattern: '^[a-z]+$' } as const;
    const control = scalarSchemaToFormControl(schema, false);
    control.setValue('abc123');
    expect(control.valid).toBeFalse();

    control.setValue('abc');
    expect(control.valid).toBeTrue();
  });

  it('should create a FormControl for an enum schema', () => {
    const schema = { type: 'string', enum: ['a', 'b', 'c'] as const } as const;
    const control = scalarSchemaToFormControl(schema, false);
    expect(control).toBeInstanceOf(FormControl);
  });

  it('should create a nonNullable FormControl', () => {
    const schema = { type: 'string' } as const;
    const control = scalarSchemaToFormControl(schema, false, 'hello');
    control.reset();
    // nonNullable controls reset to their initial value, not null
    expect(control.value).toBe('hello');
  });
});

describe('objSchemaToFormGroup', () => {
  it('should create a FormGroup for a simple object schema', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form).toBeInstanceOf(FormGroup);
    expect(form.get('name')).toBeInstanceOf(FormControl);
    expect(form.get('age')).toBeInstanceOf(FormControl);
  });

  it('should create a FormGroup with required fields and reject null', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
      },
      required: ['name'],
    } as const;

    const form = objSchemaToFormGroup(schema);
    const nameControl = form.get('name')!;
    const emailControl = form.get('email')!;

    nameControl.setValue('');
    expect(nameControl.valid).toBeFalse();

    // Non-nullable required field: null should be invalid
    nameControl.setValue(null as unknown as string);
    expect(nameControl.valid).toBeFalse();

    nameControl.setValue('John');
    expect(nameControl.valid).toBeTrue();

    emailControl.setValue('');
    expect(emailControl.valid).toBeTrue();
  });

  it('should apply default values', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        count: { type: 'number' },
      },
    } as const;

    const form = objSchemaToFormGroup(schema, { name: 'default', count: 42 });
    expect(form.get('name')!.value).toBe('default');
    expect(form.get('count')!.value).toBe(42);
  });

  it('should handle nested object schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('address')).toBeInstanceOf(FormGroup);
    const addressGroup = form.get('address') as FormGroup;
    expect(addressGroup.get('street')).toBeInstanceOf(FormControl);
    expect(addressGroup.get('city')).toBeInstanceOf(FormControl);
  });

  it('should handle nested object schemas with default values', () => {
    const schema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema, {
      address: { street: '123 Main St', city: 'Springfield' },
    });
    const addressGroup = form.get('address') as FormGroup;
    expect(addressGroup.get('street')!.value).toBe('123 Main St');
    expect(addressGroup.get('city')!.value).toBe('Springfield');
  });

  it('should handle empty object schema', () => {
    const schema = {
      type: 'object',
      properties: {},
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form).toBeInstanceOf(FormGroup);
  });

  it('should handle object schema with null-type properties', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: 'null' },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    expect(form.get('value')!.value).toBeNull();
  });

  it('should handle object schema with boolean properties', () => {
    const schema = {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('enabled')).toBeInstanceOf(FormControl);
  });

  it('should handle object schema with scalar-item array properties', () => {
    const schema = {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('tags')).toBeInstanceOf(FormControl);
  });

  it('should handle object schema with object-array properties', () => {
    const schema = {
      type: 'object',
      properties: {
        people: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('people')).toBeInstanceOf(FormArray);
  });

  it('should handle anyOf inside an object property', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormGroup);
  });

  it('should handle anyOf with a single non-null schema and accept null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          anyOf: [
            { type: 'string' },
            { type: 'null' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    // Nullable: null should be a valid value
    form.get('value')!.setValue(null as unknown as undefined);
    expect(form.get('value')!.valid).toBeTrue();
  });

  it('should handle anyOf with only null schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          anyOf: [
            { type: 'null' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    expect(form.get('value')!.value).toBeNull();
    // Only-null schema: null is inherently valid
    expect(form.get('value')!.valid).toBeTrue();
  });

  it('should handle oneOf inside an object property', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormGroup);
  });

  it('should handle oneOf with null schema filtered out and accept null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          oneOf: [
            { type: 'string' },
            { type: 'null' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    // Nullable: null should be a valid value
    form.get('value')!.setValue(null as unknown as undefined);
    expect(form.get('value')!.valid).toBeTrue();
  });

  it('should handle allOf inside an object property', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          allOf: [
            { type: 'object', properties: { a: { type: 'string' } } },
            { type: 'object', properties: { b: { type: 'number' } } },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormGroup);
  });

  it('should handle nullable scalar type (type array) and accept null', () => {
    const schema = {
      type: 'object',
      properties: {
        value: { type: ['string', 'null'] as const },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    // Nullable type array: null should be a valid value
    form.get('value')!.setValue(null);
    expect(form.get('value')!.valid).toBeTrue();
  });

  // type: ['null'] as a type array is not supported yet (resolves to never)

  it('should reject null for a required non-nullable property', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'] as const,
    } as const;

    const form = objSchemaToFormGroup(schema);
    const nameControl = form.get('name')!;

    nameControl.setValue(null as unknown as string);
    expect(nameControl.valid).toBeFalse();

    nameControl.setValue('valid');
    expect(nameControl.valid).toBeTrue();
  });

  it('should accept null for a required but nullable anyOf property', () => {
    const schema = {
      type: 'object',
      properties: {
        name: {
          anyOf: [
            { type: 'string' },
            { type: 'null' },
          ],
        },
      },
      required: ['name'] as const,
    } as const;

    const form = objSchemaToFormGroup(schema);
    const nameControl = form.get('name')!;

    // Even though it's required, the null schema makes it nullable
    nameControl.setValue(null as unknown as undefined);
    expect(nameControl.valid).toBeTrue();

    nameControl.setValue('valid' as any);
    expect(nameControl.valid).toBeTrue();
  });

  it('should accept null for a required but nullable type-array property', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: ['string', 'null'] as const },
      },
      required: ['name'] as const,
    } as const;

    const form = objSchemaToFormGroup(schema);
    const nameControl = form.get('name')!;

    // required + nullable type array: null should still be valid
    nameControl.setValue(null);
    expect(nameControl.valid).toBeTrue();

    nameControl.setValue('valid');
    expect(nameControl.valid).toBeTrue();
  });
});

describe('arraySchemaToFormArray', () => {
  it('should create a FormControl for scalar items', () => {
    const schema = {
      type: 'array',
      items: { type: 'string' },
    } as const;

    const result = arraySchemaToFormArray(schema, false);
    expect(result).toBeInstanceOf(FormControl);
  });

  it('should create a FormArray for object items', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    } as const;

    const result = arraySchemaToFormArray(schema, false);
    expect(result).toBeInstanceOf(FormArray);
  });

  it('should populate FormArray with default values for object items', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    } as const;

    const defaults: ({ name?: string })[] = [
      { name: 'Alice' },
      { name: 'Bob' },
    ];
    const result = arraySchemaToFormArray(schema, false, defaults);
    expect(result).toBeInstanceOf(FormArray);
    const arr = result as FormArray;
    expect(arr.length).toBe(2);
  });

  it('should create an empty FormArray when no defaults', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    } as const;

    const result = arraySchemaToFormArray(schema, false);
    expect(result).toBeInstanceOf(FormArray);
    const arr = result as FormArray;
    expect(arr.length).toBe(0);
  });

  it('should apply minItems validator', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
      minItems: 2,
    } as const;

    const defaults: ({ name?: string })[] = [{ name: 'A' }];
    const result = arraySchemaToFormArray(schema, false, defaults);
    expect(result).toBeInstanceOf(FormArray);
    const arr = result as FormArray;
    expect(arr.valid).toBeFalse();
  });

  it('should apply maxItems validator', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
      maxItems: 1,
    } as const;

    const defaults: ({ name?: string })[] = [{ name: 'A' }, { name: 'B' }];
    const result = arraySchemaToFormArray(schema, false, defaults);
    expect(result).toBeInstanceOf(FormArray);
    const arr = result as FormArray;
    expect(arr.valid).toBeFalse();
  });

  it('should apply required validator when required is true', () => {
    const schema = {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' } },
      },
    } as const;

    const result = arraySchemaToFormArray(schema, true);
    expect(result).toBeInstanceOf(FormArray);
    const arr = result as FormArray;
    expect(arr.valid).toBeFalse();
  });

  it('should populate scalar FormControl with default values', () => {
    const schema = {
      type: 'array',
      items: { type: 'number' },
    } as const;

    const defaults: number[] = [1, 2, 3];
    const result = arraySchemaToFormArray(schema, false, defaults);
    expect(result).toBeInstanceOf(FormControl);
    const control = result as FormControl<number[]>;
    expect(control.value).toEqual([1, 2, 3]);
  });
});

describe('integration: complex schemas via objSchemaToFormGroup', () => {
  it('should handle deeply nested objects', () => {
    const schema = {
      type: 'object',
      properties: {
        level1: {
          type: 'object',
          properties: {
            level2: {
              type: 'object',
              properties: {
                level3: { type: 'string' },
              },
            },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema, {
      level1: { level2: { level3: 'deep' } },
    });
    const l2 = (form.get('level1') as FormGroup).get('level2') as FormGroup;
    expect(l2.get('level3')!.value).toBe('deep');
  });

  it('should handle object with mixed property types', () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'integer' },
        active: { type: 'boolean' },
        tags: { type: 'array', items: { type: 'string' } },
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
          },
        },
      },
      required: ['name', 'age'] as const,
    } as const;

    const form = objSchemaToFormGroup(schema, {
      name: 'Alice',
      age: 30,
      active: true,
      tags: ['dev'],
      address: { city: 'NY' },
    });

    expect(form.get('name')!.value).toBe('Alice');
    expect(form.get('age')!.value).toBe(30);
    expect(form.get('active')!.value).toBe(true);
    expect((form.get('tags') as FormControl).value).toEqual(['dev']);
    expect((form.get('address') as FormGroup).get('city')!.value).toBe('NY');
  });

  it('should handle anyOf with object schemas', () => {
    const schema = {
      type: 'object',
      properties: {
        item: {
          anyOf: [
            {
              type: 'object',
              properties: { kind: { type: 'string', const: 'a' } },
            },
            {
              type: 'object',
              properties: { kind: { type: 'string', const: 'b' } },
            },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('item')).toBeInstanceOf(FormGroup);
  });

  it('should handle oneOf with single remaining schema after null filter', () => {
    const schema = {
      type: 'object',
      properties: {
        value: {
          oneOf: [
            { type: 'number' },
            { type: 'null' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('value')).toBeInstanceOf(FormControl);
    // Nullable oneOf: null should be valid
    form.get('value')!.setValue(null as unknown as undefined);
    expect(form.get('value')!.valid).toBeTrue();
  });

  it('should handle schema with no type and only anyOf at the property level', () => {
    const schema = {
      type: 'object',
      properties: {
        data: {
          anyOf: [
            { type: 'string' },
          ],
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.get('data')).toBeInstanceOf(FormControl);
  });

  it('should handle all properties being optional', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'number' },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.valid).toBeTrue();
  });

  it('should handle all properties being required', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
      },
      required: ['a', 'b'] as const,
    } as const;

    const form = objSchemaToFormGroup(schema);
    expect(form.valid).toBeFalse();

    form.get('a')!.setValue('x');
    form.get('b')!.setValue('y');
    expect(form.valid).toBeTrue();
  });

  it('should handle object with array of objects and default values', () => {
    const schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              label: { type: 'string' },
            },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema, {
      items: [
        { id: 1, label: 'first' },
        { id: 2, label: 'second' },
      ],
    });
    const arr = form.get('items') as FormArray;
    expect(arr).toBeInstanceOf(FormArray);
    expect(arr.length).toBe(2);
    expect((arr.at(0) as FormGroup).get('id')!.value).toBe(1);
    expect((arr.at(0) as FormGroup).get('label')!.value).toBe('first');
    expect((arr.at(1) as FormGroup).get('id')!.value).toBe(2);
    expect((arr.at(1) as FormGroup).get('label')!.value).toBe('second');
  });

  it('should handle anyOf prioritized over object type', () => {
    const schema = {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          anyOf: [
            { type: 'object', properties: { mode: { type: 'string' } } },
            { type: 'object', properties: { level: { type: 'number' } } },
          ],
          properties: {
            shared: { type: 'string' },
          },
        },
      },
    } as const;

    const form = objSchemaToFormGroup(schema);
    const configControl = form.get('config');
    expect(configControl).toBeInstanceOf(FormGroup);
  });
});

