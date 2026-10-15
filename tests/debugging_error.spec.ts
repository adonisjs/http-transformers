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

const UNDEFINED_VALUE_MESSAGE =
  'Cannot transform undefined value. Use "this.whenLoaded(value)" to allow undefined values'

/**
 * Runs the callback and returns the error it throws. Serializing a top-level
 * item throws synchronously, hence the callback instead of a promise
 */
async function captureError(callback: () => unknown): Promise<Error> {
  try {
    await callback()
  } catch (error) {
    return error as Error
  }
  throw new Error('Expected callback to throw')
}

/**
 * Returns the function names of the top stack frames of an error
 */
function topFrames(error: Error, count: number) {
  return error
    .stack!.split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, count)
    .map((line) => line.replace(/^at (async )?/, '').split(' ')[0])
}

class Profile {
  declare bio: string
}

class User {
  declare id: number
  declare profile: Profile
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
    return { bio: this.resource.bio }
  }

  summary() {
    return { bio: this.resource.bio.slice(0, 10) }
  }
}

class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      id: this.resource.id,
      profile: ProfileTransformer.transform(this.resource.profile),
    }
  }

  withProfileSummary() {
    return {
      id: this.resource.id,
      profile: ProfileTransformer.transform(this.resource.profile).useVariant('summary').depth(2),
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

function createUser(id: number, withProfile: boolean) {
  const user = new User()
  user.id = id
  if (withProfile) {
    user.profile = new Profile()
    user.profile.bio = 'Hello world from AdonisJS'
  }
  return user
}

test.group('Transformer | undefined value stack trace', () => {
  test('point to the caller of a top-level transform call', async ({ assert }) => {
    const error = await captureError(() =>
      apiSerializer.serialize(
        UserTransformer.transform(undefined as any),
        container.createResolver()
      )
    )

    assert.instanceOf(error, RuntimeException)
    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.equal(topFrames(error, 1)[0], 'UserTransformer.transform')
  })

  test('point to the transformer of a nested item', async ({ assert }) => {
    const error = await captureError(() =>
      apiSerializer.serialize(
        UserTransformer.transform(createUser(1, false)),
        container.createResolver()
      )
    )

    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.deepEqual(topFrames(error, 2), [
      'ProfileTransformer.transform',
      'UserTransformer.toObject',
    ])
  })

  test('point to the transformer of a nested item inside a collection', async ({ assert }) => {
    const error = await captureError(() =>
      apiSerializer.serialize(
        UserTransformer.transform([createUser(1, true), createUser(2, false)]),
        container.createResolver()
      )
    )

    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.deepEqual(topFrames(error, 2), [
      'ProfileTransformer.transform',
      'UserTransformer.toObject',
    ])
  })

  test('point to the transformer of a nested item inside a paginator', async ({ assert }) => {
    const error = await captureError(() =>
      apiSerializer.serialize(
        UserTransformer.paginate([createUser(1, true), createUser(2, false)], { total: 2 }),
        container.createResolver()
      )
    )

    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.deepEqual(topFrames(error, 2), [
      'ProfileTransformer.transform',
      'UserTransformer.toObject',
    ])
  })

  test('point to the transformer of an item inside a nested collection', async ({ assert }) => {
    const comment = new Comment()
    comment.id = 1

    const post = new Post()
    post.id = 1
    post.comments = [comment]

    const error = await captureError(() =>
      apiSerializer.serialize(PostTransformer.transform(post), container.createResolver())
    )

    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.deepEqual(topFrames(error, 2), [
      'UserTransformer.transform',
      'CommentTransformer.toObject',
    ])
  })

  test('point to the variant that transforms a nested item', async ({ assert }) => {
    const error = await captureError(() =>
      apiSerializer.serialize(
        UserTransformer.transform(createUser(1, false)).useVariant('withProfileSummary'),
        container.createResolver()
      )
    )

    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.deepEqual(topFrames(error, 2), [
      'ProfileTransformer.transform',
      'UserTransformer.withProfileSummary',
    ])
  })

  test('throw runtime exception for an item created without a debugging error', async ({
    assert,
  }) => {
    const item = new Item([undefined, []], UserTransformer, 1, 'toObject')
    const error = await captureError(() =>
      apiSerializer.serialize(item, container.createResolver())
    )

    assert.instanceOf(error, RuntimeException)
    assert.equal(error.message, UNDEFINED_VALUE_MESSAGE)
    assert.equal(topFrames(error, 1)[0], 'Item.resolve')
  })
})
