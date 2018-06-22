import { IEvent } from './event';

export namespace Project {

  export interface IProject {
    id: string;
    teamId: string;
    ownerId: string;
    name: string;
    key: string;
    createdAt: Date;
    updatedAt?: Date;
  }

  export namespace Event {

    export class ProjectCreated implements IEvent<IProject> {
      key: string;
      publishedAt: Date;

      constructor(public body: IProject) {
        this.key = 'project.created';
        this.publishedAt = new Date();
      }
    }

    export class ProjectUpdated implements IEvent<IProject> {
      key: string;
      publishedAt: Date;

      constructor(public body: IProject) {
        this.key = 'project.updated';
        this.publishedAt = new Date();
      }
    }

    export class ProjectDeleted implements IEvent<IProject> {
      key: string;
      publishedAt: Date;

      constructor(public body: IProject) {
        this.key = 'project.deleted';
        this.publishedAt = new Date();
      }
    }

  }

}