import { Container } from '@adonisjs/fold'
import { BaseSerializer } from '../src/base_serializer.ts'

class ApiSerializer extends BaseSerializer<{
  PaginationMetaData: Record<string, any>
}> {
  wrap: undefined = undefined
  definePaginationMetaData(metaData: Record<string, any>) {
    return metaData
  }
}

class WrappedApiSerializer extends BaseSerializer<{
  Wrap: 'data'
  PaginationMetaData: {
    totalItems: number
    currentPage: number
  }
}> {
  wrap: 'data' = 'data'
  definePaginationMetaData(_: unknown): {
    totalItems: number
    currentPage: number
  } {
    return { totalItems: 10, currentPage: 10 }
  }
}

class MetadataKeyApiSerializer extends BaseSerializer<{
  MetadataKey: 'pagination'
  PaginationMetaData: {
    totalItems: number
    currentPage: number
  }
}> {
  wrap: undefined = undefined
  metadataKey: 'pagination' = 'pagination'
  definePaginationMetaData(_: unknown): {
    totalItems: number
    currentPage: number
  } {
    return { totalItems: 10, currentPage: 10 }
  }
}

export const apiSerializer = new ApiSerializer()
export const wrappedApiSerializer = new WrappedApiSerializer()
export const metadataKeyApiSerializer = new MetadataKeyApiSerializer()
export const container = new Container()
