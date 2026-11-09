/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { inject } from '@adonisjs/fold'
import { type InferData, type InferDataShape } from '../src/types.ts'
import { type Paginator } from '../src/paginator.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import { apiSerializer, container, wrappedApiSerializer } from './helpers.ts'

test.group('Transformer', () => {
  test('throw error when value is null', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(null)!,
      container.createResolver()
    )
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  }).throws('Cannot serialize an item with null value')

  test('throw error when value is undefined', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(undefined as any)!,
      container.createResolver()
    )
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('allow null values as a value of a top-level object', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await apiSerializer.serialize(
      {
        user: UserTransformer.transform(null),
      },
      container.createResolver()
    )

    assert.deepEqual(userData, { user: null })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      user: {
        id: number
        fullName: string | null
        email: string
      } | null
    }>()
  })

  test('throw error when value is undefined', async ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(undefined as any)!,
      container.createResolver()
    )
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('transform a value using a transformer', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, { id: 1, fullName: null, email: 'foo@bar.com' })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  })

  test('transform with relationships', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          user: UserTransformer.transform(this.resource.user),
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails: { id: number; email: string; isVerified: boolean }[]
    }>()
  })

  test('transform as a collection', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
        emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
      },
    ])
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<
      {
        id: number
        fullName: string | null
        emails: { id: number; email: string; isVerified: boolean }[]
      }[]
    >()
  })

  test('throw error when required relationship data is missing', async () => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    await apiSerializer.serialize(UserTransformer.transform(user), container.createResolver())
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('do not throw error when collection data is undefined and marked as optional', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails)),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: undefined,
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?: { id: number; email: string; isVerified: boolean }[] | undefined
    }>()
  })

  test('do not throw error when item data is undefined but depth not reachable', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails)),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?: { id: number; email: string; isVerified: boolean }[] | undefined
    }>()
  })

  test('throw error when item is undefined and depth is reachable', async ({ expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails))?.depth(2),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?:
        | {
            id: number
            email: string
            isVerified: boolean
            user: {
              id: number
              fullName: string | null
            }
          }[]
        | undefined
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('resolve circular references upto 6 levels deep', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
      declare user: User
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
          user: UserTransformer.transform(this.resource.user),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails))?.depth(6),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true
    email.user = user

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.snapshot(userData).matchInline(`
      {
        "emails": [
          {
            "email": "foo@bar.com",
            "id": 1,
            "isVerified": true,
            "user": {
              "emails": [
                {
                  "email": "foo@bar.com",
                  "id": 1,
                  "isVerified": true,
                  "user": {
                    "emails": [
                      {
                        "email": "foo@bar.com",
                        "id": 1,
                        "isVerified": true,
                        "user": {
                          "fullName": null,
                          "id": 1,
                        },
                      },
                    ],
                    "fullName": null,
                    "id": 1,
                  },
                },
              ],
              "fullName": null,
              "id": 1,
            },
          },
        ],
        "fullName": null,
        "id": 1,
      }
    `)
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails?:
        | {
            id: number
            email: string
            isVerified: boolean
            user: {
              id: number
              fullName: string | null
              emails?:
                | {
                    id: number
                    email: string
                    isVerified: boolean
                    user: {
                      id: number
                      fullName: string | null
                      emails?:
                        | {
                            id: number
                            email: string
                            isVerified: boolean
                            user: {
                              id: number
                              fullName: string | null
                            }
                          }[]
                        | undefined
                    }
                  }[]
                | undefined
            }
          }[]
        | undefined
    }>()
  })

  test('allow null value for items', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }
    class User {
      declare id: number
      declare fullName: string | null
      declare email: Email | null
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: EmailTransformer.transform(this.resource.email),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, { id: 1, fullName: null, email: null })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: {
        id: number
        email: string
        isVerified: boolean
      } | null
    }>()
  })

  test('throw error when item value is undefined', async ({ expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }
    class User {
      declare id: number
      declare fullName: string | null
      declare email: Email | null
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: EmailTransformer.transform(this.resource.email),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: {
        id: number
        email: string
        isVerified: boolean
      } | null
    }>()
  }).throws(
    'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
  )

  test('transform as item', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, { id: 1, fullName: null, email: 'foo@bar.com' })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()
  })

  test('transform as collection', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    assert.deepEqual(userData, [{ id: 1, fullName: null, email: 'foo@bar.com' }])
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<
      {
        id: number
        fullName: string | null
        email: string
      }[]
    >()
  })

  test('transform using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('basicInfo'),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
    }>()
  })

  test('transform as item using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('basicInfo'),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
    })

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
    }>()
  })

  test('transform as collection using a specific variant', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      basicInfo() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          ...this.basicInfo(),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]).useVariant('basicInfo'),
      container.createResolver()
    )
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
      },
    ])
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<
      {
        id: number
        fullName: string | null
      }[]
    >()
  })

  test('inject dependencies to the toObject method', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class Logger {
      level: string = 'info'
    }

    class UserTransformer extends BaseTransformer<User> {
      @inject()
      toObject(logger: Logger) {
        return {
          id: this.resource.id,
          loggingLevel: logger.level,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const resolver = container.createResolver()
    resolver.bindValue(Logger, new Logger())
    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user).useVariant('toObject'),
      resolver
    )

    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      email: 'foo@bar.com',
      loggingLevel: 'info',
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
      loggingLevel: string
    }>()
  })

  test('pick and omit values', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return this.pick(this.resource, ['id', 'email'])
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          ...this.omit(this.resource, ['emails']),
          emails: EmailTransformer.transform(this.resource.emails),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      id: 1,
      fullName: null,
      emails: [{ id: 1, email: 'foo@bar.com' }],
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      emails: { id: number; email: string }[]
    }>()
  })

  test('transform as paginator', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      UserTransformer.paginate([user], {
        total: 1,
        currentPage: 1,
      }),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      metadata: {
        total: 1,
        currentPage: 1,
      },
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: {
        id: number
        fullName: string | null
        email: string
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('return non-serializable values as it is', async ({ assert, expectTypeOf }) => {
    const userData = await apiSerializer.serialize([1, 2, 3] as const, container.createResolver())
    expectTypeOf(userData).toEqualTypeOf<readonly [1, 2, 3]>()
    assert.deepEqual(userData, [1, 2, 3])
  })

  test('pass additional parameters to the transformer constructor', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      constructor(
        email: Email,
        protected sendVerificationTick: boolean
      ) {
        super(email)
      }

      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          ...(this.sendVerificationTick ? { isVerified: this.resource.isVerified } : {}),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.resource.emails, false),
        }
      }
    }

    const user = new User()
    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    user.id = 1
    user.fullName = null
    user.emails = [email]

    const userData = await apiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    assert.deepEqual(userData, [
      {
        id: 1,
        fullName: null,
        emails: [{ id: 1, email: 'foo@bar.com' }],
      },
    ])
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<
      {
        id: number
        fullName: string | null
        emails: { id: number; email: string; isVerified?: boolean | undefined }[]
      }[]
    >()
  })

  test('pass additional parameters to the transformer constructor during pagination', async ({
    assert,
    expectTypeOf,
  }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class EmailTransformer extends BaseTransformer<Email> {
      constructor(
        email: Email,
        protected sendVerificationTick: boolean
      ) {
        super(email)
      }

      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          ...(this.sendVerificationTick ? { isVerified: this.resource.isVerified } : {}),
        }
      }
    }

    const email = new Email()
    email.id = 1
    email.email = 'foo@bar.com'
    email.isVerified = true

    const emailData = await apiSerializer.serialize(
      EmailTransformer.paginate([email], {}, true),
      container.createResolver()
    )
    assert.deepEqual(emailData, {
      data: [{ id: 1, email: 'foo@bar.com', isVerified: true }],
      metadata: {},
    })
    expectTypeOf<InferDataShape<typeof emailData>>().toEqualTypeOf<{
      data: {
        id: number
        email: string
        isVerified?: boolean | undefined
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('use collection variant from transformer', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      forSelection() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      UserTransformer.paginate([user], {
        total: 1,
        currentPage: 1,
      }).useVariant('forSelection'),
      container.createResolver()
    )
    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null }],
      metadata: {
        total: 1,
        currentPage: 1,
      },
    })
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: {
        id: number
        fullName: string | null
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('use depth method on paginator', async ({ assert, expectTypeOf }) => {
    class Email {
      declare id: number
      declare email: string
      declare isVerified: boolean
    }

    class User {
      declare id: number
      declare fullName: string | null
      declare emails?: Email[]
    }

    class EmailTransformer extends BaseTransformer<Email> {
      toObject() {
        return {
          id: this.resource.id,
          email: this.resource.email,
          isVerified: this.resource.isVerified,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          emails: EmailTransformer.transform(this.whenLoaded(this.resource.emails))?.depth(2),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = 'John Doe'
    user.emails = [
      { id: 1, email: 'john@example.com', isVerified: true },
      { id: 2, email: 'doe@example.com', isVerified: false },
    ]

    const paginator = UserTransformer.paginate([user], {
      total: 1,
      currentPage: 1,
      perPage: 10,
    }).depth(3)

    // Verify type inference for depth method
    expectTypeOf(paginator).toMatchTypeOf<{
      collection: {
        maxDepth: 3
      }
    }>()

    const userData = await apiSerializer.serialize(paginator, container.createResolver())

    assert.deepEqual(userData, {
      data: [
        {
          id: 1,
          fullName: 'John Doe',
          emails: [
            { id: 1, email: 'john@example.com', isVerified: true },
            { id: 2, email: 'doe@example.com', isVerified: false },
          ],
        },
      ],
      metadata: {
        total: 1,
        currentPage: 1,
        perPage: 10,
      },
    })

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: {
        id: number
        fullName: string | null
        emails?: {
          id: number
          email: string
          isVerified: boolean
        }[]
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('chain depth and useVariant methods on paginator', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }

    class UserTransformer extends BaseTransformer<User> {
      forSelection() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
        }
      }

      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = 'Jane Doe'
    user.email = 'jane@example.com'

    // Test chaining depth and useVariant
    const paginator = UserTransformer.paginate([user], {
      total: 1,
      currentPage: 1,
    })
      .useVariant('forSelection')
      .depth(2)

    // Verify type inference for chained methods
    expectTypeOf(paginator).toMatchTypeOf<{
      collection: {
        maxDepth: 2
        variant: 'forSelection'
      }
    }>()

    const userData = await apiSerializer.serialize(paginator, container.createResolver())

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: 'Jane Doe' }],
      metadata: {
        total: 1,
        currentPage: 1,
      },
    })

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: {
        id: number
        fullName: string | null
      }[]
      metadata: Record<string, any>
    }>()
  })

  test('verify paginator generic signature', ({ expectTypeOf }) => {
    class User {
      declare id: number
      declare name: string
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          name: this.resource.name,
        }
      }

      toSummary() {
        return {
          id: this.resource.id,
        }
      }
    }

    const users: User[] = []

    // Test default paginator type
    const defaultPaginator = UserTransformer.paginate(users, { total: 0 })
    expectTypeOf(defaultPaginator).toMatchTypeOf<Paginator<UserTransformer, 1, 'toObject'>>()

    // Test with depth changed
    const withDepth = defaultPaginator.depth(3)
    expectTypeOf(withDepth).toMatchTypeOf<Paginator<UserTransformer, 3, 'toObject'>>()

    // Test with variant changed
    const withVariant = defaultPaginator.useVariant('toSummary')
    expectTypeOf(withVariant).toMatchTypeOf<Paginator<UserTransformer, 1, 'toSummary'>>()

    // Test with both changed
    const withBoth = defaultPaginator.useVariant('toSummary').depth(4)
    expectTypeOf(withBoth).toMatchTypeOf<Paginator<UserTransformer, 4, 'toSummary'>>()
  })
})

test.group('Transformer | wrapping', () => {
  test('transform and wrap an item value', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.transform(user),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }
    }>()
    expectTypeOf(userData).toEqualTypeOf<{ data: UserData }>()

    assert.deepEqual(userData, { data: { id: 1, fullName: null, email: 'foo@bar.com' } })
  })

  test('transform and wrap a collection value', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{ data: UserData[] } & { metadata?: never }>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }[]
      metadata?: never
    }>()

    assert.deepEqual(userData, { data: [{ id: 1, fullName: null, email: 'foo@bar.com' }] })
  })

  test('transform and wrap a paginator value', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serialize(
      UserTransformer.paginate([user], {}),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData.data).toEqualTypeOf<UserData[]>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: { id: number; fullName: string | null; email: string }[]
      metadata: {
        currentPage: number
        totalItems: number
      }
    }>()

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      metadata: {
        currentPage: 10,
        totalItems: 10,
      },
    })
  })

  test('return type is a union when controller returns collection or paginator', async ({
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    type UserData = InferData<UserTransformer>

    async function handler(cond: boolean) {
      if (cond) {
        return wrappedApiSerializer.serialize(
          UserTransformer.paginate([new User()], {}),
          container.createResolver()
        )
      }
      return wrappedApiSerializer.serialize(
        UserTransformer.transform([new User()]),
        container.createResolver()
      )
    }

    type Result = Awaited<ReturnType<typeof handler>>

    expectTypeOf<Result>().not.toEqualTypeOf<{ data: UserData[] } & { metadata?: never }>()
    expectTypeOf<Result>().toEqualTypeOf<
      | ({ data: UserData[] } & { metadata?: never })
      | {
          data: UserData[]
          metadata: { currentPage: number; totalItems: number }
        }
    >()
  })

  test('only wrap top-level resources', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class Post {
      declare id: number
      declare title: string
      declare user: User
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    class PostTransformer extends BaseTransformer<Post> {
      toObject() {
        return {
          id: this.resource.id,
          title: this.resource.title,
          author: UserTransformer.transform(this.resource.user),
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const post = new Post()
    post.id = 1
    post.title = 'hello world'
    post.user = user

    const postData = await wrappedApiSerializer.serialize(
      PostTransformer.transform(post),
      container.createResolver()
    )
    type PostData = InferData<PostTransformer>

    expectTypeOf(postData.data).toEqualTypeOf<PostData>()
    expectTypeOf<InferDataShape<typeof postData>>().toEqualTypeOf<{
      data: {
        id: number
        title: string
        author: { id: number; fullName: string | null; email: string }
      }
    }>()
    assert.deepEqual(postData, {
      data: {
        id: 1,
        title: 'hello world',
        author: {
          id: 1,
          fullName: null,
          email: 'foo@bar.com',
        },
      },
    })
  })

  test('transform and wrap a bare object value', async ({ assert, expectTypeOf }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serialize(
      {
        user: UserTransformer.transform(user),
      },
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      data: {
        user: { id: number; fullName: string | null; email: string }
      }
    }>()
    expectTypeOf(userData).toEqualTypeOf<{ data: { user: UserData } }>()

    assert.deepEqual(userData, {
      data: {
        user: { id: 1, fullName: null, email: 'foo@bar.com' },
      },
    })
  })

  test('do not wrap a bare object value when wrap is undefined', async ({
    assert,
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await apiSerializer.serialize(
      {
        user: UserTransformer.transform(user),
      },
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{ user: UserData }>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      user: { id: number; fullName: string | null; email: string }
    }>()

    assert.deepEqual(userData, {
      user: { id: 1, fullName: null, email: 'foo@bar.com' },
    })
  })

  test('serializeWithoutWrapping skips wrapping for an item value', async ({
    assert,
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serializeWithoutWrapping(
      UserTransformer.transform(user),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<UserData>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      id: number
      fullName: string | null
      email: string
    }>()

    assert.deepEqual(userData, { id: 1, fullName: null, email: 'foo@bar.com' })
  })

  test('serializeWithoutWrapping skips wrapping for a collection value', async ({
    assert,
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serializeWithoutWrapping(
      UserTransformer.transform([user]),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<UserData[]>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<
      { id: number; fullName: string | null; email: string }[]
    >()

    assert.deepEqual(userData, [{ id: 1, fullName: null, email: 'foo@bar.com' }])
  })

  test('serializeWithoutWrapping skips wrapping for a bare object value', async ({
    assert,
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serializeWithoutWrapping(
      {
        user: UserTransformer.transform(user),
      },
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{ user: UserData }>()
    expectTypeOf<InferDataShape<typeof userData>>().toEqualTypeOf<{
      user: { id: number; fullName: string | null; email: string }
    }>()

    assert.deepEqual(userData, {
      user: { id: 1, fullName: null, email: 'foo@bar.com' },
    })
  })

  test('serializeWithoutWrapping uses "data" key for paginator', async ({
    assert,
    expectTypeOf,
  }) => {
    class User {
      declare id: number
      declare fullName: string | null
      declare email: string
    }
    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          fullName: this.resource.fullName,
          email: this.resource.email,
        }
      }
    }

    const user = new User()
    user.id = 1
    user.fullName = null
    user.email = 'foo@bar.com'

    const userData = await wrappedApiSerializer.serializeWithoutWrapping(
      UserTransformer.paginate([user], {}),
      container.createResolver()
    )
    type UserData = InferData<UserTransformer>

    expectTypeOf(userData).toEqualTypeOf<{
      data: UserData[]
      metadata: { totalItems: number; currentPage: number }
    }>()

    assert.deepEqual(userData, {
      data: [{ id: 1, fullName: null, email: 'foo@bar.com' }],
      metadata: { currentPage: 10, totalItems: 10 },
    })
  })
})
