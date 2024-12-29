const fs = require("node:fs");
const {
  help,
  version,
  setLongForm,
  setName,
  setYearOfBirth,
  greet,
  reset,
  undo,
  restore,
  history,
  clearLogs,
  logStats,
} = require("./commands");

global.DEFAULT_CONFIG_DATA = {
  name: "Traveller",
  yearOfBirth: 1970,
};

global.CONFIG_PATH = "./config.json";
global.BACKUP_CONFIG_PATH = "./config_backup.json";
global.UNDO_CONFIG_PATH = "./config_undo.json";
global.LOGS_PATH = "./logs.txt";

const commandAliasMap = {
  "--configure": "--set",
  "--rollback": "--undo",
  "--purge": "--clear",
};
const existingLongFormCommands = [
  "--help",
  "--version",
  "--set",
  "--reset",
  "--restore",
  "--undo",
  "--history",
  "--clear",
  "--stats",
  ...Object.keys(commandAliasMap),
];

const args = process.argv.slice(2);
const commands = getCommands(args);
commands.forEach((c) => {
  const existingCommand = existingLongFormCommands.includes(c);
  if (!existingCommand) {
    let highestSimilarity = 0;
    let suggestedCommand = "";
    existingLongFormCommands.forEach((eCommand) => {
      const similarity =
        1 -
        levenshteinDistance(eCommand, c) / Math.max(eCommand.length, c.length);
      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        suggestedCommand = eCommand;
      }
    });

    if (highestSimilarity > 0.6 && suggestedCommand !== "") {
      console.error(
        `'${c}' is not a valid command.\nDid you mean '${suggestedCommand}'?`
      );
      logRun(
        `INPUT=${commands.join(
          ","
        )}, SUGGESTED_COMMAND=${suggestedCommand}, SIMILARITY_SCORE=${highestSimilarity}`,
        {
          isError: true,
        }
      );
      process.exit(1);
    }

    if (highestSimilarity < 0.6) {
      console.error(
        `'${c}' is not a valid command.\nUse --help to see available commands.`
      );

      logRun(
        `INPUT=${commands.join(
          ","
        )}, SUGGESTED_COMMAND=NULL, SIMILARITY_SCORE=${highestSimilarity}`,
        {
          isError: true,
        }
      );
      process.exit(1);
    }
  }
});

const normalizedArgs = args.map((arg) => commandAliasMap[arg] || arg);

function getCommands(a) {
  const argsRegex = new RegExp(/^--[a-z]+|^-[a-z]/i);
  return a.filter((el) => argsRegex.test(el));
}

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 1; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const indicator = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + indicator // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

const helpFlag = normalizedArgs.find((arg) => arg === "--help" || arg === "-h");
const versionFlag = normalizedArgs.find(
  (arg) => arg === "--version" || arg === "-v"
);
const setFlagIndex = normalizedArgs.findIndex((arg) => arg === "--set");
const setNameAliasIndex = normalizedArgs.findIndex((arg) => arg === "-n");
const setYearOfBirthAliasIndex = normalizedArgs.findIndex(
  (arg) => arg === "-y"
);
const resetFlag = normalizedArgs.find(
  (arg) => arg === "--reset" || arg === "-r"
);
const restoreFlag = normalizedArgs.find(
  (arg) => arg === "--restore" || arg === "-b"
);
const undoFlag = normalizedArgs.find((arg) => arg === "--undo" || arg === "-u");
const historyFlagIndex = normalizedArgs.findIndex(
  (arg) => arg === "--history" || arg === "-l"
);
const clearFlag = normalizedArgs.find((arg) => arg === "--clear");
const statsFlag = normalizedArgs.find((arg) => arg === "--stats");

// help > version > set > set alias name > set alias year of birth > reset > restore > undoFlag > history
if (helpFlag) {
  help();
  logRun("HELP=true");
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (versionFlag) {
  version();
  logRun("VERSION=true");
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

global.configData = DEFAULT_CONFIG_DATA;
try {
  global.configData = JSON.parse(
    fs.readFileSync(CONFIG_PATH, { encoding: "utf-8" })
  );
} catch {}

if (setFlagIndex > -1) {
  const option = args.slice(setFlagIndex + 1)[0];
  const optionArgs = args.slice(setFlagIndex + 1).slice(1);
  const defaultOptionValue = setLongForm(option, optionArgs);
  logRun(
    `SET=true, defaultOptionKey=${option}, defaultOptionValue=${defaultOptionValue}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (setNameAliasIndex > -1) {
  const option = "name";
  const optionArgs = args.slice(setNameAliasIndex + 1); // we don't evaluate what comes before
  const defaultOptionValue = setName(option, optionArgs);
  logRun(
    `SET=true, ALIAS=n, defaultOptionKey=${option}, defaultOptionValue=${defaultOptionValue}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (setYearOfBirthAliasIndex > -1) {
  const option = "yearOfBirth";
  const optionArgs = args.slice(setYearOfBirthAliasIndex + 1); // we don't care what comes before
  const defaultOptionValue = setYearOfBirth(option, optionArgs);
  logRun(
    `SET=true, ALIAS=y, defaultOptionKey=${option}, defaultOptionArgs=${defaultOptionValue}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (resetFlag) {
  reset();
  logRun(`RESET=true`);
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (restoreFlag) {
  const { backupFileFound } = restore();
  logRun(
    `RESTORE=true, BACKUP_CONFIG_PATH=${BACKUP_CONFIG_PATH}, BACKUP_FILE_FOUND=${backupFileFound}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (undoFlag) {
  const { configUndoFileFound } = undo();
  logRun(
    `UNDO=true, UNDO_CONFIG_PATH=${UNDO_CONFIG_PATH}, UNDO_FILE_FOUND=${configUndoFileFound}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (historyFlagIndex > -1) {
  const option = args.slice(historyFlagIndex + 1)[0];
  const optionArgs = args.slice(historyFlagIndex + 1)[1]; // we don't care what comes before
  const { logFileFound } = history(option, optionArgs);
  logRun(
    `HISTORY=true, LOGS_PATH=${LOGS_PATH}, LOG_FILE_FOUND=${logFileFound}`
  );
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (clearFlag) {
  const { logFileFound } = clearLogs();
  logRun(`CLEAR=true, LOGS_PATH=${LOGS_PATH}, LOG_FILE_FOUND=${logFileFound}`);
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

if (statsFlag) {
  const { logFileFound } = logStats();
  logRun(`STATS=true, LOGS_PATH=${LOGS_PATH}, LOG_FILE_FOUND=${logFileFound}`);
  if (args.some((arg) => commandAliasMap[arg])) {
    const aliasUsed = args.find((arg) => commandAliasMap[arg]);
    logRun(
      `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
    );
  }

  process.exit(0);
}

const { name, age, zodiacFlag } = greet(args, configData);
logRun(`GREET=true, name=${name}, age=${age}, ZODIAC=${zodiacFlag}`);
if (args.some((arg) => commandAliasMap[arg])) {
  const aliasUsed = args.find((arg) => commandAliasMap[arg]);
  logRun(
    `ALIAS=true, ORIGINAL_COMMAND=${aliasUsed}, RESOLVED_TO=${commandAliasMap[aliasUsed]}`
  );
}

process.exit(0);

function logRun(content, { isError } = { isError: false }) {
  const timestamp = new Date().toISOString();
  let text = `\n[${timestamp}]: `;
  if (isError) text += `ERROR=true, `;
  text += content;
  fs.appendFileSync(LOGS_PATH, text);
}
