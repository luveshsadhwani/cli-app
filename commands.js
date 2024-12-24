const fs = require("node:fs");

const help = () => {
  console.log(
    `Usage: node app.js --set [options] value | -n name... | -y yearOfBirth | [name...] [yearOfBirth] [--zodiac | -z]
Options:
--help, -h      Show help
--restore, -b   Restore backup configuration
--version, -v   Show version
--set           Configure default options for name or yearOfBirth
--reset, -r     Reset configuration to default values
--history, -l   Show the last 10 commands executed
--undo, -u      Undo the last configuration change
--clear         Clear the historical commands
    `
  );
};

const version = () => {
  const VERSION_NO = "v1.0.0";
  console.log(VERSION_NO);
};

const setLongForm = (option, args) => {
  // set is always followed by args, for now we don't care what comes before
  if (!["name", "yearOfBirth"].includes(option)) {
    console.error("Only name and yearOfBirth can be set");
    logRun(`SET=true, OPTION=${option}, Only name and yearOfBirth can be set`, {
      isError: true,
    });
    process.exit(1);
  }

  let defaultOptionValue;

  if (option === "name") {
    args.forEach((name) => {
      if (!name) {
        console.error(`Please specify a value for ${option}`);
        logRun(`SET=true, Please specify a value for ${option}`, {
          isError: true,
        });
        process.exit(1);
      }

      if (name.length < 2) {
        console.error(`Name must be at least 2 characters long.`);
        logRun(
          `SET=true, INPUT=${name}, Name must be at least 2 characters long.`,
          {
            isError: true,
          }
        );
        process.exit(1);
      }

      if (!/^[A-Za-z]+$/.test(name)) {
        console.error(`Name can only contain letters.`);
        logRun(`SET=true, INPUT=${name}, Name can only contain letters.`, {
          isError: true,
        });
        process.exit(1);
      }
    });

    defaultOptionValue = args.join(" ");
  }

  if (option === "yearOfBirth") {
    const defaultYearOfBirthArg = args[0];
    const yearOfBirth = Number(defaultYearOfBirthArg);
    // verify year of birth
    if (
      typeof yearOfBirth !== "number" ||
      yearOfBirth > new Date().getFullYear() ||
      yearOfBirth < 1900
    ) {
      // this is preferred over throw Error so that the message is clear and doesn't show the stack trace
      console.error(
        `Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`
      );
      logRun(
        `SET=true, INPUT=${yearOfBirth}, Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`,
        {
          isError: true,
        }
      );
      process.exit(1);
    }

    defaultOptionValue = yearOfBirth;
  }

  writeToBackupConfig(configData);
  writeToUndoConfig(configData);
  configData[option] = defaultOptionValue;
  writeToConfig(configData);
  console.log(`Default ${option} set to ${defaultOptionValue}`);
  return defaultOptionValue;
};

const setName = (option, args) => {
  if (args.length === 0) {
    console.error(`Please specify a value for ${option}`);
    logRun(`SET=true, ALIAS=n, Please specify a value for ${option}`, {
      isError: true,
    });
    process.exit(1);
  }

  args.forEach((name) => {
    if (!name) {
      console.error(`Please specify a value for ${option}`);
      logRun(`SET=true, ALIAS=n, Please specify a value for ${option}`, {
        isError: true,
      });
      process.exit(1);
    }

    if (name.length < 2) {
      console.error(`Name must be at least 2 characters long.`);
      logRun(
        `SET=true, ALIAS=n, INPUT=${name}, Name must be at least 2 characters long.`,
        {
          isError: true,
        }
      );
      process.exit(1);
    }

    if (!/^[A-Za-z]+$/.test(name)) {
      console.error(`Name can only contain letters.`);
      logRun(
        `SET=true, ALIAS=n, INPUT=${name}, Name can only contain letters.`,
        {
          isError: true,
        }
      );
      process.exit(1);
    }
  });

  const defaultOptionValue = args.join(" ");
  writeToBackupConfig(configData);
  writeToUndoConfig(configData);
  configData[option] = defaultOptionValue;
  writeToConfig(configData);
  console.log(`Default ${option} set to ${defaultOptionValue}`);

  return defaultOptionValue;
};

const setYearOfBirth = (option, args) => {
  const defaultOptionArgs = args[0];
  if (!defaultOptionArgs) {
    console.error(`Please specify a value for ${option}`);
    logRun(`SET=true, ALIAS=y, Please specify a value for ${option}`, {
      isError: true,
    });
    process.exit(1);
  }

  const yearOfBirth = Number(defaultOptionArgs);
  // verify year of birth
  if (
    typeof yearOfBirth !== "number" ||
    yearOfBirth > new Date().getFullYear() ||
    yearOfBirth < 1900
  ) {
    // this is preferred over throw Error so that the message is clear and doesn't show the stack trace
    console.error(
      `Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`
    );
    logRun(
      `SET=true, ALIAS=y, INPUT=${yearOfBirth}, Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`,
      {
        isError: true,
      }
    );
    process.exit(1);
  }

  writeToBackupConfig(configData);
  writeToUndoConfig(configData);
  configData[option] = yearOfBirth;
  writeToConfig(configData);
  console.log(`Default ${option} set to ${yearOfBirth}`);
  return yearOfBirth;
};

const greet = (args, configData) => {
  // zodiac flag can be added anywhere, so we need to update args with no flags
  const zodiacFlagIndex = args.findIndex(
    (arg) => arg === "--zodiac" || arg === "-z"
  );
  const commandArgs =
    zodiacFlagIndex > -1 ? args.toSpliced(zodiacFlagIndex, 1) : args;

  const name = commandArgs[0] ?? configData.name; // first arg is node, second is the file name
  const yearOfBirthArg = commandArgs[1] ?? configData.yearOfBirth; // default to 1970

  const yearOfBirth = Number(yearOfBirthArg);
  // verify year of birth
  if (
    typeof yearOfBirth !== "number" ||
    yearOfBirth > new Date().getFullYear() ||
    yearOfBirth < 1900
  ) {
    // this is preferred over throw Error so that the message is clear and doesn't show the stack trace
    console.error(
      `Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`
    );
    logRun(
      `INPUT=${yearOfBirth}, Invalid year of birth. Please enter a year between 1900 and ${new Date().getFullYear()}`,
      {
        isError: true,
      }
    );
    process.exit(1);
  }

  const age = new Date().getFullYear() - yearOfBirth;
  let message = `Hello ${name}, you are ${age} years old.`;

  if (zodiacFlagIndex > -1) {
    const zodiacData = {
      0: "Monkey",
      1: "Rooster",
      2: "Dog",
      3: "Pig",
      4: "Rat",
      5: "Ox",
      6: "Tiger",
      7: "Rabbit",
      8: "Dragon",
      9: "Snake",
      10: "Horse",
      11: "Goat",
    };

    const zodiacSign = zodiacData[yearOfBirth % 12];
    message += `\nYour Zodiac sign is ${zodiacSign}.`;
  }

  console.log(message);
  return {
    name,
    age,
    zodiacFlag: zodiacFlagIndex > -1,
  };
};

const reset = () => {
  writeToBackupConfig(configData);
  writeToConfig(DEFAULT_CONFIG_DATA);
  console.log(`Reset configuration to default values`);
};

const undo = () => {
  let configUndoData = {};
  try {
    configUndoData = JSON.parse(
      fs.readFileSync(UNDO_CONFIG_PATH, { encoding: "utf-8" })
    );
    writeToUndoConfig(configData);
    writeToConfig(configUndoData);
    console.log(`Configuration reverted to previous state.`);
    return { configUndoFileFound: true };
  } catch {
    console.log(
      `No undo file found, creating one. No changes will be made to the config`
    );
    writeToUndoConfig(configData);
    return { configFileFound: false };
  }
};

const restore = () => {
  let configBackupData = {};
  try {
    configBackupData = JSON.parse(
      fs.readFileSync(BACKUP_CONFIG_PATH, { encoding: "utf-8" })
    );
    writeToConfig(configBackupData);
    console.log(`Restored backup configuration`);
    return { backupFileFound: true };
  } catch {
    console.log(`No backup found. Creating a backup now.`);
    writeToBackupConfig(configData);
    return { backupFileFound: false };
  }
};

const history = (option = "filter", args = "") => {
  if (option !== "--filter") {
    console.error(`${option} is not a valid flag`);
    logRun(`HISTORY=true, OPTION=${option}, ${option} is not a valid flag.`, {
      isError: true,
    });
    process.exit(1);
  }

  try {
    const logHistory = fs
      .readFileSync(LOGS_PATH, { encoding: "utf-8" })
      .split("\n")
      .filter((line) => line.trim());

    const regex = new RegExp(args, "i"); // Case-insensitive filter
    const filteredLogHistory = logHistory.filter((log) => regex.test(log));
    if (filteredLogHistory.length === 0) {
      console.log("No matching logs found.");
    } else {
      console.log(filteredLogHistory.slice(-10).join("\n"));
    }
    return { logFileFound: true };
  } catch (e) {
    console.log(`No log file found. Creating one. No history will be printed`);
    return { logFileFound: false };
  }
};

const clearLogs = () => {
  try {
    fs.readFileSync(LOGS_PATH, { encoding: "utf-8" });
    fs.writeFileSync(LOGS_PATH, "");
    console.log("History is cleared.");
    return { logFileFound: true };
  } catch (e) {
    console.log(`No log file found. Creating one. No history will be cleared.`);
    return { logFileFound: false };
  }
};

const logStats = () => {
  try {
    const logHistory = fs
      .readFileSync(LOGS_PATH, { encoding: "utf-8" })
      .split("\n")
      .filter((line) => line.trim());

    const numberOfLogs = logHistory.length;

    const errorRegex = new RegExp("ERROR");
    const errorLogsCount = logHistory.filter((log) =>
      errorRegex.test(log)
    ).length;

    const helpCommandRegex = new RegExp("HELP");
    const versionCommandRegex = new RegExp("VERSION");
    const setCommandRegex = new RegExp("SET");
    const resetCommandRegex = new RegExp("RESET");
    const restoreCommandRegex = new RegExp("RESTORE");
    const undoCommandRegex = new RegExp("UNDO");
    const historyCommandRegex = new RegExp("HISTORY");
    const clearCommandRegex = new RegExp("CLEAR");
    const statsCommandRegex = new RegExp("STATS");

    const commandLogsCount = logHistory.reduce(
      (acc, log) => {
        if (helpCommandRegex.test(log)) {
          acc.helpCount += 1;
        }

        if (versionCommandRegex.test(log)) {
          acc.versionCount += 1;
        }

        if (setCommandRegex.test(log)) {
          acc.setCount += 1;
        }

        if (resetCommandRegex.test(log)) {
          acc.resetCount += 1;
        }

        if (restoreCommandRegex.test(log)) {
          acc.restoreCount += 1;
        }

        if (undoCommandRegex.test(log)) {
          acc.undoCount += 1;
        }

        if (historyCommandRegex.test(log)) {
          acc.historyCount += 1;
        }

        if (clearCommandRegex.test(log)) {
          acc.clearCount += 1;
        }

        if (statsCommandRegex.test(log)) {
          acc.statsCount += 1;
        }

        return acc;
      },

      {
        helpCount: 0,
        versionCount: 0,
        setCount: 0,
        resetCount: 0,
        restoreCount: 0,
        undoCount: 0,
        historyCount: 0,
        clearCount: 0,
        statsCount: 0,
      }
    );

    console.log(`Total number of logs: ${numberOfLogs}`);
    const errorPercentage = ((errorLogsCount / numberOfLogs) * 100).toFixed(2);
    console.log(`Error Rate: ${errorPercentage}%`);

    console.log(`Number of --help commands: ${commandLogsCount.helpCount}`);
    console.log(
      `Number of --version commands: ${commandLogsCount.versionCount}`
    );
    console.log(`Number of --set commands: ${commandLogsCount.setCount}`);
    console.log(`Number of --reset commands: ${commandLogsCount.resetCount}`);
    console.log(
      `Number of --restore commands: ${commandLogsCount.restoreCount}`
    );
    console.log(`Number of --undo commands: ${commandLogsCount.undoCount}`);
    console.log(
      `Number of --history commands: ${commandLogsCount.historyCount}`
    );
    console.log(`Number of --clear commands: ${commandLogsCount.clearCount}`);
    console.log(`Number of --stats commands: ${commandLogsCount.statsCount}`);
    return { logFileFound: true };
  } catch (e) {
    console.log(`No log file found. Creating one. No history will be printed`);
    return { logFileFound: false };
  }
};

function logRun(content, { isError } = { isError: false }) {
  const timestamp = new Date().toISOString();
  let text = `\n[${timestamp}]: `;
  if (isError) text += `ERROR=true, `;
  text += content;
  fs.appendFileSync("./logs.txt", text);
}

function writeToConfig(data) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data));
}

function writeToBackupConfig(data) {
  fs.writeFileSync(BACKUP_CONFIG_PATH, JSON.stringify(data));
  console.log(`Backup created.`);
}

function writeToUndoConfig(data) {
  fs.writeFileSync(UNDO_CONFIG_PATH, JSON.stringify(data));
}

module.exports = {
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
};
