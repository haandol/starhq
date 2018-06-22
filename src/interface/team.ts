import { IEvent } from './event';

export namespace Team {

  export interface ITeam {
    id: string;
    ownerId: string;
    name: string;
    createdAt: Date;
    updatedAt?: Date;
  }

  export namespace Event {
    export class TeamCreated implements IEvent<ITeam> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITeam) {
        this.key = 'team.created';
        this.publishedAt = new Date();
      }
    }

    export class TeamUpdated implements IEvent<ITeam> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITeam) {
        this.key = 'team.updated';
        this.publishedAt = new Date();
      }
    }

    export class TeamDeleted implements IEvent<ITeam> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITeam) {
        this.key = 'team.deleted';
        this.publishedAt = new Date();
      }
    }

    export class TeamMemberAdded implements IEvent<ITeam> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITeam) {
        this.key = 'team.member.added';
        this.publishedAt = new Date();
      }
    }
  }

}
