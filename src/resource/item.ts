/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ContainerResolver } from '@adonisjs/fold'
import { RuntimeException } from '@poppinss/exception'

import { transformAndResolve } from '../helpers.ts'
import type { ExtractTransformerVariants, Next, UnpackAsTopLevelItem } from '../types.ts'

/**
 * Represents a single transformed item from source data. This class is typically
 * created using the `BaseTransformer.transform()` method when passing a single object.
 *
 * @template Transformer - The transformer class used to transform the item
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
 * const item = UserTransformer.transform(userData)
 * const serialized = await serialize(item)
 * ```
 */
export class Item<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Private debugging error instance for troubleshooting
   */
  #debuggingError?: RuntimeException

  /**
   * Type identifier for the item resource
   */
  $type: 'item' = 'item'

  /**
   * Creates a new Item instance. This constructor is typically not called directly.
   * Use `BaseTransformer.transform()` instead.
   *
   * @param transformerData - The data item to be transformed
   * @param transformer - Constructor for the transformer class
   * @param maxDepth - Maximum depth for nested transformations
   * @param variant - Variant method name to use for transformation
   * @param debuggingError - Error thrown when the resource is undefined. Create it at the
   *                         transformer call site to get a useful stack trace
   */
  constructor(
    protected transformerData: [resource: any, ...rest: any[]],
    public transformer: { new (...args: any[]): Transformer },
    public maxDepth: MaxDepth,
    public variant: Variant,
    debuggingError?: RuntimeException
  ) {
    this.#debuggingError = debuggingError
  }

  /**
   * Specify the maximum depth of nested relationships to be resolved when
   * serializing the item.
   *
   * This is useful to prevent infinite recursion or to limit the amount of data
   * fetched for deeply nested relationships. Relationships beyond this depth will
   * be excluded from the serialized output.
   *
   * @param value - Maximum depth level for nested transformations (valid values: 1, 2, 3, 4, 5, or 6)
   *
   * ```ts
   * // Limit depth to 3 levels
   * const user = UserTransformer.transform(userData)
   *   .depth(3)
   *
   * // This allows: user -> posts -> comments -> author (3 levels)
   * // But excludes: user -> posts -> comments -> author -> profile (4 levels)
   * ```
   */
  depth<T extends Next[number]>(value: T): Item<Transformer, T, Variant> {
    return new Item(
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
   * to choose which variant to use for this item.
   *
   * @param value - Name of the transformer variant method to use (must be a method name that
   *                 returns ResourceData or Promise<ResourceData>)
   *
   * ```ts
   * // Use default toObject variant
   * const user = UserTransformer.transform(userData)
   *
   * // Use custom toSummary variant for lighter payload
   * const userSummary = UserTransformer.transform(userData)
   *   .useVariant('toSummary')
   *
   * // Use detailed variant for admin view
   * const detailedUser = UserTransformer.transform(userData)
   *   .useVariant('toDetailed')
   * ```
   */
  useVariant<V extends ExtractTransformerVariants<Transformer>>(
    value: V
  ): Item<Transformer, MaxDepth, V> {
    return new Item(
      this.transformerData,
      this.transformer,
      this.maxDepth,
      value,
      this.#debuggingError
    )
  }

  /**
   * Resolve the item by transforming it and resolving nested relationships.
   * This method is typically called internally by the serializer function.
   *
   * The resolution process:
   * 1. Validates that the transformer data is not undefined
   * 2. Creates a transformer instance with the data
   * 3. Calls the variant method on the transformer
   * 4. Recursively resolves nested relationships up to the specified depth
   * 5. Returns the resolved object
   *
   * @param container - AdonisJS container resolver for dependency injection
   * @param depth - Current depth level in the transformation tree
   * @param maxDepth - Optional maximum depth override. When set to -1, uses unlimited depth
   */
  resolve(container: ContainerResolver<any>, depth: number, maxDepth?: number) {
    const [resource, rest] = this.transformerData

    /**
     * If its undefined after unpacking, then throw an error
     */
    if (resource === undefined) {
      this.#debuggingError ??= new RuntimeException()
      this.#debuggingError.message =
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      throw this.#debuggingError
    }

    return transformAndResolve(
      container,
      new this.transformer(resource, ...rest),
      this.variant,
      depth,
      maxDepth === -1 ? undefined : (maxDepth ?? this.maxDepth)
    ) as unknown as Promise<UnpackAsTopLevelItem<this, undefined>>
  }
}
