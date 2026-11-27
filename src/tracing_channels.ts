/*
 * @adonisjs/http-transformers
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import diagnostics_channel from 'node:diagnostics_channel'
import type { TransformerTracingData } from './types.ts'

/**
 * Traces transformer resolution
 */
export const transformerResolver = diagnostics_channel.tracingChannel<TransformerTracingData>(
  'adonisjs.transformer.resolver'
)
