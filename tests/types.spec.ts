/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { debug } from '../src/debug.ts'
import { apiSerializer, container, metadataKeyApiSerializer } from './helpers.ts'
import { User } from './fixtures/models/user.ts'
import { Post } from './fixtures/models/posts.ts'
import { Email } from './fixtures/models/email.ts'
import { Profile } from './fixtures/models/profile.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import { PostTransformer } from './fixtures/transformers/post.ts'
import { UserTransformer } from './fixtures/transformers/user.ts'
import { EmailTransformer } from './fixtures/transformers/email.ts'
import { ProfileTransformer } from './fixtures/transformers/profile.ts'
import {
  type InferVariants,
  type InferData,
  type ResourceData,
  type ExtractTransformerVariants,
} from '../src/types.ts'

declare module '../src/types.ts' {
  interface ExtendedJSONTypes {
    bigInt: BigInt
  }
}

test.group('Types', () => {
  test('infer nested objects and arrays', async ({ expectTypeOf }) => {
    class ExampleTransformer extends BaseTransformer<{}> {
      toObject() {
        return {
          id: 1,
          profile: {
            id: 1,
            emails: [
              {
                id: 1,
                email: 'foo@bar.com',
              },
            ],
          },
          can: {
            edit: true,
            create: true,
          },
        }
      }
    }

    const exampleTransformer = new ExampleTransformer({})
    const exampleDataObject = await apiSerializer.serialize(
      ExampleTransformer.transform({}),
      container.createResolver()
    )
    type ExampleData = InferData<typeof exampleTransformer>
    debug('%O', exampleDataObject)

    expectTypeOf<ExampleData>().toEqualTypeOf<{
      id: number
      profile: {
        id: number
        emails: { id: number; email: string }[]
      }
      can: {
        create: boolean
        edit: boolean
      }
    }>()
    expectTypeOf(exampleDataObject).toEqualTypeOf<ExampleData>()
  })

  test('infer rich data-types', async ({ expectTypeOf }) => {
    class Checks {
      toJSON() {
        return {
          edit: true,
          create: true,
        }
      }
    }

    class ExampleTransformer extends BaseTransformer<{}> {
      toObject() {
        return {
          id: 1,
          profile: {
            id: 1,
            emails: [
              {
                id: 1,
                email: 'foo@bar.com',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ],
          },
          can: new Checks(),
        }
      }
    }

    const exampleTransformer = new ExampleTransformer({})
    const exampleDataObject = await apiSerializer.serialize(
      ExampleTransformer.transform({}),
      container.createResolver()
    )
    type ExampleData = InferData<typeof exampleTransformer>
    debug('%O', exampleDataObject)

    expectTypeOf<ExampleData>().toEqualTypeOf<{
      id: number
      profile: {
        id: number
        emails: { id: number; email: string; createdAt: string; updatedAt: string }[]
      }
      can: {
        create: boolean
        edit: boolean
      }
    }>()
    expectTypeOf(exampleDataObject).toEqualTypeOf<ExampleData>()
  })

  test('infer rich data-types with optional values', async ({ expectTypeOf }) => {
    class Checks {
      toJSON() {
        return {
          edit: true,
          create: true,
        }
      }
    }

    class ExampleTransformer extends BaseTransformer<{}> {
      hasProfile: boolean = true
      toObject() {
        return {
          id: 1,
          profile: this.hasProfile
            ? {
                id: 1,
                emails: this.hasProfile
                  ? [
                      {
                        id: 1,
                        email: 'foo@bar.com',
                        createdAt: this.hasProfile ? new Date() : undefined,
                        updatedAt: new Date(),
                      },
                    ]
                  : undefined,
              }
            : undefined,
          can: new Checks(),
        }
      }
    }

    const exampleTransformer = new ExampleTransformer({})
    const exampleDataObject = await apiSerializer.serialize(
      ExampleTransformer.transform({}),
      container.createResolver()
    )
    type ExampleData = InferData<typeof exampleTransformer>
    debug('%O', exampleDataObject)

    expectTypeOf<ExampleData>().toEqualTypeOf<{
      id: number
      profile?:
        | {
            id: number
            emails?:
              | { id: number; email: string; createdAt?: string | undefined; updatedAt: string }[]
              | undefined
          }
        | undefined
      can: {
        create: boolean
        edit: boolean
      }
    }>()
    expectTypeOf(exampleDataObject).toEqualTypeOf<ExampleData>()
  })

  test('disallow paginated relationships', async () => {
    class UserLocalTransformer extends BaseTransformer<{ id: number }> {
      toObject() {
        return this.resource
      }
    }

    class ExampleTransformer extends BaseTransformer<{}> {
      hasProfile: boolean = true
      toObject() {
        return {
          id: 1,
          // @ts-expect-error
          user: UserLocalTransformer.paginate([{ id: 1 }], {}),
        } satisfies ResourceData
      }
    }

    await apiSerializer.serialize(ExampleTransformer.transform({}), container.createResolver())
  })

  test('disallow returning non-serializable values', async () => {
    class ExampleTransformer extends BaseTransformer<{}> {
      hasProfile: boolean = true
      toObject() {
        return {
          id: 1,
          // @ts-expect-error
          scores: new Map(),
        } satisfies ResourceData
      }
    }

    const r = await apiSerializer.serialize(
      ExampleTransformer.transform({}),
      container.createResolver()
    )
    console.log(r)
  })

  test('allow custom values', async ({ expectTypeOf }) => {
    class ExampleTransformer extends BaseTransformer<{}> {
      hasProfile: boolean = true
      toObject() {
        return {
          id: 1,
          scores: BigInt(10),
        } satisfies ResourceData
      }
    }

    const exampleTransformer = new ExampleTransformer({})
    const exampleDataObject = await apiSerializer.serialize(
      ExampleTransformer.transform({}),
      container.createResolver()
    )
    type ExampleData = InferData<typeof exampleTransformer>
    expectTypeOf<ExampleData>().toEqualTypeOf<{
      id: number
      scores: bigint
    }>()
    expectTypeOf(exampleDataObject).toEqualTypeOf<ExampleData>()
  })
})

test.group('Types | Fixtures', () => {
  test('infer graph of post transformer', async ({ expectTypeOf }) => {
    const post = new Post()
    const postTransformer = new PostTransformer(post)
    const postDataObject = await apiSerializer.serialize(
      PostTransformer.transform(post),
      container.createResolver()
    )

    type PostData = InferData<typeof postTransformer>
    debug('%O', postDataObject)

    expectTypeOf<PostData>().toEqualTypeOf<{
      id: number
      title: string
      config: { hello: string } | boolean
      can: {
        create: boolean
        edit: boolean
        remove: boolean
      }
      author:
        | {
            id: number
            name: string
            profile?:
              | {
                  id: number
                  twitterHandle: string | null
                  githubUsername: string | null
                }
              | undefined
            posts?:
              | {
                  id: number
                  title: string
                  config: { hello: string } | boolean
                  can: {
                    create: boolean
                    edit: boolean
                    remove: boolean
                  }
                }[]
              | undefined
          }
        | { isGuest: boolean }
    }>()

    expectTypeOf(postDataObject).toEqualTypeOf<PostData>()
  })

  test('infer graph of user transformer', async ({ expectTypeOf }) => {
    const user = new User()
    const email = new Email()
    user.profile = new Profile()
    user.profile.user = user

    email.user = user
    email.profile = user.profile
    user.profile.emails = [email]
    user.posts = [new Post()]

    const userTransformer = new UserTransformer(user)
    const userDataObject = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    type UserData = InferData<typeof userTransformer>

    debug('%o', userDataObject)

    expectTypeOf<UserData>().toEqualTypeOf<{
      id: number
      name: string
      profile?:
        | {
            id: number
            twitterHandle: string | null
            githubUsername: string | null
            user?:
              | {
                  id: number
                  name: string
                }
              | undefined
            emails: {
              id: number
              email: string
              is_verified: boolean
            }[]
          }
        | undefined
      posts?:
        | {
            id: number
            title: string
            config: { hello: string } | boolean
            can: {
              create: boolean
              edit: boolean
              remove: boolean
            }
            author:
              | {
                  id: number
                  name: string
                }
              | { isGuest: boolean }
          }[]
        | undefined
    }>()
    expectTypeOf(userDataObject).toEqualTypeOf<UserData>()
  })

  test('infer graph of profile transformer', async ({ expectTypeOf }) => {
    const profile = new Profile()
    const email = new Email()
    profile.user = new User()

    email.user = profile.user
    email.profile = profile
    profile.emails = [email]
    profile.user.posts = [new Post()]

    const profileTransformer = new ProfileTransformer(profile)
    const profileDataObject = await apiSerializer.serialize(
      ProfileTransformer.transform(profile),
      container.createResolver()
    )
    type ProfileData = InferData<typeof profileTransformer>

    debug('%O', profileDataObject)

    expectTypeOf<ProfileData>().toEqualTypeOf<{
      id: number
      twitterHandle: string | null
      githubUsername: string | null
      user?:
        | {
            id: number
            name: string
          }
        | undefined
      emails: {
        id: number
        email: string
        is_verified: boolean
      }[]
    }>()
    expectTypeOf(profileDataObject).toEqualTypeOf<ProfileData>()
  })

  test('infer graph of email transformer', async ({ expectTypeOf }) => {
    const profile = new Profile()
    const email = new Email()
    const user = new User()
    email.user = user
    email.profile = profile

    const emailTransformer = new EmailTransformer(email)
    const emailDataObject = await apiSerializer.serialize(
      EmailTransformer.transform(email),
      container.createResolver()
    )
    type EmailData = InferData<typeof emailTransformer>

    debug('%o', emailDataObject)

    expectTypeOf<EmailData>().toEqualTypeOf<{
      id: number
      email: string
      is_verified: boolean
      user: {
        id: number
        name: string
      }
      profile: {
        id: number
        twitterHandle: string | null
        githubUsername: string | null
      }
    }>()
    expectTypeOf(emailDataObject).toEqualTypeOf<EmailData>()
  })

  test('make useVariant type-safe', async ({ expectTypeOf }) => {
    expectTypeOf<ExtractTransformerVariants<UserTransformer>>().toEqualTypeOf<
      'basicInfo' | 'toObject'
    >()
  })

  test('infer all variants of a transformer', async ({ expectTypeOf }) => {
    const user = new User()
    const userTransformer = new UserTransformer(user)
    const userDataObject = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('basicInfo'),
      container.createResolver()
    )

    type UserData = InferVariants<typeof userTransformer>
    debug('%O', userDataObject)

    expectTypeOf<UserData>().toEqualTypeOf<{
      basicInfo: {
        id: number
        name: string
        profile?:
          | {
              id: number
              twitterHandle: string | null
              githubUsername: string | null
            }
          | null
          | undefined
      }
    }>()

    expectTypeOf(userDataObject).toEqualTypeOf<UserData['basicInfo']>()
  })

  test('infer custom pagination metadata key', async ({ expectTypeOf }) => {
    const user = new User()
    UserTransformer
    const result = await metadataKeyApiSerializer.serialize(
      UserTransformer.paginate([user], {}).useVariant('basicInfo'),
      container.createResolver()
    )

    expectTypeOf(result).toEqualTypeOf<{
      data: {
        id: number
        name: string
        profile?:
          | {
              id: number
              twitterHandle: string | null
              githubUsername: string | null
            }
          | null
          | undefined
      }[]
      pagination: {
        totalItems: number
        currentPage: number
      }
    }>()

    expectTypeOf(result).not.toHaveProperty('metadata')
  })

  test('pick and method method to filter out functions', async () => {
    class UserPost {
      declare id: number
      declare title: string
      declare content: string
      declare author?: User
      declare authorConstructor?: typeof User
      async save() {}
      async create(_: any) {}
      async update(_: any) {}
    }

    class CustomPostTransformer extends BaseTransformer<UserPost> {
      toObject() {
        // @ts-expect-error
        this.pick(this.resource, ['save'])
        // @ts-expect-error
        this.pick(this.resource, ['create'])
        // @ts-expect-error
        this.pick(this.resource, ['update'])
        this.pick(this.resource, ['id', 'title', 'authorConstructor', 'author', 'content'])

        // @ts-expect-error
        this.omit(this.resource, ['save'])
        // @ts-expect-error
        this.omit(this.resource, ['create'])
        // @ts-expect-error
        this.omit(this.resource, ['update'])
        this.omit(this.resource, ['id', 'title', 'authorConstructor', 'author', 'content'])
      }
    }

    new CustomPostTransformer(new UserPost())
  })

  test('omit should correctly remove properties from the type', async ({ expectTypeOf }) => {
    interface TestUser {
      id: number
      name: string
      email: string
      password: string
      createdAt: Date
      internalId: string
    }

    class TestUserTransformer extends BaseTransformer<TestUser> {
      toObject() {
        const result = this.omit(this.resource, ['password', 'internalId'])

        // Verify the omitted properties are correctly typed
        expectTypeOf(result).toEqualTypeOf<{
          id: number
          name: string
          email: string
          createdAt: Date
        }>()

        // Verify password and internalId are not in the type
        expectTypeOf(result).not.toHaveProperty('password')
        expectTypeOf(result).not.toHaveProperty('internalId')

        // Verify remaining properties are present with correct types
        expectTypeOf(result.id).toEqualTypeOf<number>()
        expectTypeOf(result.name).toEqualTypeOf<string>()
        expectTypeOf(result.email).toEqualTypeOf<string>()
        expectTypeOf(result.createdAt).toEqualTypeOf<Date>()

        return result
      }
    }

    const user: TestUser = {
      id: 1,
      name: 'John',
      email: 'john@example.com',
      password: 'secret',
      createdAt: new Date(),
      internalId: 'internal-123',
    }

    const transformer = new TestUserTransformer(user)
    const output = await apiSerializer.serialize(
      TestUserTransformer.transform(user),
      container.createResolver()
    )

    type TransformerOutput = InferData<typeof transformer>

    // Verify the final output doesn't include omitted properties
    expectTypeOf<TransformerOutput>().toEqualTypeOf<{
      id: number
      name: string
      email: string
      createdAt: string
    }>()

    expectTypeOf(output).not.toHaveProperty('password')
    expectTypeOf(output).not.toHaveProperty('internalId')
  })
})
