export enum NodeEnvironment {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export interface Configuration {
  NODE_ENV: string;
  nodePort: string;

  host: string;

  redis__host: string;
  redis__port: string;
  redis__ttl: string;

  monobank__api_url: string;
}
