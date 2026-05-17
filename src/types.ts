/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type BaseTransformer } from './base_transformer.ts'
import { type Prettify, type ExtractUndefined, type ExtractDefined } from '@poppinss/types'

/**
 * Extracts rest parameters from transformer constructor parameters, excluding the first parameter.
 * Used to preserve additional constructor arguments when creating transformer instances.
 *
 * @template T - The constructor parameter tuple to extract from
 *
 * ```typescript
 * type Params = [User, boolean, string]
 * type Rest = ExtractTransformerRestTypes<Params>
 * // Result: [boolean, string]
 * ```
 */
export type ExtractTransformerRestTypes<T> = T extends [any, ...infer A] ? A : never

/**
 * Counter to increment the depth. At max we will allow fetching
 * resources up to 6 levels deep. Beyond that is madness for any
 * sort of application.
 *
 * ```typescript
 * type DepthCounter = Next[0] // 1
 * type NextDepth = Next[1]    // 2
 * ```
 */
export type Next = [1, 2, 3, 4, 5, 6]

/**
 * Represents primitive types that can be safely serialized to JSON.
 */
export type JSONPrimitives = string | number | bigint | boolean | null | undefined

/**
 * Values that are JSON.stringify friendly, including primitives and objects
 * that can be serialized via a toJSON method.
 *
 * ```typescript
 * const validValues: JSONValues[] = [
 *   "string",
 *   42,
 *   BigInt(123),
 *   true,
 *   new Date(),
 *   null,
 *   undefined,
 *   { toJSON: () => ({ key: "value" }) }
 * ]
 * ```
 */
export type JSONValues = JSONPrimitives | CanBeSerialized<any>

/**
 * Representation of a value object that can be serialized to JSON via a toJSON method.
 *
 * @template T - The type that the toJSON method should return
 *
 * ```typescript
 * class User implements CanBeSerialized<{ id: number; name: string }> {
 *   constructor(private id: number, private name: string) {}
 *
 *   toJSON() {
 *     return { id: this.id, name: this.name }
 *   }
 * }
 * ```
 */
export type CanBeSerialized<T extends JSONDataTypes> = {
  /**
   * Converts the object to a JSON-serializable representation
   */
  toJSON(): T
}

/**
 * Recursive JSON.stringify friendly values that can include arrays and nested objects.
 *
 * ```typescript
 * const simpleData: JSONDataTypes = "hello"
 * const arrayData: JSONDataTypes = [1, 2, 3]
 * const objectData: JSONDataTypes = {
 *   name: "John",
 *   age: 30,
 *   hobbies: ["reading", "coding"]
 * }
 * ```
 */
export type JSONDataTypes = JSONValues | JSONDataTypes[] | { [key: string]: JSONDataTypes }

/**
 * Helper type to serialize object types while preserving required and optional properties.
 * Separates defined properties from undefined/optional ones to maintain correct optionality
 * in the resulting serialized type.
 *
 * @template T - The object type to serialize
 *
 * ```typescript
 * type User = { id: number; name: string; email?: string }
 * type SerializedUser = SerializeJSONObject<User>
 * // Result: { id: number; name: string } & { email?: string }
 * ```
 */
export type SerializeJSONObject<T> = {
  [K in ExtractDefined<T>]: SerializeJSONTypes<T[K]>
} & {
  [K in ExtractUndefined<T>]?: SerializeJSONTypes<T[K]>
}

/**
 * Extension point to allow custom types in JSON serialization. Use declaration
 * merging to add additional types that should be allowed in JSON output.
 *
 * ```typescript
 * declare module '@adonisjs/http-transformers' {
 *   interface ExtendJSONTypes {
 *     customDate: MyCustomDateType
 *   }
 * }
 * ```
 */
export interface ExtendedJSONTypes {}

/**
 * Types that are not allowed in JSON serialization by default.
 * Map and Set instances cannot be directly serialized to JSON.
 */
export type NonAllowedJSTypes = Map<any, any> | Set<any>

/**
 * Union of all types that have been explicitly allowed via the ExtendJSONTypes
 * interface extension point.
 */
export type ForcefullyAllowedTypes = {
  [K in keyof ExtendedJSONTypes]: ExtendedJSONTypes[K]
}[keyof ExtendedJSONTypes]

/**
 * Helper type to recursively serialize types, handling primitives, arrays, and objects.
 * This type walks through the type hierarchy and converts each level to its JSON-serializable
 * equivalent.
 *
 * @template T - The type to serialize
 *
 * The type checks in order:
 * 1. If T is a primitive (string, number, boolean, etc.), return as-is
 * 2. If T is explicitly allowed via ExtendJSONTypes, return as-is
 * 3. If T is a non-allowed type (Map, Set), return never
 * 4. If T is an array, recursively serialize array items
 * 5. If T is an object, recursively serialize object properties
 *
 * ```typescript
 * type Input = { name: string; tags: string[]; meta: { count: number } }
 * type Output = SerializeJSONOwnTypes<Input>
 * // Result: { name: string; tags: string[]; meta: { count: number } }
 * ```
 */
export type SerializeJSONOwnTypes<T> = T extends JSONPrimitives
  ? T
  : T extends ForcefullyAllowedTypes
    ? T
    : T extends NonAllowedJSTypes
      ? never
      : T extends Array<infer item>
        ? Array<SerializeJSONTypes<item>>
        : T extends object
          ? Prettify<SerializeJSONObject<T>>
          : never

/**
 * Main serialization type that handles objects with toJSON methods. If a type
 * has a toJSON method, extracts and serializes the return type. Otherwise,
 * serializes the type directly.
 *
 * @template T - The type to serialize
 *
 * ```typescript
 * class User {
 *   constructor(public id: number, public name: string) {}
 *   toJSON() {
 *     return { id: this.id, name: this.name }
 *   }
 * }
 *
 * type SerializedUser = SerializeJSONTypes<User>
 * // Result: { id: number; name: string }
 * ```
 */
export type SerializeJSONTypes<T> = T extends ForcefullyAllowedTypes
  ? T
  : T extends CanBeSerialized<infer A>
    ? SerializeJSONOwnTypes<A>
    : SerializeJSONOwnTypes<T>

/**
 * Contract interface for Item instances used in type inference. An Item represents
 * a single resource that will be transformed using the specified transformer class.
 *
 * @template Transformer - The transformer class to use for transforming the resource
 * @template MaxDepth - The maximum depth for nested resource resolution
 * @template Variant - The variant method name to use for transformation
 *
 * ```typescript
 * const userItem: ItemContract<UserTransformer, 3, 'toObject'> = {
 *   $type: 'item',
 *   transformer: UserTransformer,
 *   maxDepth: 3,
 *   variant: 'toObject'
 * }
 * ```
 */
export interface ItemContract<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Discriminator property to identify this as an Item type
   */
  $type: 'item'
  /**
   * The transformer class constructor used for transforming the resource
   */
  transformer: { new (...args: any[]): Transformer }
  /**
   * Maximum depth for resolving nested resources
   */
  maxDepth: MaxDepth
  /**
   * The variant method name to call on the transformer
   */
  variant: Variant
}

/**
 * Contract interface for Collection instances used in type inference. A Collection
 * represents an array of resources that will be transformed using the specified
 * transformer class.
 *
 * @template Transformer - The transformer class to use for transforming each resource
 * @template MaxDepth - The maximum depth for nested resource resolution
 * @template Variant - The variant method name to use for transformation
 *
 * ```typescript
 * const usersCollection: CollectionContract<UserTransformer, 3, 'toObject'> = {
 *   $type: 'collection',
 *   transformer: UserTransformer,
 *   maxDepth: 3,
 *   variant: 'toObject'
 * }
 * ```
 */
export interface CollectionContract<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Discriminator property to identify this as a Collection type
   */
  $type: 'collection'
  /**
   * The transformer class constructor used for transforming each resource
   */
  transformer: { new (...args: any[]): Transformer }
  /**
   * Maximum depth for resolving nested resources
   */
  maxDepth: MaxDepth
  /**
   * The variant method name to call on the transformer
   */
  variant: Variant
}

/**
 * Contract interface for Paginator instances used in type inference. A Paginator
 * wraps a Collection with additional pagination metadata.
 *
 * @template Transformer - The transformer class to use for transforming each resource
 * @template MaxDepth - The maximum depth for nested resource resolution
 * @template Variant - The variant method name to use for transformation
 *
 * ```typescript
 * const usersPaginator: PaginatorContract<UserTransformer, 3, 'toObject'> = {
 *   $type: 'paginator',
 *   collection: usersCollection,
 *   metaData: { currentPage: 1, total: 100 }
 * }
 * ```
 */
export interface PaginatorContract<
  Transformer extends Record<string, any>,
  MaxDepth extends Next[number],
  Variant extends string,
> {
  /**
   * Discriminator property to identify this as a Paginator type
   */
  $type: 'paginator'
  /**
   * The collection contract containing the paginated resources
   */
  collection: CollectionContract<Transformer, MaxDepth, Variant>
  /**
   * Pagination metadata (page numbers, total count, etc.)
   */
  metaData: any
}

/**
 * Extracts the variant methods of a transformer class. Any method that returns ResourceData
 * or Promise<ResourceData> can be picked for serialization.
 *
 * This utility type filters all methods of a transformer class to only include those
 * that return the correct data types for resource serialization.
 *
 * @template Transformer - The transformer class to extract variant methods from
 *
 * ```typescript
 * class UserResource {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   invalidMethod() { return "not resource data" }
 * }
 *
 * type Variants = ExtractTransformerVariants<UserResource> // "toObject" | "toSummary"
 * ```
 */
export type ExtractTransformerVariants<Transformer> = Exclude<
  keyof Transformer & string,
  keyof BaseTransformer<any>
>
/**
 * Supported resource data types. Collections and Items are supported only
 * at the top-level, since relationships in nested properties will lead
 * to recursive async serialization which is significantly slower.
 *
 * Never allow "ResourceDataTypes" recursively as that will make us resolve
 * collections and items recursively as well.
 *
 * ```typescript
 * const stringData: ResourceDataTypes = "hello"
 * const collectionData: ResourceDataTypes = new Collection(users, UserResource)
 * const itemData: ResourceDataTypes = new Item(user, UserResource)
 * ```
 */
export type ResourceDataTypes =
  | JSONDataTypes
  | CollectionContract<any, any, any>
  | ItemContract<any, any, any>

/**
 * A record of resource data types. This is what every transformer
 * must return from their transformation methods.
 *
 * ```typescript
 * class UserResource {
 *   toObject(): ResourceData {
 *     return {
 *       id: this.user.id,
 *       name: this.user.name,
 *       posts: PostTransformer.transform(this.user.posts)
 *     }
 *   }
 * }
 * ```
 */
export type ResourceData = Record<string, ResourceDataTypes>

/**
 * Unpacks the value of a key inside ResourceData. Collections and Items
 * are recursively processed with depth tracking. This type handles the
 * splitting between resource types (Item/Collection) and plain JSON types.
 *
 * @template Value - A tuple of [ResourceType | never, OtherTypes] from SplitItm
 * @template MaxDepth - Maximum depth allowed for unpacking nested resources
 * @template Depth - Current depth level in the unpacking process
 *
 * @internal
 */
export type UnpackKeyValue<
  Value extends [any, any],
  MaxDepth extends number,
  Depth extends number,
> = [Value[0]] extends [never]
  ? SerializeJSONTypes<Value[1]>
  : Value[0] extends ItemContract<infer Transformer, infer LocalMaxDepth, infer Variant>
    ?
        | InferData<
            Transformer,
            Variant,
            MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
            Next[Depth]
          >
        | SerializeJSONTypes<Value[1]>
    : Value[0] extends CollectionContract<infer Transformer, infer LocalMaxDepth, infer Variant>
      ?
          | InferData<
              Transformer,
              Variant,
              MaxDepth extends -1 ? LocalMaxDepth : MaxDepth,
              Next[Depth]
            >[]
          | SerializeJSONTypes<Value[1]>
      : SerializeJSONTypes<Value[1]>

/**
 * Validates the Depth property against the MaxDepth and drops the key
 * when both are the same.
 *
 * Since there are no arithmetic checks in TypeScript, we cannot check if Depth >= MaxDepth.
 * We have to rely on Depth === MaxDepth and be careful about not incrementing the
 * depth unnecessarily as that might make the entire check fail.
 *
 * @internal
 */
export type LimitDepth<Key, Value, MaxDepth extends number, Depth extends number> = [
  Value,
] extends [never]
  ? Key
  : Value extends ItemContract<any, any, any>
    ? MaxDepth extends Depth
      ? never
      : Key
    : Value extends CollectionContract<any, any, any>
      ? MaxDepth extends Depth
        ? never
        : Key
      : Key

/**
 * Only unpacks values that can be undefined and marks them as optional.
 * This type filters out required properties and processes only those that
 * allow undefined values.
 *
 * @template Data - The resource data object to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking nested resources
 * @template Depth - Current depth level in the unpacking process
 *
 * @internal
 */
export type UnpackOptionalValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? LimitDepth<K, SplitItm<Data[K]>[0], MaxDepth, Depth>
      : never
  }[keyof Data]]?: UnpackKeyValue<SplitItm<Data[O]>, MaxDepth, Depth>
}

/**
 * Only unpacks defined (including null) values as required properties.
 * This type filters out optional properties and processes only those that
 * are always defined (though they may be null).
 *
 * @template Data - The resource data object to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking nested resources
 * @template Depth - Current depth level in the unpacking process
 *
 * @internal
 */
export type UnpackRequiredValues<Data, MaxDepth extends number, Depth extends number> = {
  [O in {
    [K in keyof Data]: [undefined] extends [Data[K]]
      ? never
      : LimitDepth<K, SplitItm<Data[K]>[0], MaxDepth, Depth>
  }[keyof Data]]: UnpackKeyValue<SplitItm<Data[O]>, MaxDepth, Depth>
}

/**
 * Internal helper type to split Item/Collection types from other types.
 * Returns a tuple where the first element contains extracted resource types
 * (Item/Collection) and the second contains all other types.
 *
 * @template T - The type to split
 *
 * @internal
 */
export type SplitItm<T> = [
  Extract<T, ItemContract<any, any, any> | CollectionContract<any, any, any>>,
  Exclude<T, ItemContract<any, any, any> | CollectionContract<any, any, any>>,
]

/**
 * Unpacks an Item instance at the top level of serialization. When an Item
 * is at the root level, it uses unlimited depth (-1) starting from depth 0.
 *
 * @template T - The Item contract type to unpack
 *
 * @internal
 */
export type UnpackAsTopLevelItem<T, Wrapper extends string | undefined> =
  T extends ItemContract<infer Transformer, any, infer Variant>
    ? Wrapper extends string
      ? {
          [K in Wrapper]: InferData<Transformer, Variant, -1, 0>
        }
      : InferData<Transformer, Variant, -1, 0>
    : never

/**
 * Unpacks a Collection instance at the top level of serialization. Returns
 * an array of the unpacked transformer data with unlimited depth.
 *
 * @template T - The Collection contract type to unpack
 *
 * @internal
 */
export type UnpackAsTopLevelCollection<T, Wrapper extends string | undefined> =
  T extends CollectionContract<infer Transformer, any, infer Variant>
    ? Wrapper extends string
      ? {
          [K in Wrapper]: InferData<Transformer, Variant, -1, 0>[]
        }
      : InferData<Transformer, Variant, -1, 0>[]
    : never

/**
 * Unpacks a Paginator instance at the top level of serialization. Returns
 * an object with a 'data' array containing the unpacked collection items
 * and a 'meta' object containing pagination metadata.
 *
 * @template T - The Paginator contract type to unpack
 *
 * @internal
 */
export type UnpackAsTopLevelPaginator<
  T,
  Wrapper extends string,
  WrapperMeta extends string | 'metadata',
  TransformedMetaData,
> =
  T extends PaginatorContract<infer Transformer, any, infer Variant>
    ? TransformedMetaData extends Record<string, any>
      ? Prettify<
          {
            [K in Wrapper]: InferData<Transformer, Variant, -1, 0>[]
          } & { [K in WrapperMeta]: TransformedMetaData }
        >
      : Prettify<
          {
            [K in Wrapper]: InferData<Transformer, Variant, -1, 0>[]
          } & { [K in WrapperMeta]: any }
        >
    : never

/**
 * Unpacks values as two sets of optional and required values, then merges them
 * into a single prettified type. This ensures correct optionality is preserved
 * in the resulting serialized type.
 *
 * @template Data - The resource data object to unpack
 * @template MaxDepth - Maximum depth allowed for unpacking nested resources
 * @template Depth - Current depth level in the unpacking process
 *
 * @internal
 */
export type UnpackValues<Data, MaxDepth extends number, Depth extends number> = Prettify<
  UnpackRequiredValues<Data, MaxDepth, Depth> & UnpackOptionalValues<Data, MaxDepth, Depth>
>

/**
 * Unpacks resource data at the top level of serialization. Handles special
 * cases like Paginator objects which need to be wrapped in a data/meta structure.
 * Uses unlimited depth (-1) for top-level unpacking.
 *
 * @template Data - The resource data object to unpack
 *
 * ```typescript
 * type Input = {
 *   user: ItemContract<UserTransformer, 3, 'toObject'>
 *   posts: CollectionContract<PostTransformer, 3, 'toObject'>
 * }
 * type Output = UnpackTopLevelValues<Input>
 * // Result: { user: UserData; posts: PostData[] }
 * ```
 */
export type UnpackTopLevelValues<Data> = Prettify<
  {
    [K in ExtractDefined<Data>]: Data[K] extends PaginatorContract<
      infer Transformer,
      any,
      infer Variant
    >
      ? {
          data: InferData<Transformer, Variant, -1, 0>[]
          metadata: any
        }
      : UnpackKeyValue<SplitItm<Data[K]>, -1, 0>
  } & {
    [K in ExtractUndefined<Data>]?: Data[K] extends PaginatorContract<
      infer Transformer,
      any,
      infer Variant
    >
      ? {
          data: InferData<Transformer, Variant, -1, 0>[]
          metadata: any
        }
      : UnpackKeyValue<SplitItm<Data[K]>, -1, 0>
  }
>

/**
 * Infers the serialized data structure of a transformer by extracting the return type
 * of a specific variant method and unpacking it recursively.
 *
 * This is the primary type used to extract the TypeScript type of a transformer's output.
 *
 * @template Transformer - The transformer class to infer data from
 * @template Variant - The variant method name to use (defaults to 'toObject')
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * ```typescript
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() {
 *     return {
 *       id: this.resource.id,
 *       name: this.resource.name,
 *       posts: PostTransformer.transform(this.resource.posts)
 *     }
 *   }
 * }
 *
 * type UserData = InferData<UserTransformer>
 * // Result: { id: number; name: string; posts: PostData[] }
 * ```
 */
export type InferData<
  Transformer,
  Variant extends string = 'toObject',
  MaxDepth extends number = -1,
  Depth extends number = 0,
> = Transformer extends { [K in Variant]: (...args: any[]) => unknown }
  ? UnpackValues<Awaited<ReturnType<Transformer[Variant]>>, MaxDepth, Depth>
  : never

/**
 * Infers the data structure for all variant methods of a transformer class, excluding
 * the default 'toObject' method and base transformer methods.
 *
 * Use this type to extract types for all custom variant methods defined on a transformer.
 *
 * @template Transformer - The transformer class to infer variant data from
 * @template MaxDepth - Maximum depth allowed for unpacking (defaults to -1 for unlimited)
 * @template Depth - Current depth level (defaults to 0)
 *
 * ```typescript
 * class UserTransformer extends BaseTransformer<User> {
 *   toObject() { return { id: 1, name: "John" } }
 *   toSummary() { return { id: 1 } }
 *   toProfile() { return { id: 1, name: "John", email: "john@example.com" } }
 * }
 *
 * type UserVariants = InferVariants<UserTransformer>
 * // Result: {
 * //   toSummary: { id: number }
 * //   toProfile: { id: number; name: string; email: string }
 * // }
 * ```
 */
export type InferVariants<Transformer, MaxDepth extends number = -1, Depth extends number = 0> = {
  [O in {
    [K in keyof Transformer]: 'toObject' extends K
      ? never
      : K extends keyof BaseTransformer<any>
        ? never
        : Transformer[K] extends (...args: any[]) => unknown
          ? K
          : never
  }[keyof Transformer] &
    string]: InferData<Transformer, O, MaxDepth, Depth>
}

/**
 * Tracing data structure for transformer serialization events
 */
export type TransformerTracingData = {
  /** The transformer being traced */
  transformer: Record<string, any>
  /** The variant method being called */
  variant: string
  /** Current depth level */
  depth: number
  /** Maximum depth allowed */
  maxDepth?: number
}
