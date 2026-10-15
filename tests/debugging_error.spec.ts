/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { RuntimeException } from '@poppinss/exception'
import { Item } from '../src/resource/item.ts'
import { BaseTransformer } from '../src/base_transformer.ts'
import { apiSerializer, container } from './helpers.ts'

test.group('Transformer | undefined value stack trace', () => {
  test('point to the caller of a top-level transform call', async ({ assert }) => {
    assert.plan(3)

    class User {
      declare id: number
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
        }
      }
    }

    try {
      await apiSerializer.serialize(
        UserTransformer.transform(undefined as any),
        container.createResolver()
      )
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.instanceOf(error, RuntimeException)
      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at UserTransformer\.transform /)
    }
  })

  test('point to the transformer of a nested item', async ({ assert }) => {
    assert.plan(3)

    class Profile {
      declare bio: string
    }

    class User {
      declare id: number
      declare profile: Profile
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          profile: ProfileTransformer.transform(this.resource.profile),
        }
      }
    }

    const user = new User()
    user.id = 1

    try {
      await apiSerializer.serialize(UserTransformer.transform(user), container.createResolver())
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at ProfileTransformer\.transform /)
      assert.match(frames[2], /^\s+at UserTransformer\.toObject /)
    }
  })

  test('point to the transformer of a nested item inside a collection', async ({ assert }) => {
    assert.plan(3)

    class Profile {
      declare bio: string
    }

    class User {
      declare id: number
      declare profile: Profile
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          profile: ProfileTransformer.transform(this.resource.profile),
        }
      }
    }

    const profile = new Profile()
    profile.bio = 'Hello world'

    const user = new User()
    user.id = 1
    user.profile = profile

    const userWithoutProfile = new User()
    userWithoutProfile.id = 2

    try {
      await apiSerializer.serialize(
        UserTransformer.transform([user, userWithoutProfile]),
        container.createResolver()
      )
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at ProfileTransformer\.transform /)
      assert.match(frames[2], /^\s+at UserTransformer\.toObject /)
    }
  })

  test('point to the transformer of a nested item inside a paginator', async ({ assert }) => {
    assert.plan(3)

    class Profile {
      declare bio: string
    }

    class User {
      declare id: number
      declare profile: Profile
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          profile: ProfileTransformer.transform(this.resource.profile),
        }
      }
    }

    const profile = new Profile()
    profile.bio = 'Hello world'

    const user = new User()
    user.id = 1
    user.profile = profile

    const userWithoutProfile = new User()
    userWithoutProfile.id = 2

    try {
      await apiSerializer.serialize(
        UserTransformer.paginate([user, userWithoutProfile], { total: 2, currentPage: 1 }),
        container.createResolver()
      )
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at ProfileTransformer\.transform /)
      assert.match(frames[2], /^\s+at UserTransformer\.toObject /)
    }
  })

  test('point to the transformer of an item inside a nested collection', async ({ assert }) => {
    assert.plan(3)

    class User {
      declare id: number
    }

    class Comment {
      declare id: number
      declare author: User
    }

    class Post {
      declare id: number
      declare comments: Comment[]
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
        }
      }
    }

    class CommentTransformer extends BaseTransformer<Comment> {
      toObject() {
        return {
          id: this.resource.id,
          author: UserTransformer.transform(this.resource.author),
        }
      }
    }

    class PostTransformer extends BaseTransformer<Post> {
      toObject() {
        return {
          id: this.resource.id,
          comments: CommentTransformer.transform(this.resource.comments).depth(2),
        }
      }
    }

    const comment = new Comment()
    comment.id = 1

    const post = new Post()
    post.id = 1
    post.comments = [comment]

    try {
      await apiSerializer.serialize(PostTransformer.transform(post), container.createResolver())
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at UserTransformer\.transform /)
      assert.match(frames[2], /^\s+at CommentTransformer\.toObject /)
    }
  })

  test('point to the transformer of a deeply nested item', async ({ assert }) => {
    assert.plan(3)

    class Profile {
      declare bio: string
    }

    class User {
      declare id: number
      declare profile: Profile
      declare posts: Post[]
    }

    class Comment {
      declare id: number
      declare author: User
    }

    class Post {
      declare id: number
      declare comments: Comment[]
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
          profile: ProfileTransformer.transform(this.resource.profile),
          posts: PostTransformer.transform(this.resource.posts).depth(4),
        }
      }
    }

    class CommentTransformer extends BaseTransformer<Comment> {
      toObject() {
        return {
          id: this.resource.id,
          author: UserTransformer.transform(this.resource.author),
        }
      }
    }

    class PostTransformer extends BaseTransformer<Post> {
      toObject() {
        return {
          id: this.resource.id,
          comments: CommentTransformer.transform(this.resource.comments),
        }
      }
    }

    const profile = new Profile()
    profile.bio = 'Hello world'

    const authorWithoutProfile = new User()
    authorWithoutProfile.id = 2
    authorWithoutProfile.posts = []

    const comment = new Comment()
    comment.id = 1
    comment.author = authorWithoutProfile

    const post = new Post()
    post.id = 1
    post.comments = [comment]

    const user = new User()
    user.id = 1
    user.profile = profile
    user.posts = [post]

    try {
      await apiSerializer.serialize(UserTransformer.transform(user), container.createResolver())
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at ProfileTransformer\.transform /)
      assert.match(frames[2], /^\s+at UserTransformer\.toObject /)
    }
  })

  test('point to the variant that transforms a nested item', async ({ assert }) => {
    assert.plan(3)

    class Profile {
      declare bio: string
    }

    class User {
      declare id: number
      declare profile: Profile
    }

    class ProfileTransformer extends BaseTransformer<Profile> {
      toObject() {
        return {
          bio: this.resource.bio,
        }
      }

      summary() {
        return {
          bio: this.resource.bio.slice(0, 10),
        }
      }
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
        }
      }

      withProfileSummary() {
        return {
          id: this.resource.id,
          profile: ProfileTransformer.transform(this.resource.profile)
            .useVariant('summary')
            .depth(2),
        }
      }
    }

    const user = new User()
    user.id = 1

    try {
      await apiSerializer.serialize(
        UserTransformer.transform(user).useVariant('withProfileSummary'),
        container.createResolver()
      )
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at ProfileTransformer\.transform /)
      assert.match(frames[2], /^\s+at UserTransformer\.withProfileSummary /)
    }
  })

  test('throw runtime exception for an item created without a debugging error', async ({
    assert,
  }) => {
    assert.plan(3)

    class User {
      declare id: number
    }

    class UserTransformer extends BaseTransformer<User> {
      toObject() {
        return {
          id: this.resource.id,
        }
      }
    }

    try {
      await apiSerializer.serialize(
        new Item([undefined, []], UserTransformer, 1, 'toObject'),
        container.createResolver()
      )
    } catch (error: any) {
      const frames = error.stack.split('\n')

      assert.instanceOf(error, RuntimeException)
      assert.equal(
        error.message,
        'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'
      )
      assert.match(frames[1], /^\s+at Item\.resolve /)
    }
  })
})
