/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { BaseSerializer } from '../src/base_serializer.ts'
import { type LucidPaginatorMetaData } from '../src/types.ts'

class LucidSerializer extends BaseSerializer<{
  PaginationMetaData: LucidPaginatorMetaData
}> {
  wrap: undefined = undefined

  definePaginationMetaData(metaData: unknown): LucidPaginatorMetaData {
    if (!this.isLucidPaginatorMetaData(metaData)) {
      throw new Error('Invalid pagination metadata')
    }
    return metaData
  }

  isLucidMetaData(metaData: unknown) {
    return this.isLucidPaginatorMetaData(metaData)
  }
}

const lucidMetaData = {
  total: 100,
  perPage: 10,
  currentPage: 1,
  lastPage: 10,
  firstPage: 1,
  firstPageUrl: '/users?page=1',
  lastPageUrl: '/users?page=10',
  nextPageUrl: '/users?page=2',
  previousPageUrl: null,
}

test.group('BaseSerializer | isLucidPaginatorMetaData', () => {
  test('narrow metadata to the types of Lucid getMeta', ({ expectTypeOf }) => {
    const serializer = new LucidSerializer()
    const metaData: unknown = lucidMetaData

    if (serializer.isLucidMetaData(metaData)) {
      expectTypeOf(metaData).toEqualTypeOf<LucidPaginatorMetaData>()
      expectTypeOf(metaData.total).toEqualTypeOf<number>()
      expectTypeOf(metaData.perPage).toEqualTypeOf<number>()
      expectTypeOf(metaData.currentPage).toEqualTypeOf<number>()
      expectTypeOf(metaData.lastPage).toEqualTypeOf<number>()
      expectTypeOf(metaData.firstPage).toEqualTypeOf<number>()
      expectTypeOf(metaData.pageName).toEqualTypeOf<string | undefined>()
      expectTypeOf(metaData.firstPageUrl).toEqualTypeOf<string>()
      expectTypeOf(metaData.lastPageUrl).toEqualTypeOf<string>()
      expectTypeOf(metaData.nextPageUrl).toEqualTypeOf<string | null>()
      expectTypeOf(metaData.previousPageUrl).toEqualTypeOf<string | null>()
    }
  })

  test('accept metadata with and without pageName', ({ assert }) => {
    const serializer = new LucidSerializer()

    assert.isTrue(serializer.isLucidMetaData(lucidMetaData))
    assert.isTrue(serializer.isLucidMetaData({ ...lucidMetaData, pageName: 'page' }))
    assert.deepEqual(serializer.definePaginationMetaData(lucidMetaData), lucidMetaData)
  })

  test('reject metadata with a missing key', ({ assert }) => {
    const serializer = new LucidSerializer()
    const { total, ...withoutTotal } = lucidMetaData

    assert.isFalse(serializer.isLucidMetaData(withoutTotal))
    assert.isFalse(serializer.isLucidMetaData(null))
    assert.isFalse(serializer.isLucidMetaData([]))
  })
})
