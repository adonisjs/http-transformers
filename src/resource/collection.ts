/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import { type RuntimeException } from '@poppinss/exception'

import { transformAndResolve } from '../helpers.ts'
import {
  type Next,
  type ExtractTransformerVariants,
  type UnpackAsTopLevelCollection,
} from '../types.ts'

/**
 * Represents a collection of transformed items from an array of source data.
 * This class is typically created using the `BaseTransformer.transform()` method
 * when passing an array.
 *
 * @template Transformer - The transformer class used to transform individual items
 * @template MaxDepth - Maximum depth for nested transformations
 * @template Variant - The transformer method variant to use for serialization
 *
 * ```ts
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return { id: this.resource.id, name: this.resource.name }
 *   }
 * }
 *
 * const users = [user1, user2, user3]
 * const collection = UserTransformer.transform(users)
 * const serialized = await serialize(collection)
 * ```
 */
export class Collection<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Private debugging error instance for troubleshooting
   */
  #debuggingError?: RuntimeException

  /**
   * Type identifier for the collection resource
   */
  $type: 'collection' = 'collection'

  /**
   * Creates a new Collection instance. This constructor is typically not called directly.
   * Use `BaseTransformer.transform()` instead.
   *
   * @param transformerData Array of data to be transformed
   * @param transformer Constructor for the transformer class
   * @param maxDepth Maximum depth for nested transformations
   * @param variant Variant method name to use for transformation
   * @param debuggingError Runtime exception for debugging purposes
   */
  constructor(
    protected transformerData: [resource: any[], ...rest: any[]],
    public transformer: { new (...args: any[]): Transformer },
    public maxDepth: MaxDepth,
    public variant: Variant,
    debuggingError?: RuntimeException
  ) {
    this.#debuggingError = debuggingError
  }

  /**
   * Specify the maximum depth of nested relationships to be resolved when
   * serializing the collection.
   *
   * This is useful to prevent infinite recursion or to limit the amount of data
   * fetched for deeply nested relationships. Relationships beyond this depth will
   * be excluded from the serialized output.
   *
   * @param value Maximum depth level for nested transformations (valid values: 1, 2, 3, 4, 5, or 6)
   *
   * @example
   * ```ts
   * // Limit depth to 2 levels
   * const posts = PostTransformer.transform(userData.posts)
   *   .depth(2)
   *
   * // This allows: posts -> comments -> author (2 levels)
   * // But excludes: posts -> comments -> author -> profile (3 levels)
   * ```
   */
  depth<T extends Next[number]>(value: T): Collection<Transformer, T, Variant> {
    return new Collection(
      this.transformerData,
      this.transformer,
      value,
      this.variant,
      this.#debuggingError
    )
  }

  /**
   * Specify which transformer variant method to use for serialization.
   *
   * Transformers can define multiple methods (variants) for different representations
   * of the same data (e.g., toObject, toSummary, toDetailed). This method allows you
   * to choose which variant to use for this collection.
   *
   * @param value Name of the transformer variant method to use (must be a method name that
   *              returns ResourceData or Promise<ResourceData>)
   *
   * @example
   * ```ts
   * // Use default toObject variant
   * const users = UserTransformer.transform(userData)
   *
   * // Use custom toSummary variant for lighter payload
   * const userSummaries = UserTransformer.transform(userData)
   *   .useVariant('toSummary')
   *
   * // Use detailed variant for admin view
   * const detailedUsers = UserTransformer.transform(userData)
   *   .useVariant('toDetailed')
   * ```
   */
  useVariant<V extends ExtractTransformerVariants<Transformer>>(
    value: V
  ): Collection<Transformer, MaxDepth, V> {
    return new Collection(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      value,
      this.#debuggingError
    )
  }

  /**
   * Resolve the collection by transforming each item and resolving nested relationships.
   * This method is typically called internally by the serializer.
   *
   * The resolution process:
   * 1. Creates a transformer instance for each item in the collection
   * 2. Calls the variant method on each transformer
   * 3. Recursively resolves nested relationships up to the specified depth
   * 4. Returns an array of resolved objects
   *
   * @param container - AdonisJS container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override. When set to -1, uses unlimited depth
   */
  resolve(container: ContainerResolver<any>, depth: number, maxDepth?: number) {
    const [resources, rest] = this.transformerData

    return Promise.all(
      resources.map((row) =>
        transformAndResolve(
          container,
          new this.transformer(row, ...rest),
          this.variant,
          depth,
          maxDepth === -1 ? undefined : (maxDepth ?? this.maxDepth)
        )
      )
    ) as unknown as Promise<UnpackAsTopLevelCollection<this, undefined>>
  }
}
