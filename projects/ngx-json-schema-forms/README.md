# ngx-json-schema-forms

Automatically generate ReactiveForms components based on your JSON Schema definitions

## How it works

The generator functions assumes a fully resolved and fully typed JSON Schema object is
passed as an argument to them, and it returns a fully hierarchical Form control (Group, Array or
Control) structure (typed). Validators are automatically constructed based on the Schema fields.
For example:

```typescript
const mySchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      minLength: 3,
    },
    email: {
      type: 'string',
      pattern: '^[^@]+@[^@]+\.[^@]+$',
    },
    age: {
      type: 'number',
      minimum: 18,
    },
    preferences: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          value: { type: ['string', 'null'] },
        }
      },
    },
    id: {
      anyOf: [
        { type: 'string' },
        { type: 'integer' },
      ],
    }
  },
  required: ['name', 'email', 'age'],
} as const;
```

will generate the following Forms:

```typescript
FormGroup<{
  name: FormControl<string>; // Validators.required, Validators.minLength(3)
  email: FormControl<string>; // Validators.required, Validators.pattern(^[^@]+@[^@]+\.[^@]+$)
  age: FormControl<number>; // Validators.required, Validators.min(18)
  preferences: FormArray<FormGroup<{
    name: FormControl<string>;
    value: FormControl<string | null>;
  }>>;
  id: FormGroup<{
    0: FormControl<string>;
    1: FormControl<number>;
  }>
}>
```
