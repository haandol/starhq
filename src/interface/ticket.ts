import { IEvent } from './event';

export namespace Ticket {

  export interface ITicket {
    id: string;
    projectId: string;
    assignee?: string;
    kind: string;
    reporter: string;
    attendees: [string];
    title: string;
    desc?: string;
    priority: Number;
    epic?: string,
    tasks: [string];
    progress: number;
    dueDate?: Date;
    estimateScore: number;
    spentHour: number;
    obstacles: [{severity: number, detail: any}];
    createdAt: Date;
    updatedAt?: Date;
  }

  export namespace Event {
    export class TicketCreated implements IEvent<ITicket> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITicket) {
        this.key = 'issue.created';
        this.publishedAt = new Date();
      }
    }

    export class TicketUpdated implements IEvent<ITicket> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITicket) {
        this.key = 'issue.updated';
        this.publishedAt = new Date();
      }
    }

    export class TicketDeleted implements IEvent<ITicket> {
      key: string;
      publishedAt: Date;

      constructor(public body: ITicket) {
        this.key = 'issue.deleted';
        this.publishedAt = new Date();
      }
    }
  }

}  