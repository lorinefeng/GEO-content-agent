import { NextRequest } from 'next/server';
import { getCloudflareEnv } from '@/lib/cloudflare';
import { ServiceError } from '@/lib/serviceError';

const parseBearerToken = (header: string | null) => {
  if (!header) return '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || '';
};

const parseInternalTokens = () => {
  const env = getCloudflareEnv();
  const raw = [
    typeof env.INTERNAL_API_TOKEN === 'string' ? env.INTERNAL_API_TOKEN : '',
    typeof env.INTERNAL_API_TOKENS === 'string' ? env.INTERNAL_API_TOKENS : '',
  ]
    .filter(Boolean)
    .join(',');

  return Array.from(
    new Set(
      raw
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
};

export const assertInternalApiAccess = (req: NextRequest) => {
  const configuredTokens = parseInternalTokens();
  if (configuredTokens.length === 0) {
    throw new ServiceError(500, '未配置 INTERNAL_API_TOKEN 或 INTERNAL_API_TOKENS', 'internal_api_token_missing');
  }

  const token = parseBearerToken(req.headers.get('authorization'));
  if (!token) {
    throw new ServiceError(401, '缺少 Bearer Token', 'internal_api_unauthorized');
  }

  if (!configuredTokens.includes(token)) {
    throw new ServiceError(403, 'Bearer Token 无效', 'internal_api_forbidden');
  }

  return { token };
};
