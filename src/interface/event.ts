export interface IEvent<T> {
  root: string;
  key: string;
  body: T;
  publishedAt: Date;
}

export class HelloEvent implements IEvent<any> {
  key: string;
  publishedAt: Date;

  constructor(public root: string, public body: any) {
    this.key = 'hello';
    this.publishedAt = new Date();
  }
}
