export type IdKeyValueType<T extends {}, K extends keyof T> = T[K] & (string | number | symbol);
export type ById<T extends {}, K extends keyof T> = Record<IdKeyValueType<T, K>, T>;

/**
 * Creates a map of entities indexed by a specified key.
 *
 * @template T - The type of the entities.
 * @template K - The key of the entities used for indexing.
 *
 * @param entities - The array of entities to be indexed.
 * @param idKey - The key of the entities to use for indexing.
 *
 * @returns {ById<T, K>} A map of entities indexed by the specified key.
 */
export function createById<T extends {}, K extends keyof T>(
  entities: readonly T[],
  idKey: K
): ById<T, K> {
  return entities.reduce(
    (map: ById<T, K>, entity: T) => {
      const key = entity[idKey] as IdKeyValueType<T, K>;
      map[key] = entity;
      return map;
    },
    {} as ById<T, K>
  );
}

/**
 * Retrieves a batch of entities from a list of IDs.
 *
 * @template T - The type of the entities.
 * @template K - The type of the key used to identify entities.
 *
 * @param ids - An array of IDs to retrieve entities for. Each ID must be of type string, number, or symbol.
 * @param entities - An array of entities to search within.
 * @param idKey - The key used to identify entities within the array.
 *
 * @returns An array of entities that match the provided IDs, in the same order as the provided IDs.
 */
export function dataLoaderBatchFromIds<T extends {}, K extends keyof T>(
  ids: readonly (T[K] & (string | number | symbol))[],
  entities: readonly T[],
  idKey: K
): T[] {
  const lookupMap = createById(entities, idKey);
  return ids.map((id) => lookupMap[id]);
}
