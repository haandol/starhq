export namespace Param {

  export interface User {
    id: string;
    username: string;
    level: number;
  }

  export interface Request {
    params?: any;
    query?: any;
    body?: any;
    headers?: any;
    user?: User;
  }

  export interface RpcParam {
    uri: string;
    payload?: any;
  }

}