/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'

import { Maybe } from './maybe.ts'
import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { Collection } from './resource/collection.ts'
import { type ExtractTransformerRestTypes } from './types.ts'

/**
 * Base class for creating custom data transformers. Provides utilities for transforming
 * data into consistent API responses with support for relationships and conditional values.
 *
 * ```ts
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return {
 *       id: this.resource.id,
 *       name: this.resource.name,
 *       // Transform related data
 *       profile: UserTransformer.transform(this.whenLoaded(this.resource.profile)),
 *       posts: PostTransformer.transform(this.whenLoaded(this.resource.posts)),
 *       // Conditional values
 *       isAdmin: this.when(this.resource.role === 'admin', () => true, false)
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseTransformer<T> {
  /**
   * Static method to transform data into Item or Collection instances.
   * Handles single objects, arrays, null values, and Maybe-wrapped values.
   *
   * This method is overloaded to handle different input types and return appropriate
   * Item or Collection instances based on the input.
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return { id: this.resource.id, name: this.resource.name }
   *   }
   * }
   *
   * // Transform single user
   * const userItem = UserTransformer.transform(user)
   *
   * // Transform array of users
   * const userCollection = UserTransformer.transform([user1, user2])
   *
   * // Transform with Maybe wrapper
   * const maybeUser = UserTransformer.transform(new Maybe(user))
   * ```
   */
  /**
   * Transform data wrapped in Maybe that can be undefined
   *
   * @param data - Maybe-wrapped data that can be undefined
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0] | undefined>,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Item<InstanceType<Self>, 1, 'toObject'> | undefined

  /**
   * Transform a single data object
   *
   * @param data - Single data object to transform
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0],
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Item<InstanceType<Self>, 1, 'toObject'>

  /**
   * Transform data wrapped in Maybe that can be undefined or null
   *
   * @param data - Maybe-wrapped data that can be undefined or null
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0] | null>,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Item<InstanceType<Self>, 1, 'toObject'> | undefined | null

  /**
   * Transform a single data object that can be null
   *
   * @param data - Single data object that can be null
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0] | null,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Item<InstanceType<Self>, 1, 'toObject'> | null

  /**
   * Transform an array wrapped in Maybe that can be undefined
   *
   * @param data - Maybe-wrapped array that can be undefined
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: Maybe<ConstructorParameters<Self>[0][] | undefined>,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Collection<InstanceType<Self>, 1, 'toObject'> | undefined

  /**
   * Transform an array of data objects
   *
   * @param data - Array of data objects to transform
   */
  static transform<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0][],
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Collection<InstanceType<Self>, 1, 'toObject'>

  /**
   * Implementation method that handles all transform overloads
   *
   * @param data - Union of all possible data types that can be transformed
   */
  static transform<Self extends { new (...args: any[]): any }>(
    this: Self,
    data:
      | ConstructorParameters<Self>[0]
      | null
      | Maybe<ConstructorParameters<Self>[0] | null>
      | ConstructorParameters<Self>[0][]
      | Maybe<ConstructorParameters<Self>[0][]>,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ) {
    /**
     * If optional values are allowed and the value is undefined, then
     * we return undefined
     */
    const canBeOptional = data instanceof Maybe
    const unwrappedValue = canBeOptional ? data.value : data
    if (canBeOptional && unwrappedValue === undefined) {
      return undefined
    }

    if (Array.isArray(unwrappedValue)) {
      return new Collection([unwrappedValue, rest], this, 1, 'toObject', new RuntimeException())
    }

    if (unwrappedValue === null) {
      return null
    }

    return new Item<InstanceType<Self>, 1, 'toObject'>(
      [unwrappedValue, rest],
      this,
      1,
      'toObject',
      new RuntimeException()
    )
  }

  /**
   * Create a paginated collection from an array of data with pagination metadata.
   *
   * @param data - Array of data objects to transform into a paginated collection
   * @param metaData - Pagination metadata (e.g., page, perPage, total, etc.)
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return { id: this.resource.id, name: this.resource.name }
   *   }
   * }
   *
   * // Create paginated collection
   * const paginatedUsers = UserTransformer.paginate(
   *   [user1, user2, user3],
   *   { page: 1, perPage: 10, total: 50 }
   * )
   * ```
   */
  static paginate<Self extends { new (resource: any, ...rest: any[]): any }>(
    this: Self,
    data: ConstructorParameters<Self>[0][],
    metaData: Record<string, any>,
    ...rest: ExtractTransformerRestTypes<ConstructorParameters<Self>>
  ): Paginator<InstanceType<Self>, 1, 'toObject'> {
    return new Paginator(
      new Collection([data, rest], this, 1, 'toObject', new RuntimeException()),
      metaData
    )
  }

  /**
   * Create a new transformer instance with the provided resource data.
   *
   * This constructor is typically not called directly. Instead, use the static
   * `transform` method to create Item or Collection instances.
   *
   * @param resource - The raw resource data to be transformed
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   constructor(user: User) {
   *     super(user)
   *   }
   * }
   * ```
   */
  constructor(protected resource: T) {}

  /**
   * Wrap a value in a Maybe container to handle potentially undefined values.
   * This is useful for relationships that may or may not be loaded.
   *
   * @param value - The value to wrap in a Maybe container
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return {
   *       id: this.resource.id,
   *       profile: ProfileTransformer.transform(this.whenLoaded(this.resource.profile))
   *     }
   *   }
   * }
   * ```
   */
  whenLoaded<Value>(value: Value): Maybe<Value> {
    return new Maybe(value)
  }

  /**
   * Omits the specified keys from a data object and returns a shallow copy
   * without those keys.
   *
   * @param data - The source object to omit keys from
   * @param keys - Array of keys to omit from the data object
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return this.omit(this.resource.toAttributes(), ['password', 'internalId'])
   *   }
   * }
   * ```
   */
  omit<
    Data extends Record<string, any>,
    Keys extends { [K in keyof Data]: Data[K] extends Function ? never : K }[keyof Data],
  >(data: Data, keys: Keys[] | readonly Keys[]): Omit<Data, Keys> {
    const result = { ...data }
    for (const key of keys) {
      delete result[key]
    }
    return result as Omit<Data, Keys>
  }

  /**
   * Picks only the specified keys from a data object and returns a shallow copy
   * containing only those keys.
   *
   * @param data - The source object to pick keys from
   * @param keys - Array of keys to pick from the data object
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toSummary() {
   *     return this.pick(this.resource, ['id', 'name', 'email'])
   *   }
   * }
   * ```
   */
  pick<
    Data extends Record<string, any>,
    Keys extends { [K in keyof Data]: Data[K] extends Function ? never : K }[keyof Data],
  >(data: Data, keys: Keys[] | readonly Keys[]): Pick<Data, Keys> {
    const result = {} as Pick<Data, Keys>
    for (const key of keys) {
      result[key] = data[key]
    }
    return result
  }

  /**
   * Conditionally compute a value based on a boolean condition. This is a cleaner
   * alternative to using ternary operators in transformers.
   *
   * @param conditional - Boolean condition to evaluate
   * @param resolver - Function that returns the value when condition is true
   * @param fallback - Optional fallback value when condition is false (defaults to undefined)
   *
   * ```ts
   * class UserTransformer extends BaseTransformer<User> {
   *   toObject() {
   *     return {
   *       id: this.resource.id,
   *       name: this.resource.name,
   *       // Include role only for admins
   *       role: this.when(this.resource.role === 'admin', () => 'admin'),
   *       // Include with fallback
   *       status: this.when(this.resource.isActive, () => 'active', 'inactive')
   *     }
   *   }
   * }
   * ```
   */
  when<Value, Fallback = undefined>(
    conditional: boolean,
    resolver: () => Value,
    fallback?: Fallback
  ): Value | Fallback {
    return conditional ? resolver() : (fallback ?? (undefined as Fallback))
  }
}
