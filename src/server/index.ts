import { isUndefined } from 'lodash';
import * as yargs from 'yargs';
import logger from './logger';
import WeTTy from './wetty';
import { Server as ServerInt, SSH, SSL } from './interfaces';

interface Options {
  sshhost: string;
  sshport: number;
  sshuser: string;
  sshauth: string;
  sshkey?: string;
  sshpass?: string;
  sslkey?: string;
  sslcert?: string;
  base: string;
  host: string;
  port: number;
  title: string;
  command?: string;
  bypasshelmet?: boolean;
}

interface CLI extends Options {
  help: boolean;
}

export default class Server {
  private static unWrapArgs(
    args: Options
  ): { ssh: SSH; server: ServerInt; command?: string; ssl?: SSL } {
    return {
      ssh: {
        user: args.sshuser,
        host: args.sshhost,
        auth: args.sshauth,
        port: args.sshport,
        pass: args.sshpass,
        key: args.sshkey,
      },
      server: {
        base: args.base,
        host: args.host,
        port: args.port,
        title: args.title,
        bypasshelmet: args.bypasshelmet,
      },
      command: args.command,
      ssl:
        isUndefined(args.sslkey) || isUndefined(args.sslcert)
          ? undefined
          : { key: args.sslkey, cert: args.sslcert },
    };
  }

  public static start(args: Options): Promise<void> {
    const { ssh, server, command, ssl } = this.unWrapArgs(args);
    return WeTTy.start(ssh, server, command, ssl);
  }

  public static get wetty(): WeTTy {
    return WeTTy;
  }

  public static init(opts: CLI): void {
    if (!opts.help) {
      this.start(opts).catch(err => {
        logger.error(err);
        process.exitCode = 1;
      });
    } else {
      yargs.showHelp();
      process.exitCode = 0;
    }
  }
}
