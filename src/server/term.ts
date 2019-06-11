import { spawn, IPtyForkOptions } from 'node-pty';
import { isUndefined } from 'lodash';
import logger from './logger';

const xterm: IPtyForkOptions = {
  name: 'xterm-256color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: Object.assign(
    {},
    ...Object.keys(process.env)
      .filter((key: string) => !isUndefined(process.env[key]))
      .map((key: string) => ({ [key]: process.env[key] }))
  ),
};

export default class Term {
  public static spawn(socket: SocketIO.Socket, args: string[]): void {
    const term = spawn('/usr/bin/env', args, xterm);
    const { pid } = term;
    const address = args[0] === 'ssh' ? args[1] : 'localhost';
    logger.info('Process Started on behalf of user', {
      pid,
      address,
    });
    socket.emit('login');
    term.on('exit', code => {
      logger.info('Process exited', { code, pid });
      socket.emit('logout');
      socket
        .removeAllListeners('disconnect')
        .removeAllListeners('resize')
        .removeAllListeners('input');
    });
    term.on('data', data => {
      socket.emit('data', data);
    });
    socket
      .on('resize', ({ cols, rows }) => {
        term.resize(cols, rows);
      })
      .on('input', input => {
        if (!isUndefined(term)) term.write(input);
      })
      .on('disconnect', () => {
        term.kill();
        logger.info('Process exited', { code: 0, pid });
      });
  }

  public static login(socket: SocketIO.Socket): Promise<string> {

    // Check request-header for username
    const remoteUser = socket.request.headers['remote-user'];
    if (remoteUser) {
      return new Promise.resolve(remoteUser);
    }

    // Request carries no username information
    // Create terminal and ask user for username
    const term = spawn(
      '/usr/bin/env',
      ['node', `${__dirname}/buffer.js`],
      xterm
    );
    let buf = '';
    return new Promise((resolve, reject) => {
      term.on('exit', () => {
        resolve(buf);
      });
      term.on('data', data => {
        socket.emit('data', data);
      });
      socket
        .on('input', (input: string) => {
          term.write(input);
          buf = /\177/.exec(input) ? buf.slice(0, -1) : buf + input;
        })
        .on('disconnect', () => {
          term.kill();
          reject();
        });
    });
  }
}
