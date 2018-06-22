import { IEvent } from './event';

export namespace Account {

  export interface IAccount {
    id: string;
    email: string;
    password: string;
    level: number;
    accessToken: string;
    refreshToken: string;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
    isDeleted: boolean;
  }

  export namespace Event {
    export class AccountCreated implements IEvent<IAccount> {
      key: string;
      publishedAt: Date;

      constructor(public body: IAccount) {
        this.key = 'account.created';
        this.publishedAt = new Date();
      }
    }

    export class AccountUpdated implements IEvent<IAccount> {
      key: string;
      publishedAt: Date;

      constructor(public body: IAccount) {
        this.key = 'account.updated';
        this.publishedAt = new Date();
      }
    }
    
    export class AccountDeleted implements IEvent<IAccount> {
        key: string;
        publishedAt: Date;

        constructor(public body: IAccount) {
          this.key = 'account.deleted';
          this.publishedAt = new Date();
        }
    }

  }

}
