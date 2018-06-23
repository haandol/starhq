export namespace Auth {

  export const CLIENT_ID = process.env.CLIENT_ID || '58c77eda-f7a0-432c-82b0-0e340ba44791';
  export const CLIENT_SECRET = process.env.CLIENT_SECRET || 'c4fe05eccf764accb0521aa86c0c1a09';

  export interface Payload {
    clientId: string;
    clientSecret?: string;
    refreshToken?: string;
    email: string;
    password: string;
    level: number;
    grantType: 'password' | 'client_credentials' | 'refresh_token';
  }

  export interface Tokens {
    accessToken: string;
    refreshToken: string;
  }

  export enum AuthLevel {
    All = 0,
    User = 1,
    Admin = 2
  }

}