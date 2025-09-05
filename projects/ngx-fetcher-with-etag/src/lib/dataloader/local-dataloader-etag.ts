import { catchError, map, of, shareReplay, type Observable } from 'rxjs';

import { FetcherWithEtag } from '../fetcher-with-etag';
import { createById, type ById } from './dataloader-batch';
import { LocalDataLoader } from './local-dataloader';

type RawData<
  ItemsKey extends string,
  IdKey extends string,
  Item extends Readonly<Record<IdKey, number | string>>,
> = Readonly<{ etag: string } & Record<ItemsKey, readonly Item[]>>;

type Data<
  ItemsKey extends string,
  IdKey extends string,
  Item extends Readonly<Record<IdKey, number | string>>,
> = RawData<ItemsKey, IdKey, Item> & Readonly<{ byId: Readonly<ById<Item, IdKey>> }>;

type LocalDataLoaderForData<
  ItemsKey extends string,
  IdKey extends string,
  Item extends Readonly<Record<IdKey, number | string>>,
  T extends Data<ItemsKey, IdKey, Item>,
> = T['byId'] extends Readonly<Record<infer K, infer V>> ? LocalDataLoader<K, V> : never;

/**
 * Abstract class that creates a LocalDataLoader observable based on items from servers.
 *
 * The items come as an array inside an object with a sibling field `etag`, which will
 * be compared to check if the items changed or not.
 *
 * If items were changed (etag changed), then a new `LocalDataLoader` is emitted in the observable.
 *
 * `FetcherWithEtag<T, RawT>` is used to monitor the server endpoint. It will handle polling if
 * configured with a `refreshInterval` or server returns `Expires`.
 *
 * By default `LocalDataLoader` is created passing `T['byId']`, but a custom data loader creator
 * may be given. This data loader is synchronous as all data is available based on the items array
 * that is converted to `T['byId']`.
 *
 * The observable is shared and can be used by multiple subscribers.
 */
export abstract class LocalDataLoaderEtagService<
  ItemsKey extends string,
  IdKey extends string,
  Item extends Readonly<Record<IdKey, number | string>>,
  T extends Data<ItemsKey, IdKey, Item>,
  RawT extends RawData<ItemsKey, IdKey, Item>,
  DataLoader extends LocalDataLoaderForData<ItemsKey, IdKey, Item, T> = LocalDataLoaderForData<
    ItemsKey,
    IdKey,
    Item,
    T
  >,
> {
  readonly fetcher: FetcherWithEtag<T, RawT>;
  readonly dataLoader$: Observable<DataLoader>;

  constructor(
    createFetcherWithEtag: (
      converter: (raw: RawT) => T,
      isEqual: (currentValue: T, newValue: T) => boolean
    ) => FetcherWithEtag<T, RawT>,
    protected readonly idKey: IdKey,
    protected readonly itemsKey: ItemsKey,
    createLocalDataLoader: (byId: T['byId']) => DataLoader = (byId) =>
      new LocalDataLoader(byId) as DataLoader
  ) {
    this.fetcher = createFetcherWithEtag(this.converter.bind(this), this.isEqual.bind(this));

    this.dataLoader$ = this.fetcher.data$.pipe(
      map(({ byId }: T) => createLocalDataLoader(byId as T['byId'])), // byId can be something derived, but will fit the requirements
      catchError((error) => {
        console.error('Error in dataLoader$', error);
        return of(createLocalDataLoader({} as T['byId'])); // empty data loader
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  protected converter(raw: RawT): T {
    const byId = createById(raw[this.itemsKey], this.idKey);
    return { ...raw, byId } as unknown as T; // any overrides can have different kind of conversion from RawT to T, but here it's just that
  }

  protected isEqual(currentValue: T, newValue: T): boolean {
    return currentValue.etag === newValue.etag;
  }
}

/**
 * Abstract class based on LocalDataLoaderEtagService where we assume server
 * payload is a standard:
 * - `ItemsKey='items'`, that is, the array of items is located at field `items`;
 * - `IdKey='id'`, that is, each item has it's identifier at field `id`
 */
export abstract class StandardLocalDataLoaderEtagService<
  Item extends Readonly<Record<'id', number | string>>,
  T extends Data<'items', 'id', Item>,
  RawT extends RawData<'items', 'id', Item>,
  DataLoader extends LocalDataLoaderForData<'items', 'id', Item, T> = LocalDataLoaderForData<
    'items',
    'id',
    Item,
    T
  >,
> extends LocalDataLoaderEtagService<'items', 'id', Item, T, RawT, DataLoader> {
  constructor(
    createFetcherWithEtag: (
      converter: (raw: RawT) => T,
      isEqual: (currentValue: T, newValue: T) => boolean
    ) => FetcherWithEtag<T, RawT>,
    createLocalDataLoader?: (byId: T['byId']) => DataLoader
  ) {
    super(createFetcherWithEtag, 'id', 'items', createLocalDataLoader);
  }
}
