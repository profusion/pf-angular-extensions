import { Subject, type Subscriber, type Subscription } from 'rxjs';

/**
 * Similar to BehaviorSubject but will not deliver the initial value if it's undefined.
 *
 * On the first subscribe it will start polling and will stop on the last unsubscribe.
 */
export default class PollingSubject<T> extends Subject<T> {
  constructor(
    private readonly startPolling: () => void,
    private readonly endPolling: () => void,
    private readonly getValue: () => T | undefined
  ) {
    super();
  }

  /** @internal */
  protected _subscribe(subscriber: Subscriber<T>): Subscription {
    if (!this.observed) {
      this.startPolling();
    }
    // @ts-ignore: _subscribe exists from Observable, see https://github.com/ReactiveX/rxjs/blob/7.8.1/src/internal/BehaviorSubject.ts
    const subscription = super._subscribe(subscriber);
    if (!subscription.closed) {
      const value = this.getValue();
      if (value !== undefined) {
        subscriber.next(value); // similar to BehaviorSubject, but only if value is already known
      }
    }
    return subscription;
  }

  override unsubscribe(): void {
    super.unsubscribe();
    if (!this.observed) {
      this.endPolling();
    }
  }
}
