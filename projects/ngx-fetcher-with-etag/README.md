# ngx-fetcher-with-etag

**A smart, ETag-powered data fetching library for modern Angular applications.**

Stop re-fetching unchanged data. `ngx-fetcher-with-etag` simplifies your data layer with automatic caching, smart polling, and utilities for handling local data.

-----

## 🤔 Why ngx-fetcher-with-etag?

Modern web apps often make redundant API calls, fetching the same data repeatedly. This library solves that problem by leveraging browser caching and HTTP ETag headers. The server tells you when data *hasn't* changed, saving bandwidth and making your app feel faster.

This library automates that entire process and packages it into a clean, reactive, RxJS-powered API.

-----

## ✨ Features

  - ⚡ **ETag**: Seamlessly uses `ETag` / `If-None-Match` headers to avoid re-downloading unchanged data.
  - 🔄 **Polling**: Automatically refreshes data based on server `Expires` headers or custom intervals.
  - 🔍 **Local Lookups**: A service for fetching a list and then accessing individual items synchronously by ID.
  - 🛡️ **Extensible Authentication**: A simple `AuthProvider` system to inject authentication headers into HTTP requests.
  - 👁️ **Fully Reactive**: Built from the ground up with RxJS Observables.

-----

## 🚀 Installation

```bash
npm install ngx-fetcher-with-etag
```

-----

## Core Concepts

The library is built around a few key components that work together:

1.  **`FetcherWithEtag`**: The core engine. It handles a single API endpoint, managing ETag caching and polling.
3.  **`LocalDataLoaderEtagService`**: The most advanced utility. It uses `FetcherWithEtag` to fetch an array of items and then indexes them for instant, synchronous access by ID.
4.  **`AuthProvider`**: A simple class you extend to provide authentication headers for your HTTP requests.

-----

## 📖 API and Usage

### FetcherWithEtag

This is the main class for fetching data from a single endpoint. It handles all the ETag, caching, and polling logic for you.

#### Basic Usage

```typescript
import { FetcherWithEtag } from 'ngx-fetcher-with-etag';

// Create a new fetcher instance
const fetcher = new FetcherWithEtag(
  httpClient,
  authProvider,
  'https://api.example.com/data',
  (raw: RawData) => new Data(raw), // Converter function
  (old: Data, new: Data) => old.id === new.id // Equality check
);

// Subscribe to data updates (only emits when data has actually changed)
fetcher.data$.subscribe(data => console.log('Data updated:', data));

// Subscribe to the loading state
fetcher.loading$.subscribe(loading => console.log('Is loading:', loading));
```

#### Constructor Parameters Explained

**Converter Function** `(raw: RawT) => T`

This function's job is to transform the raw, plain JSON response from your API into a new type or interface that your application can use. This is the perfect place to map fields, add computed properties, or parse dates.

```typescript
// Example: Convert a raw API user into a clean User model
type RawUser = { user_id: string; full_name: string; };
type User = {
  id: string;
  name: string;
  initial: string;
};

function userConverter(raw: RawUser): User {
  return {
    id: raw.user_id,
    name: raw.full_name,
    initial: raw.full_name.charAt(0)
  };
}
```

**Equality Check Function** `(old: T, new: T) => boolean`

This function prevents your `data$` observable from emitting a new value if the data is effectively the same. This is crucial for performance and preventing unnecessary re-renders in your UI. You can define what "equal" means—whether it's a simple ID check or a deep object comparison.

```typescript
// Only emit if the user's name has changed
function userEqualityCheck(old: User, new: User): boolean {
  return old.name === new.name;
}

// Only emit if something has changed
type ItemWithEtag = {
  id: string;
  etag: string;
};

function userEtagCheck(old: ItemWithEtag, new: ItemWithEtag): boolean {
  return old.etag === new.etag;
}
```

-----

### LocalDataLoaderEtagService

This is a powerful abstract service for a common pattern: fetching a list of items and then needing to look up individual items from that list by their ID. It combines the caching of `FetcherWithEtag` with an in-memory, indexed store for O(1) lookups.

#### When to use it

Use this when you have a `users` or `products` endpoint and your app frequently needs to ask, "What's the name of the user with ID `user-123`?" without making another API call.

#### Example Implementation

```typescript
import { LocalDataLoaderEtagService } from 'ngx-fetcher-with-etag';

// 1. Define your data structures
type User = { id: string; name: string; email: string; };
type RawUsersResponse = {
  etag: string; // ETag is required for comparison
  items: User[];
};
type ProcessedUsersData = RawUsersResponse & {
  // This will be added automatically: a map for fast lookups
  byId: Record<string, User>;
};

// 2. Create a service that extends the base class
@Injectable({ providedIn: 'root' })
export class UsersService extends LocalDataLoaderEtagService<
  'items',         // The key in the response containing the array
  'id',            // The key on each item to use as its ID
  User,            // The type of a single item
  ProcessedUsersData, // The final processed data structure (with `byId`)
  RawUsersResponse    // The raw API response
> {
  constructor(http: HttpClient, auth: AuthProvider) {
    super(
      // Provide a function that creates the underlying FetcherWithEtag
      (converter, isEqual) => new FetcherWithEtag(
        http,
        auth,
        'https://api.example.com/users',
        converter,
        isEqual
      ),
      'id',    // Tell it the ID field is named 'id'
      'items'  // Tell it the array is in the 'items' field
    );
  }
}

// 3. Use the service in your component
constructor(private usersService: UsersService) {}

this.usersService.dataLoader$.subscribe((dataLoader) => {
  // dataLoader is an object with a `load` method for synchronous access
  const user = dataLoader.load('user-123'); // Instant local lookup!
  if (user) {
    console.log('User found locally:', user.name);
  }
});
```

-----

### Authentication

Provide authentication headers to your requests by creating a simple `AuthProvider`.

#### Example: JWT Authentication

```typescript
import { AuthProvider } from 'ngx-fetcher-with-etag';
import { HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class JwtAuthProvider extends AuthProvider {
  override getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      return new HttpHeaders({
        Authorization: `Bearer ${token}`
      });
    }
    return new HttpHeaders();
  }
}
```
