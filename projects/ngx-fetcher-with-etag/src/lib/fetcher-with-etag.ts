import { HttpErrorResponse, type HttpHeaders, type HttpClient, HttpStatusCode } from '@angular/common/http';
import { BehaviorSubject, lastValueFrom } from 'rxjs';

import { AuthProvider } from './auth/auth-provider';
import PollingSubject from './subjects/polling-subject';

/**
 * HTTP Fetcher that handles ETag/If-None-Match/Expires and refresh interval.
 *
 * If may be used as a single shot with `fetch()` method or as an `Observable` using
 * `data$`, in this case the server will be polled using `Expires` header or refresh interval
 * (whatever is shorter).
 *
 * Network activity will be reported using `loading$` observable.
 *
 * @template T Type of the value returned by the fetcher, this will be created by the `converter`.
 * @template RawT Type of the raw value fetched from the server.
 *
 * @param converter Function that converts the raw value into the final value, T.
 * @param isEqual Function that compares two values of type T to check if they are equal. Related to the note below.
 *
 * @example
 * const fetcher = new FetcherWithEtag(
 *  http,
 *  authHeaderService,
 *  'https://api.example.com/data', <--- Let's imagine this has an Expires of 1 minute
 *  (raw: RawData) => new Data(raw),
 *  (old: Data, new: Data) => old.id === new.id
 * );
 *
 * fetcher.data$.subscribe(data => console.log('new data', data));
 * Logs:
 * new data {...}
 * (after 1 minute)
 * new data {...}
 *
 * @note Chrome has a bug where it converts 304 into 200 if there was a previous 200 result
 *       https://issues.chromium.org/issues/40205097 then we check locally for difference
 *       using `isEqual(old, new)`, this may be checking some properties or a deep-equal
 *       check using lodash.isEqual().
 */
export class FetcherWithEtag<T, RawT = unknown> {
  private dataSubject = new PollingSubject(
    this.setupPollingTimeout.bind(this),
    this.clearPollingTimeout.bind(this),
    this.getValue.bind(this)
  );
  data$ = this.dataSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  private etag: string | null = null;
  private expires: number | null = null;
  private lastFetchTimestamp: number | null = null;
  private value?: T;
  private pollingTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly authProvider: AuthProvider,
    private url: string,
    private readonly converter: (raw: RawT) => T,
    private readonly isEqual: (currentValue: T, newValue: T) => boolean,
    private readonly refreshInterval?: number,
    private readonly fetchRefreshesWithoutInterval = false
  ) {}

  /**
   * Synchronously get the last known value, if any.
   *
   * @returns value or undefined if the value is unknown.
   *
   * @see fetch() to get it from HTTP if the value is unknown or expired.
   */
  getValue(): T | undefined {
    return this.value;
  }

  /**
   * Checks both `Expires` header and `refreshInterval` parameter to see how long to delay the next fetch.
   *
   * @returns timeout interval in milliseconds or 0 for expired/outdated values.
   */
  getRefreshIntervalInMilliseconds(): number | undefined {
    const now = Date.now();
    let interval = 0;

    const isValidExpiration = this.expires && this.expires > now;
    if (isValidExpiration) {
      interval = this.expires! - now;
    }

    const isValidRefreshInterval =
      this.lastFetchTimestamp &&
      this.refreshInterval &&
      this.lastFetchTimestamp + this.refreshInterval > now;
    if (isValidRefreshInterval) {
      const refreshInterval = this.lastFetchTimestamp! + this.refreshInterval - now;
      if (interval === 0 || interval > refreshInterval) {
        interval = refreshInterval;
      }
    }

    const isInvalidInterval =
      interval === 0 && this.value !== undefined && !this.expires && !this.refreshInterval;
    if (isInvalidInterval) {
      return undefined;
    }
    return interval;
  }

  /**
   * Fetches the value if needed, otherwise returns the old value.
   *
   * If a fetch was executed before and the known value is fresh, then it's returned without further network access.
   *
   * The value is considered fresh if `Expires` is in the future or if the last fetch timestamp is within the
   * refresh interval.
   *
   * If there was an `ETag` header in the previous response, it's sent as `If-None-Match` and if the server
   * replies 304 (Not Modified) then the previous value is reused.
   *
   * If the server returns a new value (200), then the value is converted using `converter`.
   */
  async fetch(): Promise<T> {
    const interval = this.getRefreshIntervalInMilliseconds();
    if (interval === undefined) {
      if (this.fetchRefreshesWithoutInterval) {
        console.debug(`${this.url}: interval=undefined && fetchRefreshesWithoutInterval=true`);
      } else {
        console.debug(`${this.url}: is never to be refreshed`);
        return this.value!;
      }
    }
    if ((interval ?? 0) > 0) {
      console.debug(`${this.url}: still fresh for ${interval} milliseconds`);
      return this.value!;
    }
    if (!this.url) {
      throw new Error('url is not set');
    }

    const headers = this.getHeaders();
    this.loadingSubject.next(true);
    const response = await lastValueFrom(
      this.httpClient.get<RawT>(this.url, { headers, observe: 'response' })
    );
    this.loadingSubject.next(false);

    if (response.status !== HttpStatusCode.Ok && response.status !== HttpStatusCode.NotModified) {
      console.error(`${this.url}: unexpected response`, response);
      throw new Error(`unexpected response ${response.status} for url ${this.url}`);
    }

    this.etag = response.headers.get('ETag');
    this.lastFetchTimestamp = Date.now();
    this.expires = this.createExpires(response.headers.get('Expires'));

    if (response.status === HttpStatusCode.NotModified) {
      console.log(`${this.url}: response 304 (Not Modified) - reusing data`, response);
    } else if (!response.body) {
      console.warn(`${this.url}: response 200 without a body - ignored`, response);
    } else {
      const newValue = this.converter(response.body);
      if (this.value === undefined || !this.isEqual(this.value, newValue)) {
        this.value = newValue;
        this.dataSubject.next(this.value!);
      } else {
        console.log(`${this.url}: response 200 with equal value - ignored`);
      }
    }
    return this.value!;
  }

  async reset(newUrl?: string): Promise<void> {
    this.etag = null;
    this.expires = null;
    this.lastFetchTimestamp = null;
    if (newUrl && newUrl !== this.url) {
      this.value = undefined;
      this.url = newUrl;
    }

    if (this.pollingTimeout) {
      this.clearPollingTimeout();
      this.setupPollingTimeout();
    } else if (this.dataSubject.observed) {
      await this.fetch();
    }
  }

  private createExpires(expiresString: string | null): number | null {
    if (expiresString) {
      return new Date(expiresString).getTime();
    }
    return null;
  }

  private getHeaders(): HttpHeaders {
    const authHeaders = this.authProvider.getAuthHeaders();
    if (!this.etag) {
      return authHeaders;
    }
    return authHeaders.set('If-None-Match', this.etag);
  }

  private clearPollingTimeout(): void {
    if (this.pollingTimeout === undefined) {
      return;
    }
    console.log(`${this.url}: stop polling`);
    clearTimeout(this.pollingTimeout);
    this.pollingTimeout = undefined;
  }

  private setupPollingTimeout(): void {
    const interval = this.getRefreshIntervalInMilliseconds();
    if (interval === undefined) {
      console.log(`${this.url}: does not need polling`);
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = undefined;

      // however this is the first subscriber, let's try to refresh
      this.refreshData(); // no await
      return;
    }

    this.pollingTimeout = setTimeout(() => {
        console.log(`${this.url}: fetch in ${interval} milliseconds`);
        this.onPollingTimeout();
    }, interval);
  }

  private async onPollingTimeout(): Promise<void> {
    if (!this.dataSubject.observed) {
      console.log(`${this.url}: stop polling since not observed`);
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = undefined;
      return;
    }

    await this.refreshData();

    if (!this.dataSubject.observed) {
      console.log(`${this.url}: stop polling since not observed`);
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = undefined;
      return;
    }
    this.setupPollingTimeout();
  }

  private async refreshData(): Promise<void> {
    try {
      await this.fetch();
    } catch (e: unknown) {
      if (!(e instanceof HttpErrorResponse)) {
        return;
      }

      if (e.status !== HttpStatusCode.NotModified) {
        console.error(`${this.url}: failed to fetch (${e})`);
        this.dataSubject.error(e);
        return;
      }

      this.etag = e.headers.get('ETag');
      this.lastFetchTimestamp = Date.now();

      const expiresString = e.headers.get('Expires');
      this.expires = expiresString ? new Date(expiresString).getTime() : null;
    }
  }
}
