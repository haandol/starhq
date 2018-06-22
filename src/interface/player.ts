import { IEvent } from './event';

export namespace Player {

  export interface IPlayer {
    id: string;
    name: string;
    image: string;
    createdAt: Date;
    updatedAt?: Date;
  }

  export namespace Event {

    export class PlayerCreated implements IEvent<IPlayer> {
      key: string;
      publishedAt: Date;

      constructor(public body: IPlayer) {
        this.key = 'player.created';
        this.publishedAt = new Date();
      }
    }

    export class PlayerUpdated implements IEvent<IPlayer> {
      key: string;
      publishedAt: Date;

      constructor(public body: IPlayer) {
        this.key = 'player.updated';
        this.publishedAt = new Date();
      }
    }

    export class PlayerDeleted implements IEvent<IPlayer> {
      key: string;
      publishedAt: Date;

      constructor(public body: IPlayer) {
        this.key = 'player.deleted';
        this.publishedAt = new Date();
      }
    }

  }

}