/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { RuntimeException } from '@poppinss/exception'
import type { ContainerResolver } from '@adonisjs/fold'

import { debug } from './debug.ts'
import { Item } from './resource/item.ts'
import { Paginator } from './paginator.ts'
import { Collection } from './resource/collection.ts'
import type { JSONDataTypes, ResourceData } from './types.ts'
import { transformerResolver } from './tracing_channels.ts'

/**
 * Checks if a value is a plain object, excluding arrays and null values.
 *
 * This type guard is used internally to validate transformer outputs and
 * ensure that only plain objects are processed during serialization.
 *
 * @param value - The value to check for object type
 *
 * ```ts
 * isObject({}) // true
 * isObject({ key: 'value' }) // true
 * isObject([]) // false
 * isObject(null) // false
 * isObject("string") // false
 * isObject(42) // false
 * ```
 */
export function isObject<T extends Record<string, any>>(value: unknown): value is T {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Transforms data using a transformer instance by calling the specified variant method,
 * then serializes the result recursively. Validates that the transformer returns an object.
 *
 * This function is used internally during the serialization process to execute transformer
 * methods and recursively process their outputs. It ensures the transformer returns a valid
 * object and handles nested relationships up to the specified depth.
 *
 * @param container - AdonisJS container resolver for dependency injection when calling transformer methods
 * @param transformer - The transformer instance containing the variant method to execute
 * @param variant - The transformer method name to call (e.g., 'toObject', 'toSummary')
 * @param depth - Current depth level in the transformation tree (starts at 0)
 * @param maxDepth - Optional maximum depth limit for nested relationships. Use -1 for unlimited depth
 *
 * ```ts
 * const container = app.container.createResolver()
 * const userTransformer = new UserTransformer(userData)
 *
 * // Transform using default toObject method at depth 0, max depth 3
 * const result = await transformAndSerialize(
 *   container,
 *   userTransformer,
 *   'toObject',
 *   0,
 *   3
 * )
 *
 * // Transform using custom variant
 * const summary = await transformAndSerialize(
 *   container,
 *   userTransformer,
 *   'toSummary',
 *   1,
 *   2
 * )
 * ```
 */
export async function transformAndResolve(
  container: ContainerResolver<any>,
  transformer: Record<string, any>,
  variant: string,
  depth: number,
  maxDepth?: number
) {
  const input = await transformerResolver.tracePromise(
    (t, v) => container.call(t, v),
    transformerResolver.hasSubscribers ? { transformer, variant, depth, maxDepth } : undefined,
    undefined,
    transformer,
    variant
  )

  if (!isObject(input)) {
    throw new RuntimeException(
      `Invalid value returned by ${transformer.constructor.name}.${variant}. The returned value must be an object`
    )
  }

  if (debug.enabled) {
    debug('serializing "%s" output %O', `${transformer.constructor.name}.${variant}`, input)
  }
  return resolveValues(container, input, depth, maxDepth)
}

/**
 * Recursively serializes values from a resource data object by resolving nested
 * Items, Collections, and Paginators up to the specified depth.
 *
 * This function processes a resource data object and:
 * - Resolves nested Item, Collection, and Paginator instances by calling their serialize methods
 * - Respects depth limits to prevent infinite recursion in circular relationships
 * - Processes values in parallel for optimal performance
 * - Passes through primitive values and plain objects unchanged
 *
 * @param container - AdonisJS container resolver for dependency injection
 * @param input - The resource data object containing values to serialize (keys to ResourceDataTypes)
 * @param depth - Current depth level in the transformation tree (starts at 0)
 * @param maxDepth - Optional maximum depth limit to prevent deep recursion. Use -1 for unlimited depth,
 *                    or specify a number (e.g., 3) to limit nesting. When depth reaches maxDepth,
 *                    nested resources are skipped
 *
 * ```ts
 * const container = app.container.createResolver()
 *
 * // Serialize resource data with nested transformers
 * const resourceData = {
 *   id: 1,
 *   name: 'John',
 *   user: UserTransformer.transform(userData),
 *   posts: PostTransformer.transform(postsData)
 * }
 * const result = await serializeValues(container, resourceData, 0, 2)
 * // Result: { id: 1, name: 'John', user: {...}, posts: [...] }
 *
 * // With depth limit reached, nested resources are excluded
 * const limitedResult = await serializeValues(container, resourceData, 3, 3)
 * ```
 */
export async function resolveValues(
  container: ContainerResolver<any>,
  input: ResourceData,
  depth: number,
  maxDepth?: number
) {
  const promises: Promise<[string, any]>[] = []
  const output: JSONDataTypes = {}

  for (const [key, value] of Object.entries(input)) {
    if (value instanceof Item || value instanceof Collection || value instanceof Paginator) {
      debug('resolving key "%s" with maxDepth="%s" and depth="%s"', key, maxDepth, depth)
      if (maxDepth && maxDepth !== -1 && depth >= maxDepth) {
        continue
      } else {
        promises.push(
          value
            .resolve(container, maxDepth === -1 ? depth : depth + 1, maxDepth)
            .then((result: any) => [key, result])
        )
      }
    } else {
      output[key] = value as JSONDataTypes
    }
  }

  if (promises.length === 0) {
    return output
  }

  const resolvedPromises = await Promise.all(promises)
  for (const [key, value] of resolvedPromises) {
    output[key] = value
  }

  return output
}
