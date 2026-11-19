/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Container, type ContainerResolver } from '@adonisjs/fold'
import { RuntimeException } from '@poppinss/exception'

import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { isObject, resolveValues } from './helpers.ts'
import { Collection } from './resource/collection.ts'
import {
  type ItemContract,
  type PaginatorContract,
  type ResourceDataTypes,
  type CollectionContract,
  type UnpackTopLevelValues,
  type UnpackAsTopLevelItem,
  type UnpackAsTopLevelCollection,
  type UnpackAsTopLevelPaginator,
} from './types.ts'

/**
 * Base class for implementing custom serializers that control how transformed
 * data is serialized and wrapped for API responses.
 *
 * Serializers provide control over:
 * - How individual items and collections are wrapped (e.g., in a "data" key)
 * - How pagination metadata is structured and transformed
 *
 * @template Wrappers - Configuration object for wrapper keys and metadata transformation
 *
 * ```typescript
 * class ApiSerializer extends BaseSerializer<{
 *   Wrap: 'data'
 *   MetadataKey: 'metadata'
 *   PaginationMetaData: { page: number; totalPages: number }
 * }> {
 *   wrap = 'data' as const
 *   metadataKey = 'metadata' as const
 *
 *   definePaginationMetaData(metaData: any) {
 *     return {
 *       page: metaData.currentPage,
 *       totalPages: metaData.lastPage
 *     }
 *   }
 * }
 *
 * const serializer = new ApiSerializer()
 * const result = await serializer.serialize(UserTransformer.transform(user))
 * // Result: { data: { id: 1, name: "John" } }
 * ```
 */
export abstract class BaseSerializer<
  Wrappers extends {
    Wrap?: string
    MetadataKey?: string
    PaginationMetaData?: Record<string, any>
  } = {},
> {
  /**
   * The key name to wrap response data under. Set to undefined to disable wrapping.
   */
  abstract wrap: Wrappers['Wrap']

  /**
   * The key name to wrap pagination metadata under. Set to undefined to disable wrapping.
   */
  metadataKey: Wrappers['MetadataKey'] | undefined = undefined

  /**
   * Transforms raw pagination metadata into the desired format for API responses.
   *
   * @param metaData - The raw pagination metadata from the paginator
   */
  abstract definePaginationMetaData(metaData: unknown): Wrappers['PaginationMetaData']

  /**
   * Internal method to wrap a value under a specified key.
   *
   * If no wrapper is provided, returns the value as-is.
   * Otherwise, wraps the value in an object with the wrapper as the key.
   *
   * @param value - The value to wrap
   * @param wrapper - The key name to wrap the value under, or undefined to skip wrapping
   *
   * @example
   * ```typescript
   * #wrap({ id: 1 }, 'data')
   * // Returns: { data: { id: 1 } }
   *
   * #wrap({ id: 1 }, undefined)
   * // Returns: { id: 1 }
   * ```
   */
  #wrap(value: any, wrapper: string | undefined) {
    if (!wrapper) {
      return value
    }
    return { [wrapper]: value }
  }

  /**
   * Type guard to check if metadata conforms to the Lucid paginator metadata structure.
   *
   * Validates that the metadata object contains all expected pagination fields
   * used by AdonisJS Lucid ORM paginators.
   *
   * @param metaData - The metadata object to check
   *
   * @example
   * ```typescript
   * const metadata = {
   *   total: '100',
   *   perPage: '10',
   *   currentPage: '1',
   *   lastPage: '10',
   *   firstPage: '1',
   *   firstPageUrl: '/users?page=1',
   *   lastPageUrl: '/users?page=10',
   *   nextPageUrl: '/users?page=2',
   *   previousPageUrl: null
   * }
   *
   * if (this.isLucidPaginatorMetaData(metadata)) {
   *   // metadata is typed as Lucid paginator metadata
   *   console.log(metadata.currentPage)
   * }
   * ```
   */
  protected isLucidPaginatorMetaData(metaData: unknown): metaData is {
    total: string
    perPage: string
    currentPage: string
    lastPage: string
    firstPage: string
    firstPageUrl: string
    lastPageUrl: string
    nextPageUrl: string
    previousPageUrl: string
  } {
    if (!metaData || typeof metaData !== 'object' || Array.isArray(metaData)) {
      return false
    }
    const expectedKeys = [
      'total',
      'perPage',
      'currentPage',
      'lastPage',
      'firstPage',
      'firstPageUrl',
      'lastPageUrl',
      'nextPageUrl',
      'previousPageUrl',
    ]
    return expectedKeys.every((key) => key in metaData)
  }

  /**
   * Serializes a record of resource data types into plain JavaScript objects.
   *
   * @param data - The resource data record to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<Data extends Record<string, ResourceDataTypes | PaginatorContract<any, any, any>>>(
    data: Data,
    resolver?: ContainerResolver<any>
  ): Promise<
    Wrappers['Wrap'] extends string
      ? { [K in Wrappers['Wrap']]: UnpackTopLevelValues<Data> }
      : UnpackTopLevelValues<Data>
  >

  /**
   * Serializes an Item resource into its plain JavaScript representation.
   *
   * @param resource - The Item resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourceItem extends ItemContract<any, any, any>>(
    resource: ResourceItem,
    resolver?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelItem<ResourceItem, Wrappers['Wrap']>>

  /**
   * Serializes a Collection resource into an array of plain JavaScript objects.
   *
   * @param collection - The Collection resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourceCollection extends CollectionContract<any, any, any>>(
    collection: ResourceCollection,
    resolver?: ContainerResolver<any>
  ): Promise<
    Wrappers['Wrap'] extends string
      ? UnpackAsTopLevelCollection<ResourceCollection, Wrappers['Wrap']> & { metadata?: never }
      : UnpackAsTopLevelCollection<ResourceCollection, Wrappers['Wrap']>
  >

  /**
   * Serializes a Paginator resource into paginated data with metadata.
   *
   * @param paginator - The Paginator resource to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<ResourcePaginator extends PaginatorContract<any, any, any>>(
    paginator: ResourcePaginator,
    resolver?: ContainerResolver<any>
  ): Promise<
    UnpackAsTopLevelPaginator<
      ResourcePaginator,
      Wrappers['Wrap'] extends string ? Wrappers['Wrap'] : 'data',
      Wrappers['MetadataKey'] extends string ? Wrappers['MetadataKey'] : 'metadata',
      Wrappers['PaginationMetaData']
    >
  >

  /**
   * Serializes any other value by returning it as-is wrapped in a Promise.
   *
   * @param value - The value to serialize
   * @param container - Optional container resolver for dependency injection
   */
  serialize<Value>(value: Value, resolver?: ContainerResolver<any>): Promise<Value>
  serialize(
    data: Record<string, ResourceDataTypes> | Item<any, any, any> | Collection<any, any, any>,
    resolver?: ContainerResolver<any>
  ): Promise<any> {
    if (data === null) {
      throw new RuntimeException('Cannot serialize an item with null value')
    }

    const containerResolver = resolver ?? new Container().createResolver()
    if (data instanceof Item) {
      return data.resolve(containerResolver, 0, -1).then((value) => this.#wrap(value, this.wrap))
    }

    if (data instanceof Collection) {
      return data.resolve(containerResolver, 0, -1).then((value) => this.#wrap(value, this.wrap))
    }

    if (data instanceof Paginator) {
      const wrapperKey = this.wrap ?? 'data'
      const metadataKey = this.metadataKey ?? 'metadata'
      return data.resolve(containerResolver, 0, -1).then((value) => {
        return {
          [wrapperKey]: value.data,
          [metadataKey]: this.definePaginationMetaData(value.metadata),
        }
      })
    }

    if (isObject(data)) {
      return resolveValues(containerResolver, data, 0, -1).then((value) =>
        this.#wrap(value, this.wrap)
      )
    }

    return data
  }

  /**
   * Serializes a record of resource data types without wrapping the output.
   */
  serializeWithoutWrapping<
    Data extends Record<string, ResourceDataTypes | PaginatorContract<any, any, any>>,
  >(data: Data, resolver?: ContainerResolver<any>): Promise<UnpackTopLevelValues<Data>>

  /**
   * Serializes an Item resource without wrapping the output.
   */
  serializeWithoutWrapping<ResourceItem extends ItemContract<any, any, any>>(
    resource: ResourceItem,
    resolver?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelItem<ResourceItem, undefined>>

  /**
   * Serializes a Collection resource without wrapping the output.
   */
  serializeWithoutWrapping<ResourceCollection extends CollectionContract<any, any, any>>(
    collection: ResourceCollection,
    resolver?: ContainerResolver<any>
  ): Promise<UnpackAsTopLevelCollection<ResourceCollection, undefined>>

  /**
   * Serializes a Paginator resource without wrapping the output.
   */
  serializeWithoutWrapping<ResourcePaginator extends PaginatorContract<any, any, any>>(
    paginator: ResourcePaginator,
    resolver?: ContainerResolver<any>
  ): Promise<
    UnpackAsTopLevelPaginator<ResourcePaginator, 'data', 'metadata', Wrappers['PaginationMetaData']>
  >

  /**
   * Serializes any other value by returning it as-is wrapped in a Promise.
   */
  serializeWithoutWrapping<Value>(value: Value, resolver?: ContainerResolver<any>): Promise<Value>
  serializeWithoutWrapping(
    data: Record<string, ResourceDataTypes> | Item<any, any, any> | Collection<any, any, any>,
    resolver?: ContainerResolver<any>
  ): Promise<any> {
    if (data === null) {
      throw new RuntimeException('Cannot serialize an item with null value')
    }

    const containerResolver = resolver ?? new Container().createResolver()
    if (data instanceof Item) {
      return data.resolve(containerResolver, 0, -1)
    }

    if (data instanceof Collection) {
      return data.resolve(containerResolver, 0, -1)
    }

    if (data instanceof Paginator) {
      return data.resolve(containerResolver, 0, -1).then((value) => {
        return {
          data: value.data,
          metadata: this.definePaginationMetaData(value.metadata),
        }
      })
    }

    if (isObject(data)) {
      return resolveValues(containerResolver, data, 0, -1)
    }

    return data
  }
}
