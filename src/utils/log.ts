import { styleText } from "node:util";

export const log = {
  info: (message: string) => console.log(styleText("blue", "[INFO]"), message),
  success: (message: string) =>
    console.log(styleText("green", "[OK]"), message),
  warn: (message: string) =>
    console.log(styleText("yellow", "[WARN]"), message),
  error: (message: string) => console.log(styleText("red", "[ERR]"), message),
};
