export const DEFAULT_IVC_HOST = 'jakedot.net';
export const DEFAULT_IVC_CHANNEL = 'ivc';
export const DEFAULT_IVC_URI = `ivc://${DEFAULT_IVC_HOST}/#${DEFAULT_IVC_CHANNEL}`;

export interface IvcConfig {
  host: string;
  channel: string;
  secure?: boolean;
}

export const getIvcConfig = (host = DEFAULT_IVC_HOST, channel = DEFAULT_IVC_CHANNEL, secure = true): IvcConfig => ({
  host,
  channel,
  secure
});
