import chalk from "chalk";

export const log = {
  info: (message: string) => console.log(chalk.blue("[INFO]"), message),
  success: (message: string) => console.log(chalk.green("[OK]"), message),
  warn: (message: string) => console.log(chalk.yellow("[WARN]"), message),
  error: (message: string) => console.log(chalk.red("[ERR]"), message),
};
