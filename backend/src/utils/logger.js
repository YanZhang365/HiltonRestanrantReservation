import fs from 'fs';
import path from 'path';
import { inspect } from 'util';

if (!fs.existsSync('logs')) {
  fs.mkdirSync('logs');
}

const colors = {
  info: '\x1b[34m',    // 蓝色
  warn: '\x1b[33m',    // 黄色
  error: '\x1b[31m',   // 红色
  debug: '\x1b[32m',   // 绿色
  reset: '\x1b[0m'     // 重置颜色
};

const getTimestamp = () => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-') + ' ' + [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join(':');
};

const parseArgs = (args) => {
  let message = '';
  const meta = [];
  
  if (args.length > 0) {
    message = args[0];
    meta.push(...args.slice(1));
  }

  const splatSymbol = Symbol.for('splat');
  if (args[0] && typeof args[0] === 'object' && splatSymbol in args[0]) {
    meta.push(...args[0][splatSymbol]);
  }

  const metaString = meta.map(item => {
    if (typeof item === 'object' && item !== null) {
      return inspect(item, { depth: null, colors: false });
    }
    return item;
  }).join(' ');

  return `${message} ${metaString}`.trim();
};

const log = (level, ...args) => {
  const timestamp = getTimestamp();
  const levelUpper = level.toUpperCase();
  const content = parseArgs(args);
  
  const consoleOutput = `[${timestamp}] [${colors[level]}${levelUpper}${colors.reset}] : ${content}`;
  console.log(consoleOutput);

  const fileOutput = `[${timestamp}] [${levelUpper}] : ${content}\n`;
  const logFile = level === 'error' 
    ? path.join('logs', 'error.log') 
    : path.join('logs', 'combined.log');
  
  fs.appendFile(logFile, fileOutput, (err) => {
    if (err) console.error('日志写入失败:', err);
  });
};

const logger = {
  info: (...args) => log('info', ...args),
  warn: (...args) => log('warn', ...args),
  error: (...args) => log('error', ...args),
  debug: (...args) => log('debug', ...args)
};


export default logger;