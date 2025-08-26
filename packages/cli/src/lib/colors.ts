// Simple color utility to avoid dependency conflicts
const colors = {
    reset: (text: string) => `\x1b[0m${text}\x1b[0m`,
    bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
    dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
    italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
    underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
    inverse: (text: string) => `\x1b[7m${text}\x1b[0m`,
    hidden: (text: string) => `\x1b[8m${text}\x1b[0m`,
    strikethrough: (text: string) => `\x1b[9m${text}\x1b[0m`,

    black: (text: string) => `\x1b[30m${text}\x1b[0m`,
    red: (text: string) => `\x1b[31m${text}\x1b[0m`,
    green: (text: string) => `\x1b[32m${text}\x1b[0m`,
    yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
    blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
    magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
    cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
    white: (text: string) => `\x1b[37m${text}\x1b[0m`,
    gray: (text: string) => `\x1b[90m${text}\x1b[0m`,

    bgBlack: (text: string) => `\x1b[40m${text}\x1b[0m`,
    bgRed: (text: string) => `\x1b[41m${text}\x1b[0m`,
    bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
    bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
    bgBlue: (text: string) => `\x1b[44m${text}\x1b[0m`,
    bgMagenta: (text: string) => `\x1b[45m${text}\x1b[0m`,
    bgCyan: (text: string) => `\x1b[46m${text}\x1b[0m`,
    bgWhite: (text: string) => `\x1b[47m${text}\x1b[0m`,
};

export { colors };
