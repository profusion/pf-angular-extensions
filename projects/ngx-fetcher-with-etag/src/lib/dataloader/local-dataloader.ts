export class LocalDataLoader<K extends string | number | symbol, T> {
  constructor(private readonly byId: Readonly<Record<K, T>>) {}
  load(id: K): T | undefined {
    return this.byId[id];
  }
}
