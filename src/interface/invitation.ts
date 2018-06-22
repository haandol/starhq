import { IEvent } from './event';

export namespace Invitation {

  export interface IInvitation {
    id: string;
    teamId: string;
    userId: string;
    createdAt: Date;
    updatedAt?: Date;
  }

  export namespace Event {
    export class InvitationCreated implements IEvent<IInvitation> {
      key: string;
      publishedAt: Date;

      constructor(public body: IInvitation) {
        this.key = 'invitation.created';
        this.publishedAt = new Date();
      }
    }

    export class InvitationAccepted implements IEvent<IInvitation> {
      key: string;
      publishedAt: Date;

      constructor(public body: IInvitation) {
        this.key = 'invitation.accepted';
        this.publishedAt = new Date();
      }
    }

    export class InvitationRejected implements IEvent<IInvitation> {
      key: string;
      publishedAt: Date;

      constructor(public body: IInvitation) {
        this.key = 'invitation.rejected';
        this.publishedAt = new Date();
      }
    }
  }

}
