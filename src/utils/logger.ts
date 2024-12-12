const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const symbols = {
  info: "ℹ️",
  error: "❌",
  warn: "⚠️",
  debug: "🔍",
  success: "✅",
};

function formatMessage(message: string, args: any[]): string {
  if (args.length === 0) return message;
  
  // If the first argument is an object/array, pretty print it
  if (typeof args[0] === 'object') {
    return `${message}\n${JSON.stringify(args[0], null, 2)}`;
  }
  
  return `${message} ${args.join(' ')}`;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`${colors.blue}${symbols.info} ${colors.bright}${formatMessage(message, args)}${colors.reset}`);
  },

  error: (message: string, ...args: any[]) => {
    console.error(`${colors.red}${symbols.error} ${colors.bright}${formatMessage(message, args)}${colors.reset}`);
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`${colors.yellow}${symbols.warn} ${colors.bright}${formatMessage(message, args)}${colors.reset}`);
  },

  debug: (message: string, ...args: any[]) => {
    console.debug(`${colors.magenta}${symbols.debug} ${colors.dim}${formatMessage(message, args)}${colors.reset}`);
  },

  success: (message: string, ...args: any[]) => {
    console.log(`${colors.green}${symbols.success} ${colors.bright}${formatMessage(message, args)}${colors.reset}`);
  }
}; 