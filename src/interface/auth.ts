export namespace Auth {

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