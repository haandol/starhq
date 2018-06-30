export namespace Param {

  export interface Request {
    params?: any;
    query?: any;
    body?: any;
    headers?: any;
    user?: any;
  }

  export interface RpcParam {
    uri: string;
    payload?: any;
  }

}