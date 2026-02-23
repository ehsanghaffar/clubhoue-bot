/**
 * API Factory - Creates standardized, type-safe API endpoint wrappers
 * Consolidates common patterns across 55+ API files and adds consistent error handling
 */

import type { Profile } from '../types/config';
import type { AgentFunction } from '../types/services';
import agent from '../helper/agent';
import logger from './logger';

export interface ApiEndpointOptions {
  body?: Record<string, unknown>;
  query?: Record<string, unknown> | string;
  headers?: Record<string, string>;
}

export interface ApiEndpointConfig {
  url: string;
  method?: 'GET' | 'POST';
  defaultOptions?: ApiEndpointOptions;
  parseUserId?: boolean; // Set userId to '(null)' for anonymous API calls
}

/**
 * Creates a standardized API endpoint function
 * @param config Configuration for the API endpoint
 * @param agentFn Optional custom agent function (defaults to imported agent)
 * @returns API endpoint function that returns Promise<unknown>
 */
export function createApiEndpoint(
  config: ApiEndpointConfig,
  agentFn: AgentFunction = agent
): (profile: Profile, options?: ApiEndpointOptions) => Promise<unknown> {
  return async (profile: Profile, options?: ApiEndpointOptions): Promise<unknown> => {
    try {
      const mergedOptions: ApiEndpointOptions = {
        ...config.defaultOptions,
        ...options,
      };

      const customs = config.parseUserId ? { ...profile, userId: '(null)' } : profile;

      logger.debug('API call:', { url: config.url, method: config.method ?? 'POST' });

      const response = await agentFn(config.url, mergedOptions, customs);
      const data = await response.json();

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('API error:', { url: config.url, error: errorMessage });
      throw error;
    }
  };
}

/**
 * Creates a batch of API endpoints with consistent configuration
 * @param baseUrl Base API URL prefix
 * @param endpoints Config for multiple endpoints
 * @returns Object with all generated endpoint functions
 */
export function createApiEndpoints(
  endpoints: Record<string, ApiEndpointConfig>
): Record<string, (profile: Profile, options?: ApiEndpointOptions) => Promise<unknown>> {
  const result: Record<string, (profile: Profile, options?: ApiEndpointOptions) => Promise<unknown>> = {};

  for (const [name, config] of Object.entries(endpoints)) {
    result[name] = createApiEndpoint(config);
  }

  return result;
}

/**
 * Validates API response has required fields
 * @param response API response to validate
 * @param requiredFields Fields that must be present
 * @returns True if valid, throws if missing required fields
 */
export function validateApiResponse(
  response: unknown,
  requiredFields?: string[]
): response is Record<string, unknown> {
  if (!response || typeof response !== 'object') {
    logger.warn('Invalid API response: not an object', { response });
    return false;
  }

  if (requiredFields) {
    const missing = requiredFields.filter((field) => !(field in response));
    if (missing.length > 0) {
      logger.warn('API response missing required fields:', { missing, response });
      return false;
    }
  }

  return true;
}
