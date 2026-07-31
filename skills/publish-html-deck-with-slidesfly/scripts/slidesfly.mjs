#!/usr/bin/env node
import { createRequire as __cr } from 'node:module';
const require = __cr(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/error.js
var require_error = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/help.js
var require_help = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b) => {
            return a.name().localeCompare(b.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str.match(manualIndent)) return str;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str;
        const leadingStr = str.slice(0, indent);
        const columnText = str.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i) => {
          if (line === "\n") return "";
          return (i > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports.Help = Help2;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/option.js
var require_option = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str) {
      return str.split("-").reduce((str2, word) => {
        return str2 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b) {
      if (Math.abs(a.length - b.length) > maxDistance)
        return Math.max(a.length, b.length);
      const d = [];
      for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
      }
      for (let j = 0; j <= b.length; j++) {
        d[0][j] = j;
      }
      for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
          let cost = 1;
          if (a[i - 1] === b[j - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i][j] = Math.min(
            d[i - 1][j] + 1,
            // deletion
            d[i][j - 1] + 1,
            // insertion
            d[i - 1][j - 1] + cost
            // substitution
          );
          if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
            d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
          }
        }
      }
      return d[a.length][b.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b) => a.localeCompare(b));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/command.js
var require_command = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/lib/command.js"(exports) {
    var EventEmitter = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process2 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str) => process2.stdout.write(str),
          writeErr: (str) => process2.stderr.write(str),
          getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : void 0,
          getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : void 0,
          outputError: (str, write) => write(str)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process2.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process2.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process2.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process2.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process2.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process2.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process2.execArgv).concat(args);
            proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process2.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process2.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process2.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i) => {
          if (arg.required && this.args[i] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i = 0; i < len; i++) {
            const key = this.options[i].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process2.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str, flags, description) {
        if (str === void 0) return this._version;
        this._version = str;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str}
`);
          this._exit(0, "commander.version", str);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str, argsDescription) {
        if (str === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str) {
        if (str === void 0) return this._summary;
        this._summary = str;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str) {
        if (str === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str) {
        if (str === void 0) return this._name;
        this._name = str;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process2.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports.Command = Command2;
  }
});

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/index.js
var require_commander = __commonJS({
  "../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// src/index.ts
import { readFileSync } from "node:fs";
import { dirname as dirname6, join as join6 } from "node:path";
import { fileURLToPath as fileURLToPath3 } from "node:url";

// ../../node_modules/.pnpm/commander@12.1.0/node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/api.ts
import { createHash, randomUUID } from "node:crypto";
var ANON_CLAIM_TOKEN_HEADER = "X-Slidesfly-Claim-Token";
var ApiError = class extends Error {
  constructor(code, message, details, hint) {
    super(message);
    this.code = code;
    this.details = details;
    this.hint = hint;
    this.name = "ApiError";
  }
};
function publishIdempotencyKey(input) {
  const fileHash = createHash("sha256").update(input.fileBuffer).digest("hex");
  const payload = [
    input.deckId ?? "",
    input.filename,
    input.title ?? "",
    input.visibility ?? "",
    String(input.fileBuffer.byteLength),
    fileHash
  ].join("\n");
  return `sf_${createHash("sha256").update(payload).digest("hex").slice(0, 40)}`;
}
function getDefaultBaseUrl() {
  return process.env.SLIDESFLY_API_URL ?? "https://slidesfly.com";
}
function throwApiFailure(body, status) {
  const error = body?.error;
  if (error && typeof error.code === "string") {
    throw new ApiError(error.code, error.message, error.details, error.hint);
  }
  throw new ApiError("NETWORK_ERROR", `Unexpected API response (${status})`);
}
async function parseApiResponse(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("NETWORK_ERROR", `Invalid JSON response (${response.status})`);
  }
  if (!body?.ok) {
    throwApiFailure(body, response.status);
  }
  return body.data;
}
async function parseApiResponseWithWarnings(response) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("NETWORK_ERROR", `Invalid JSON response (${response.status})`);
  }
  if (!body?.ok) {
    throwApiFailure(body, response.status);
  }
  return { data: body.data, warnings: body.warnings };
}
function createApiClient(opts) {
  const baseUrl = (opts?.baseUrl ?? getDefaultBaseUrl()).replace(/\/$/, "");
  return {
    async publishAnonymous({ fileBuffer, filename, title }) {
      const form = new FormData();
      form.append("file", new Blob([fileBuffer]), filename);
      if (title !== void 0) {
        form.append("title", title);
      }
      const response = await fetch(`${baseUrl}/api/decks/anonymous`, {
        method: "POST",
        headers: {
          "Idempotency-Key": publishIdempotencyKey({ fileBuffer, filename, title })
        },
        body: form
      });
      const { data, warnings } = await parseApiResponseWithWarnings(response);
      return { ...data, warnings };
    },
    async deleteAnon(deckId, token) {
      const response = await fetch(`${baseUrl}/api/anon/${encodeURIComponent(deckId)}/delete`, {
        method: "POST",
        headers: { [ANON_CLAIM_TOKEN_HEADER]: token }
      });
      await parseApiResponse(response);
    },
    async updateAnon(deckId, token, fileBuffer, filename) {
      const form = new FormData();
      form.append("file", new Blob([fileBuffer]), filename);
      const response = await fetch(`${baseUrl}/api/anon/${encodeURIComponent(deckId)}/update`, {
        method: "POST",
        headers: { [ANON_CLAIM_TOKEN_HEADER]: token },
        body: form
      });
      const data = await parseApiResponse(response);
      return { version: data.version };
    },
    async visibilityAnon(deckId, visibility) {
      const response = await fetch(`${baseUrl}/api/anon/${encodeURIComponent(deckId)}/visibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility })
      });
      await parseApiResponse(response);
      throw new ApiError("UNEXPECTED", "visibilityAnon should always fail for anonymous decks");
    },
    async claimBatch(items, apiKey) {
      const response = await fetch(`${baseUrl}/api/claim`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(items)
      });
      return parseApiResponse(response);
    },
    async exchangeCliAuth(code, codeVerifier) {
      const response = await fetch(`${baseUrl}/api/cli/auth/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: codeVerifier })
      });
      const data = await parseApiResponse(response);
      return { apiKey: data.api_key, prefix: data.prefix };
    },
    async registerDeviceAuth(state, codeChallenge, codeChallengeMethod = "S256") {
      const response = await fetch(`${baseUrl}/api/cli/auth/device/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod
        })
      });
      await parseApiResponse(response);
      return { registered: true };
    },
    async exchangeDeviceCode(userCode, state, codeVerifier) {
      const response = await fetch(`${baseUrl}/api/cli/auth/exchange-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_code: userCode,
          state,
          code_verifier: codeVerifier
        })
      });
      const data = await parseApiResponse(response);
      return { apiKey: data.api_key, prefix: data.prefix };
    },
    async publishOwned({ fileBuffer, filename, title, visibility }, apiKey) {
      const form = new FormData();
      form.append("file", new Blob([fileBuffer]), filename);
      if (title !== void 0) {
        form.append("title", title);
      }
      if (visibility !== void 0) {
        form.append("visibility", visibility);
      }
      const response = await fetch(`${baseUrl}/api/decks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": publishIdempotencyKey({
            fileBuffer,
            filename,
            title,
            visibility
          })
        },
        body: form
      });
      const { data, warnings } = await parseApiResponseWithWarnings(response);
      return { ...data, warnings };
    },
    async updateOwned(deckId, fileBuffer, filename, apiKey, title) {
      const form = new FormData();
      form.append("file", new Blob([fileBuffer]), filename);
      if (title !== void 0) {
        form.append("title", title);
      }
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/update`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Idempotency-Key": publishIdempotencyKey({
            fileBuffer,
            filename,
            title,
            deckId
          })
        },
        body: form
      });
      return parseApiResponse(response);
    },
    async deleteOwned(deckId, apiKey) {
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/delete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      await parseApiResponse(response);
    },
    async setVisibilityOwned(deckId, visibility, apiKey) {
      const response = await fetch(
        `${baseUrl}/api/decks/${encodeURIComponent(deckId)}/visibility`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ visibility })
        }
      );
      return parseApiResponse(response);
    },
    async setExpiryOwned(deckId, expiresAt, apiKey) {
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/expiry`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ expires_at: expiresAt })
      });
      return parseApiResponse(response);
    },
    async setPasswordOwned(deckId, password, apiKey) {
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password })
      });
      return parseApiResponse(response);
    },
    async setAllowlistOwned(deckId, emails, apiKey) {
      const response = await fetch(
        `${baseUrl}/api/decks/${encodeURIComponent(deckId)}/email-allowlist`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ emails })
        }
      );
      return parseApiResponse(response);
    },
    async listOwned(apiKey) {
      const response = await fetch(`${baseUrl}/api/decks`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return parseApiResponse(response);
    },
    async listVersions(deckId, apiKey) {
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/versions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      return parseApiResponse(response);
    },
    async restoreOwned(deckId, version, apiKey) {
      const response = await fetch(`${baseUrl}/api/decks/${encodeURIComponent(deckId)}/restore`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Per-attempt key: restoring the same source version twice (after a
          // newer publish) must not replay a prior restore response.
          "Idempotency-Key": `sf_restore_${randomUUID()}`
        },
        body: JSON.stringify({ version })
      });
      return parseApiResponse(response);
    }
  };
}

// src/config.ts
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
function getConfigPath() {
  return process.env.SLIDESFLY_CONFIG_PATH ?? join(homedir(), ".slidesfly", "config.json");
}
async function loadConfig() {
  const path = getConfigPath();
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      anon_decks: Array.isArray(parsed.anon_decks) ? parsed.anon_decks : []
    };
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      return { anon_decks: [] };
    }
    throw err;
  }
}
async function saveConfig(config) {
  const path = getConfigPath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}
`, { mode: 384 });
  await chmod(path, 384);
}
async function addAnonDeck(entry) {
  const config = await loadConfig();
  config.anon_decks.push(entry);
  await saveConfig(config);
}
async function removeAnonDeck(deckId) {
  const config = await loadConfig();
  const before = config.anon_decks.length;
  config.anon_decks = config.anon_decks.filter((d) => d.deck_id !== deckId);
  if (config.anon_decks.length === before) {
    return false;
  }
  await saveConfig(config);
  return true;
}
function findAnonDeck(config, deckId) {
  return config.anon_decks.find((d) => d.deck_id === deckId);
}
async function setApiKey(key) {
  const config = await loadConfig();
  config.api_key = key;
  await saveConfig(config);
}
async function clearApiKey() {
  const config = await loadConfig();
  await saveConfig({ anon_decks: config.anon_decks });
}

// src/output.ts
function shouldUseJson(options) {
  return Boolean(options.json) || !process.stdout.isTTY;
}
function writeLine(text) {
  process.stdout.write(`${text}
`);
}
function formatHumanOk(data, warnings) {
  const lines = [];
  if (typeof data.url === "string") {
    lines.push(data.url);
  }
  for (const warning of warnings ?? []) {
    lines.push(warning.message);
  }
  return lines;
}
function formatHumanError(error) {
  const lines = [`${error.code}: ${error.message}`];
  if (error.hint) {
    lines.push(`Hint: ${error.hint}`);
  }
  return lines;
}
function omitClaimTokenDeep(value) {
  if (Array.isArray(value)) {
    return value.map(omitClaimTokenDeep);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== "claim_token").map(([key, nested]) => [key, omitClaimTokenDeep(nested)])
  );
}
function printOk(data, opts) {
  const safeData = omitClaimTokenDeep(data);
  if (shouldUseJson(opts ?? {})) {
    const envelope = { ok: true, data: safeData };
    if (opts?.warnings?.length) {
      envelope.warnings = opts.warnings;
    }
    writeLine(JSON.stringify(envelope));
    return;
  }
  const humanData = typeof safeData === "object" && safeData !== null ? safeData : {};
  for (const line of formatHumanOk(humanData, opts?.warnings)) {
    writeLine(line);
  }
}
function printError(error, opts) {
  if (shouldUseJson(opts ?? {})) {
    writeLine(JSON.stringify({ ok: false, error }));
    return;
  }
  for (const line of formatHumanError(error)) {
    writeLine(line);
  }
}
function exitOk(data, opts) {
  printOk(data, opts);
  process.exit(0);
}
function exitError(error, opts) {
  printError(error, opts);
  process.exit(1);
}

// src/commands/allowlist.ts
var CLEAR_VALUES = /* @__PURE__ */ new Set(["off", "none", "clear", "remove"]);
function resolveAllowlist(values) {
  if (values.length === 1 && values[0] && CLEAR_VALUES.has(values[0].toLowerCase())) {
    return null;
  }
  return values;
}
async function runAllowlist(deckId, values, options, deps = {}) {
  const emails = resolveAllowlist(values);
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to set a deck email allowlist",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  const api = deps.api ?? createApiClient();
  try {
    const result = await api.setAllowlistOwned(deckId, emails, config.api_key);
    exitOk(result, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/claim-anon.ts
async function claimAnonDecksFromConfig(apiKey, deckId, deps = {}) {
  const config = await loadConfig();
  let items;
  if (deckId) {
    const deck = findAnonDeck(config, deckId);
    if (!deck) {
      throw new ClaimDeckNotFoundError(deckId);
    }
    items = [{ deck_id: deck.deck_id, claim_token: deck.claim_token }];
  } else {
    items = config.anon_decks.map((deck) => ({
      deck_id: deck.deck_id,
      claim_token: deck.claim_token
    }));
  }
  if (items.length === 0) {
    return { claimed: [], failed: [] };
  }
  const api = deps.api ?? createApiClient();
  const result = await api.claimBatch(items, apiKey);
  for (const id of result.claimed) {
    await removeAnonDeck(id);
  }
  return result;
}
var ClaimDeckNotFoundError = class extends Error {
  constructor(deckId) {
    super(`Deck \`${deckId}\` not found in local config`);
    this.deckId = deckId;
    this.name = "ClaimDeckNotFoundError";
  }
};

// src/commands/claim.ts
async function runClaim(deckId, options, deps = {}) {
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to claim decks",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  try {
    const result = await claimAnonDecksFromConfig(config.api_key, deckId, deps);
    exitOk({ claimed: result.claimed, failed: result.failed }, { json: options.json });
  } catch (err) {
    if (err instanceof ClaimDeckNotFoundError) {
      exitError(
        {
          code: "NOT_FOUND",
          message: err.message
        },
        { json: options.json }
      );
    }
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/delete.ts
async function runDelete(deckId, options, deps = {}) {
  const config = await loadConfig();
  const deck = findAnonDeck(config, deckId);
  const api = deps.api ?? createApiClient();
  if (deck) {
    try {
      await api.deleteAnon(deck.deck_id, deck.claim_token);
      await removeAnonDeck(deck.deck_id);
      exitOk({ deleted: true, deck_id: deckId }, { json: options.json });
    } catch (err) {
      if (err instanceof ApiError) {
        const claimedElsewhere = err.code === "DECK_NOT_OWNED" && Boolean(config.api_key);
        if (!claimedElsewhere) {
          exitError(
            {
              code: err.code,
              message: err.message,
              details: err.details,
              hint: err.hint
            },
            { json: options.json }
          );
        }
      } else {
        throw err;
      }
    }
  }
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to delete owned deck",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  try {
    await api.deleteOwned(deckId, config.api_key);
    await removeAnonDeck(deckId);
    exitOk({ deleted: true, deck_id: deckId }, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/expire.ts
var CLEAR_VALUES2 = /* @__PURE__ */ new Set(["off", "none", "clear", "never"]);
var DURATION_RE = /^(\d+)\s*(s|m|h|d|w)$/i;
var UNIT_MS = {
  s: 1e3,
  m: 60 * 1e3,
  h: 60 * 60 * 1e3,
  d: 24 * 60 * 60 * 1e3,
  w: 7 * 24 * 60 * 60 * 1e3
};
function resolveExpiry(value, now) {
  const trimmed = value.trim();
  if (CLEAR_VALUES2.has(trimmed.toLowerCase())) {
    return null;
  }
  const match = trimmed.match(DURATION_RE);
  if (match?.[1] && match[2]) {
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    const unitMs = UNIT_MS[unit];
    if (amount <= 0 || unitMs === void 0) return void 0;
    return new Date(now + amount * unitMs).toISOString();
  }
  const ts = new Date(trimmed);
  if (Number.isNaN(ts.getTime())) {
    return void 0;
  }
  if (ts.getTime() <= now) {
    return void 0;
  }
  return ts.toISOString();
}
async function runExpire(deckId, when, options, deps = {}) {
  const now = (deps.now ?? Date.now)();
  const expiresAt = resolveExpiry(when, now);
  if (expiresAt === void 0) {
    exitError(
      {
        code: "INVALID_ARGUMENT",
        message: `Invalid expiry \`${when}\`. Use a duration (7d, 24h, 30m), an ISO-8601 timestamp, or off.`
      },
      { json: options.json }
    );
  }
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to set deck expiry",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  const api = deps.api ?? createApiClient();
  try {
    const result = await api.setExpiryOwned(deckId, expiresAt, config.api_key);
    exitOk(result, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/skill/install.ts
import { chmod as chmod2, mkdir as mkdir2, readFile as readFile4, writeFile as writeFile2 } from "node:fs/promises";
import { dirname as dirname4 } from "node:path";

// src/skill/detect.ts
import { access } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
async function detectRuntimes(options = {}) {
  const home = options.home ?? homedir2();
  const scope = options.scope ?? "user";
  const detected = [];
  if (scope === "project") {
    const projectTargets = ["cursor"];
    if (await pathExists(join2(options.cwd ?? process.cwd(), ".agents"))) {
      projectTargets.push("codex");
    }
    return projectTargets;
  }
  if (await pathExists(join2(home, ".claude", "skills")) || await pathExists(join2(home, ".claude"))) {
    detected.push("claude-code");
  }
  if (await pathExists(join2(home, ".cursor", "rules")) || await pathExists(join2(home, ".cursor"))) {
    detected.push("cursor");
  }
  if (await pathExists(join2(home, ".codex", "skills")) || await pathExists(join2(home, ".codex"))) {
    detected.push("codex");
  }
  return detected;
}

// src/skill/hash.ts
function appendVersionStamp(content, version) {
  const stamp = `<!-- slidesfly-skill version: ${version} -->`;
  if (content.includes(stamp)) {
    return content;
  }
  return `${content.trimEnd()}

${stamp}
`;
}

// src/skill/load.ts
import { readFile as readFile2 } from "node:fs/promises";
import { dirname as dirname2, join as join3 } from "node:path";
import { fileURLToPath } from "node:url";
var moduleDir = dirname2(fileURLToPath(import.meta.url));
var DEFAULT_SKILL_URL = "https://slidesfly.com/SKILL.md";
function getBundledSkillPath(baseDir = moduleDir) {
  return join3(baseDir, "../../assets/SKILL.md");
}
function getLocalSkillPaths(baseDir = moduleDir) {
  return [
    // Standard Agent Skill: <skill>/scripts/slidesfly.mjs + <skill>/SKILL.md
    join3(baseDir, "../SKILL.md"),
    // Legacy Cursor rule: rules/slidesfly/scripts/slidesfly.mjs + rules/slidesfly.mdc
    join3(baseDir, "../../slidesfly.mdc"),
    // npm package: dist/skill/load.js + assets/SKILL.md
    getBundledSkillPath(baseDir)
  ];
}
async function fetchSkill(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch skill from ${url}: HTTP ${response.status}`);
  }
  return response.text();
}
async function loadCanonicalSkill(fromUrl) {
  if (fromUrl) {
    return fetchSkill(fromUrl);
  }
  for (const path of getLocalSkillPaths()) {
    try {
      return await readFile2(path, "utf8");
    } catch {
    }
  }
  return fetchSkill(DEFAULT_SKILL_URL);
}

// src/skill/paths.ts
import { homedir as homedir3 } from "node:os";
import { join as join4 } from "node:path";
function resolveHome(home) {
  return home ?? homedir3();
}
function resolveCwd(cwd) {
  return cwd ?? process.cwd();
}
function getSkillInstallTargets(options = {}) {
  const scope = options.scope ?? "user";
  const home = resolveHome(options.home);
  const cwd = resolveCwd(options.cwd);
  const targets = [];
  if (scope === "user") {
    targets.push({
      runtime: "claude-code",
      path: join4(home, ".claude", "skills", "slidesfly", "SKILL.md"),
      runnerPath: join4(home, ".claude", "skills", "slidesfly", "scripts", "slidesfly.mjs")
    });
    targets.push({
      runtime: "cursor",
      path: join4(home, ".cursor", "rules", "slidesfly.mdc"),
      runnerPath: join4(home, ".cursor", "rules", "slidesfly", "scripts", "slidesfly.mjs")
    });
    targets.push({
      runtime: "codex",
      path: join4(home, ".codex", "skills", "slidesfly", "SKILL.md"),
      runnerPath: join4(home, ".codex", "skills", "slidesfly", "scripts", "slidesfly.mjs")
    });
    return targets;
  }
  targets.push({
    runtime: "cursor",
    path: join4(cwd, ".cursor", "rules", "slidesfly.mdc"),
    runnerPath: join4(cwd, ".cursor", "rules", "slidesfly", "scripts", "slidesfly.mjs")
  });
  targets.push({
    runtime: "codex",
    path: join4(cwd, ".agents", "skills", "slidesfly", "SKILL.md"),
    runnerPath: join4(cwd, ".agents", "skills", "slidesfly", "scripts", "slidesfly.mjs")
  });
  return targets;
}
function filterTargetsByRuntime(targets, runtime) {
  if (runtime === "all") {
    return targets;
  }
  return targets.filter((target) => target.runtime === runtime);
}

// src/skill/runner.ts
import { readFile as readFile3 } from "node:fs/promises";
import { dirname as dirname3, join as join5, resolve } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
var moduleDir2 = dirname3(fileURLToPath2(import.meta.url));
function getBundledRunnerPath() {
  return join5(moduleDir2, "../../assets/scripts/slidesfly.mjs");
}
function looksLikeSlidesflyBundle(content) {
  return content.startsWith("#!/usr/bin/env node") && content.includes('.name("slidesfly")') && content.includes("Publish HTML decks to Slidesfly");
}
async function loadBundledRunner() {
  try {
    return await readFile3(getBundledRunnerPath(), "utf8");
  } catch {
    const executable = process.argv[1];
    if (executable) {
      try {
        const content = await readFile3(resolve(executable), "utf8");
        if (looksLikeSlidesflyBundle(content)) {
          return content;
        }
      } catch {
      }
    }
  }
  throw new Error(
    "Bundled Slidesfly runner is missing. Reinstall the official CLI or use --skill-only."
  );
}

// src/skill/transform.ts
var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
function parseSkillMarkdown(content) {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  const frontmatterBlock = match[1] ?? "";
  const body = match[2] ?? content;
  const frontmatter = {};
  for (const line of frontmatterBlock.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf(":");
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (value.startsWith("|")) {
      continue;
    }
    if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    frontmatter[key] = value;
  }
  return {
    frontmatter,
    body
  };
}
function extractBlockScalar(content, key) {
  const lines = content.split("\n");
  const keyPrefix = `${key}:`;
  const startIndex = lines.findIndex((line) => line.trimStart().startsWith(keyPrefix));
  if (startIndex === -1) {
    return void 0;
  }
  const firstLine = lines[startIndex];
  if (!firstLine) {
    return void 0;
  }
  const inlineValue = firstLine.slice(firstLine.indexOf(":") + 1).trim();
  if (inlineValue && !inlineValue.startsWith("|") && !inlineValue.startsWith(">")) {
    return inlineValue.replace(/^['"]|['"]$/g, "");
  }
  const blockLines = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line === void 0) {
      break;
    }
    if (line.length > 0 && !/^\s/.test(line)) {
      break;
    }
    blockLines.push(line.replace(/^\s{2}/, ""));
  }
  return blockLines.join("\n").trimEnd();
}
function getSkillDescription(content) {
  const block = extractBlockScalar(content, "description");
  if (block) {
    return block;
  }
  return parseSkillMarkdown(content).frontmatter.description ?? "";
}
function yamlQuote(value) {
  if (value.includes("\n")) {
    const indented = value.split("\n").map((line) => `  ${line}`).join("\n");
    return `|
${indented}`;
  }
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function transformSkillForRuntime(content, runtime) {
  const description = getSkillDescription(content);
  const { body } = parseSkillMarkdown(content);
  if (runtime === "claude-code") {
    const version = parseSkillMarkdown(content).frontmatter.version ?? "0.1.0";
    const license = parseSkillMarkdown(content).frontmatter.license ?? "MIT";
    return [
      "---",
      "name: slidesfly",
      `description: ${yamlQuote(description)}`,
      `version: ${version}`,
      `license: ${license}`,
      "---",
      body.trimStart()
    ].join("\n");
  }
  if (runtime === "codex") {
    return [
      "---",
      "name: slidesfly",
      `description: ${yamlQuote(description)}`,
      "---",
      body.trimStart()
    ].join("\n");
  }
  return [
    "---",
    `description: ${yamlQuote(description)}`,
    "alwaysApply: false",
    "globs: ['**/*.html', '**/*.htm']",
    "---",
    body.trimStart()
  ].join("\n");
}

// src/skill/install.ts
async function resolveInstallTargets(options) {
  const scope = options.scope ?? "user";
  let targets = getSkillInstallTargets({
    scope,
    home: options.home,
    cwd: options.cwd
  });
  const target = options.target ?? "auto";
  if (target === "auto") {
    const detected = await detectRuntimes({
      home: options.home,
      cwd: options.cwd,
      scope
    });
    if (detected.length > 0) {
      targets = targets.filter((entry) => detected.includes(entry.runtime));
    }
  } else if (target !== "all") {
    targets = filterTargetsByRuntime(targets, target);
  }
  return targets;
}
async function assertOverwriteAllowed(path, content, options) {
  try {
    const existing = await readFile4(path, "utf8");
    if (existing !== content && !options.force) {
      exitError(
        {
          code: "SKILL_EXISTS",
          message: `Skill file or bundled asset already exists and was modified: ${path}`,
          hint: "Re-run with --force to overwrite"
        },
        { json: options.json }
      );
    }
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      throw err;
    }
  }
}
async function writeSkillTarget(target, canonicalContent, runnerContent, options) {
  const transformed = transformSkillForRuntime(canonicalContent, target.runtime);
  const version = parseSkillMarkdown(canonicalContent).frontmatter.version ?? "0.1.0";
  const content = appendVersionStamp(transformed, version);
  await assertOverwriteAllowed(target.path, content, options);
  if (runnerContent !== void 0) {
    await assertOverwriteAllowed(target.runnerPath, runnerContent, options);
  }
  await mkdir2(dirname4(target.path), { recursive: true });
  await writeFile2(target.path, content, "utf8");
  if (runnerContent === void 0) {
    return { skill: target.path };
  }
  await mkdir2(dirname4(target.runnerPath), { recursive: true });
  await writeFile2(target.runnerPath, runnerContent, { encoding: "utf8", mode: 493 });
  await chmod2(target.runnerPath, 493);
  return { skill: target.path, asset: target.runnerPath };
}
async function installSkill(options = {}) {
  const canonicalContent = await loadCanonicalSkill(options.fromUrl);
  const runnerContent = options.skillOnly ? void 0 : await loadBundledRunner();
  const targets = await resolveInstallTargets(options);
  if (targets.length === 0) {
    exitError(
      {
        code: "NO_TARGETS",
        message: "No install targets matched the requested runtime and scope",
        hint: "Try --target all or create a Claude Code, Cursor, or Codex config directory first"
      },
      { json: options.json }
    );
  }
  const installed = [];
  const assets = [];
  for (const target of targets) {
    const result = await writeSkillTarget(target, canonicalContent, runnerContent, options);
    installed.push(result.skill);
    if (result.asset) {
      assets.push(result.asset);
    }
  }
  return { installed, assets };
}
async function runInstallSkill(options = {}) {
  const result = await installSkill(options);
  exitOk(result, { json: options.json });
}

// src/commands/install.ts
async function runInstall(options) {
  return runInstallSkill(options);
}

// src/commands/list.ts
async function runList(options) {
  const config = await loadConfig();
  if (options.json || !process.stdout.isTTY) {
    exitOk({ decks: config.anon_decks }, { json: options.json });
  }
  if (config.anon_decks.length === 0) {
    exitOk({ decks: [] }, { json: false });
  }
  const idWidth = Math.max(2, ...config.anon_decks.map((d) => d.deck_id.length));
  const titleWidth = Math.max(5, ...config.anon_decks.map((d) => d.title.length));
  const header = `${"ID".padEnd(idWidth)}  ${"TITLE".padEnd(titleWidth)}  URL`;
  const rows = config.anon_decks.map(
    (deck) => `${deck.deck_id.padEnd(idWidth)}  ${deck.title.padEnd(titleWidth)}  ${deck.url}`
  );
  process.stdout.write(`${[header, ...rows].join("\n")}
`);
  process.exit(0);
}

// src/auth/login-device.ts
import { randomBytes as randomBytes2 } from "node:crypto";
import { createInterface } from "node:readline";

// src/auth/pkce.ts
import { createHash as createHash2, randomBytes } from "node:crypto";
function generateCodeVerifier() {
  return randomBytes(32).toString("base64url");
}
function codeChallengeS256(verifier) {
  return createHash2("sha256").update(verifier).digest("base64url");
}

// src/auth/login-device.ts
function getDefaultBaseUrl2() {
  return process.env.SLIDESFLY_API_URL ?? "https://slidesfly.com";
}
function printVerificationUrl(baseUrl, state) {
  const normalized = baseUrl.replace(/\/$/, "");
  const url = `${normalized}/cli/code?state=${encodeURIComponent(state)}`;
  process.stdout.write(`Open this URL in a browser to authorize:
${url}
`);
}
async function promptUserCode(options = {}) {
  if (options.promptCode) {
    const raw = await options.promptCode();
    return normalizeUserCode(raw);
  }
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  try {
    const raw = await new Promise((resolve2) => {
      rl.question("Enter code: ", resolve2);
    });
    return normalizeUserCode(raw);
  } finally {
    rl.close();
  }
}
function normalizeUserCode(raw) {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}
async function runDeviceLogin(options = {}) {
  const baseUrl = (options.baseUrl ?? getDefaultBaseUrl2()).replace(/\/$/, "");
  const verifier = generateCodeVerifier();
  const challenge = codeChallengeS256(verifier);
  const state = randomBytes2(16).toString("base64url");
  const register = options.registerDeviceAuth ?? (async (params) => {
    const client = createApiClient({ baseUrl });
    return client.registerDeviceAuth(params.state, params.challenge, params.challengeMethod);
  });
  await register({ state, challenge, challengeMethod: "S256" });
  printVerificationUrl(baseUrl, state);
  const userCode = await promptUserCode({ promptCode: options.promptCode });
  const exchange = options.exchangeDeviceCode ?? (async (code, authState, codeVerifier) => {
    const client = createApiClient({ baseUrl });
    return client.exchangeDeviceCode(code, authState, codeVerifier);
  });
  return exchange(userCode, state, verifier);
}

// src/auth/login-pkce.ts
import { randomBytes as randomBytes3 } from "node:crypto";

// src/auth/loopback.ts
import { createServer } from "node:http";
import { URL } from "node:url";
var DEFAULT_TIMEOUT_MS = 5 * 60 * 1e3;
async function beginLoopback(options) {
  const { expectedState, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  return new Promise((resolve2, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Failed to bind loopback server"));
        return;
      }
      const redirectUri = `http://127.0.0.1:${address.port}/callback`;
      resolve2({
        redirectUri,
        waitForCallback: () => waitForCallbackOnServer(server, redirectUri, expectedState, timeoutMs),
        close: () => new Promise((closeResolve, closeReject) => {
          server.close((err) => err ? closeReject(err) : closeResolve());
        })
      });
    });
  });
}
function waitForCallbackOnServer(server, redirectUri, expectedState, timeoutMs) {
  return new Promise((resolve2, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      server.close();
      reject(new Error("Callback timeout"));
    }, timeoutMs);
    const fail = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close();
      reject(err);
    };
    const succeed = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      server.close(() => resolve2(result));
    };
    server.on("request", (req, res) => {
      if (settled) {
        res.writeHead(410);
        res.end("Gone");
        return;
      }
      if (!req.url) {
        res.writeHead(400);
        res.end("Bad request");
        return;
      }
      const url = new URL(req.url, redirectUri);
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        res.writeHead(400);
        res.end("Missing code or state");
        return;
      }
      if (state !== expectedState) {
        res.writeHead(400);
        res.end("State mismatch");
        req.socket?.destroy();
        fail(new Error("State mismatch"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!DOCTYPE html><html><body><p>Login successful. You can close this window.</p></body></html>"
      );
      req.socket?.destroy();
      succeed({ code, state, redirectUri });
    });
  });
}

// src/auth/login-pkce.ts
function getDefaultBaseUrl3() {
  return process.env.SLIDESFLY_API_URL ?? "https://slidesfly.com";
}
async function defaultOpenBrowser(url) {
  const { spawn } = await import("node:child_process");
  const platform = process.platform;
  let command;
  let args;
  if (platform === "darwin") {
    command = "open";
    args = [url];
  } else if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  await new Promise((resolve2, reject) => {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve2();
        return;
      }
      reject(new Error(`Failed to open browser (exit ${code ?? "unknown"})`));
    });
  });
}
async function runPkceLogin(options = {}) {
  const baseUrl = (options.baseUrl ?? getDefaultBaseUrl3()).replace(/\/$/, "");
  const openBrowser = options.openBrowser ?? defaultOpenBrowser;
  const beginLoopbackFn = options.beginLoopback ?? beginLoopback;
  const verifier = generateCodeVerifier();
  const challenge = codeChallengeS256(verifier);
  const state = randomBytes3(16).toString("base64url");
  const session = await beginLoopbackFn({ expectedState: state });
  try {
    const params = new URLSearchParams({
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      redirect_uri: session.redirectUri
    });
    const authUrl = `${baseUrl}/cli/auth?${params.toString()}`;
    await openBrowser(authUrl);
    const { code } = await session.waitForCallback();
    const exchange = options.exchangeCliAuth ?? (async (authCode, codeVerifier) => {
      const client = createApiClient({ baseUrl });
      return client.exchangeCliAuth(authCode, codeVerifier);
    });
    return await exchange(code, verifier);
  } finally {
    await session.close().catch(() => void 0);
  }
}

// src/commands/login.ts
async function runLogin(options, deps = {}) {
  if (options.apiKey) {
    await setApiKey(options.apiKey);
    exitOk({ logged_in: true }, { json: options.json });
  }
  const loginFn = options.code ? deps.runDeviceLogin ?? runDeviceLogin : deps.runPkceLogin ?? runPkceLogin;
  const claimAnonDecks = deps.claimAnonDecks ?? claimAnonDecksFromConfig;
  try {
    const { apiKey, prefix } = await loginFn();
    await setApiKey(apiKey);
    let claimResult = {
      claimed: [],
      failed: []
    };
    if (!options.noClaim) {
      claimResult = await claimAnonDecks(apiKey);
    }
    exitOk(
      {
        logged_in: true,
        prefix,
        claimed: claimResult.claimed,
        failed: claimResult.failed
      },
      { json: options.json }
    );
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    if (err instanceof Error && /timeout/i.test(err.message)) {
      exitError(
        {
          code: "LOGIN_TIMEOUT",
          message: "Browser login timed out waiting for authorization",
          hint: "Try again, or use `slidesfly login --api-key YOUR_KEY`"
        },
        { json: options.json }
      );
    }
    if (err instanceof Error && /state mismatch/i.test(err.message)) {
      exitError(
        {
          code: "LOGIN_FAILED",
          message: "Browser login failed due to invalid callback state",
          hint: "Try `slidesfly login` again"
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/logout.ts
async function runLogout(options) {
  await clearApiKey();
  exitOk({ logged_out: true }, { json: options.json });
}

// src/commands/open.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
async function defaultOpenUrl(url) {
  switch (process.platform) {
    case "darwin":
      await execFileAsync("open", [url]);
      return;
    case "win32":
      await execFileAsync("cmd", ["/c", "start", "", url]);
      return;
    default:
      await execFileAsync("xdg-open", [url]);
  }
}
async function runOpen(deckId, options, deps = {}) {
  const config = await loadConfig();
  const deck = findAnonDeck(config, deckId);
  if (!deck) {
    exitError(
      {
        code: "NOT_FOUND",
        message: `Deck \`${deckId}\` not found in local config`
      },
      { json: options.json }
    );
  }
  const openUrl = deps.openUrl ?? defaultOpenUrl;
  try {
    await openUrl(deck.url);
  } catch (err) {
    exitError(
      {
        code: "OPEN_FAILED",
        message: err instanceof Error ? err.message : "Failed to open URL in browser"
      },
      { json: options.json }
    );
  }
  exitOk({ url: deck.url, deck_id: deckId }, { json: options.json });
}

// src/commands/password.ts
var CLEAR_VALUES3 = /* @__PURE__ */ new Set(["off", "none", "clear", "remove"]);
function resolvePassword(value) {
  if (CLEAR_VALUES3.has(value.toLowerCase())) {
    return null;
  }
  return value;
}
async function runPassword(deckId, value, options, deps = {}) {
  const password = resolvePassword(value);
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to set a deck password",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  const api = deps.api ?? createApiClient();
  try {
    const result = await api.setPasswordOwned(deckId, password, config.api_key);
    exitOk(result, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/publish.ts
import { access as access2, readFile as readFile5 } from "node:fs/promises";
import { basename, extname } from "node:path";
var HTML_EXTENSIONS = /* @__PURE__ */ new Set([".html", ".htm"]);
async function assertPublishFile(filePath, owned, json) {
  const ext = extname(filePath).toLowerCase();
  const isHtml = HTML_EXTENSIONS.has(ext);
  const isZip = ext === ".zip";
  if (!isHtml && !isZip) {
    exitError(
      {
        code: "INVALID_FILE",
        message: "Publish requires an .html, .htm, or .zip file"
      },
      { json }
    );
  }
  if (isZip && !owned) {
    exitError(
      {
        code: "INVALID_FILE",
        message: "Multi-file (.zip) publish requires login (Pro plan)",
        hint: "Run `slidesfly login` first, then publish the zip."
      },
      { json }
    );
  }
  try {
    await access2(filePath);
  } catch {
    exitError(
      {
        code: "FILE_NOT_FOUND",
        message: `File not found: ${filePath}`
      },
      { json }
    );
  }
}
async function runPublish(filePath, options, deps = {}) {
  const config = await loadConfig();
  await assertPublishFile(filePath, Boolean(config.api_key), options.json);
  const fileBuffer = await readFile5(filePath);
  const filename = basename(filePath);
  const api = deps.api ?? createApiClient();
  try {
    if (options.deckId) {
      const anonymousDeck = findAnonDeck(config, options.deckId);
      if (anonymousDeck) {
        if (options.title) {
          exitError(
            {
              code: "INVALID_ARGUMENT",
              message: "`--title` is not supported when updating a local anonymous deck",
              hint: "Claim the deck with `slidesfly login`, then retry the owned update"
            },
            { json: options.json }
          );
        }
        try {
          const result2 = await api.updateAnon(
            anonymousDeck.deck_id,
            anonymousDeck.claim_token,
            fileBuffer,
            filename
          );
          exitOk(result2, { json: options.json });
        } catch (err) {
          if (err instanceof ApiError) {
            const claimedElsewhere = err.code === "DECK_NOT_OWNED" && Boolean(config.api_key);
            if (!claimedElsewhere) {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
      if (!config.api_key) {
        exitError(
          {
            code: "AUTH_REQUIRED",
            message: "No local anonymous claim or API key found for this deck",
            hint: "Publish from the original machine, or run `slidesfly login` to update an owned deck"
          },
          { json: options.json }
        );
      }
      const result = await api.updateOwned(
        options.deckId,
        fileBuffer,
        filename,
        config.api_key,
        options.title
      );
      await removeAnonDeck(options.deckId);
      exitOk(result, { json: options.json });
    } else if (config.api_key) {
      const result = await api.publishOwned(
        {
          fileBuffer,
          filename,
          title: options.title,
          visibility: options.visibility
        },
        config.api_key
      );
      const { warnings, ...data } = result;
      exitOk(data, { json: options.json, warnings });
    } else {
      const result = await api.publishAnonymous({
        filePath,
        fileBuffer,
        filename,
        title: options.title
      });
      await addAnonDeck({
        deck_id: result.deck_id,
        claim_token: result.claim_token,
        title: result.title,
        url: result.url,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      const { warnings, claim_token: _claimToken, ...data } = result;
      exitOk(data, { json: options.json, warnings });
    }
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/restore.ts
async function runRestore(deckId, options, deps = {}) {
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to restore a deck version",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  if (!Number.isInteger(options.version) || options.version < 1) {
    exitError(
      {
        code: "INVALID_FILE",
        message: "Version must be a positive integer",
        hint: "Run `slidesfly versions <deck_id>` to list versions"
      },
      { json: options.json }
    );
  }
  const api = deps.api ?? createApiClient();
  try {
    const result = await api.restoreOwned(deckId, options.version, config.api_key);
    exitOk(result, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        { code: err.code, message: err.message, details: err.details, hint: err.hint },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/skill/installed.ts
import { access as access3, readFile as readFile6 } from "node:fs/promises";
async function getSkillInstallStatus(options) {
  const targets = getSkillInstallTargets(options);
  const installed = [];
  for (const target of targets) {
    try {
      await access3(target.path);
      const content = await readFile6(target.path, "utf8");
      const { frontmatter } = parseSkillMarkdown(content);
      installed.push({
        runtime: target.runtime,
        path: target.path,
        version: frontmatter.version
      });
    } catch {
    }
  }
  const canonical = parseSkillMarkdown(await loadCanonicalSkill());
  return {
    installed,
    latest_version: canonical.frontmatter.version ?? "0.0.0"
  };
}

// src/commands/status.ts
function formatApiKeyPrefix(apiKey) {
  const match = apiKey.match(/^(sk_(?:live|test)_)/);
  const prefix = match?.[1] ?? apiKey.slice(0, 8);
  return `${prefix}...${apiKey.slice(-4)}`;
}
async function runStatus(options) {
  const [config, skillStatus] = await Promise.all([loadConfig(), getSkillInstallStatus()]);
  const data = {
    config_path: getConfigPath(),
    has_api_key: Boolean(config.api_key),
    anon_count: config.anon_decks.length,
    skill_latest_version: skillStatus.latest_version,
    skill_installed: skillStatus.installed
  };
  if (config.api_key) {
    data.api_key_prefix = formatApiKeyPrefix(config.api_key);
  }
  if (options.json || !process.stdout.isTTY) {
    exitOk(data, { json: options.json });
  }
  const skillLine = data.skill_installed.length === 0 ? `Skill: not installed (latest ${data.skill_latest_version})` : `Skill: ${data.skill_installed.map((s) => `${s.runtime}@${s.version ?? "?"}`).join(", ")} (latest ${data.skill_latest_version})`;
  const lines = [
    `Config: ${data.config_path}`,
    data.has_api_key ? `API key: ${data.api_key_prefix}` : "API key: not set",
    `${data.anon_count} anonymous deck${data.anon_count === 1 ? "" : "s"}`,
    skillLine
  ];
  process.stdout.write(`${lines.join("\n")}
`);
  process.exit(0);
}

// src/skill/uninstall.ts
import { access as access4, rm, rmdir, stat } from "node:fs/promises";
import { dirname as dirname5 } from "node:path";
async function pathExists2(path) {
  try {
    await access4(path);
    return true;
  } catch {
    return false;
  }
}
async function removeFile(path) {
  if (!await pathExists2(path)) {
    return false;
  }
  await rm(path, { force: true });
  return true;
}
async function removeEmptyDir(path) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      return;
    }
  } catch {
    return;
  }
  try {
    await rmdir(path);
  } catch {
  }
}
async function uninstallSkill(options = {}) {
  const removed = [];
  const scopes = options.scope === void 0 ? ["user", "project"] : [options.scope];
  for (const scope of scopes) {
    const targets = getSkillInstallTargets({
      scope,
      home: options.home,
      cwd: options.cwd
    });
    for (const target of targets) {
      if (await removeFile(target.runnerPath)) {
        removed.push(target.runnerPath);
      }
      if (await removeFile(target.path)) {
        removed.push(target.path);
      }
      await removeEmptyDir(dirname5(target.runnerPath));
      await removeEmptyDir(dirname5(dirname5(target.runnerPath)));
      await removeEmptyDir(dirname5(target.path));
    }
  }
  return { removed };
}
async function runUninstallSkill(options = {}) {
  const result = await uninstallSkill(options);
  exitOk(result, { json: options.json });
}

// src/commands/uninstall.ts
async function runUninstall(options) {
  return runUninstallSkill(options);
}

// src/commands/versions.ts
async function runVersions(deckId, options, deps = {}) {
  const config = await loadConfig();
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to list deck versions",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  const api = deps.api ?? createApiClient();
  try {
    const result = await api.listVersions(deckId, config.api_key);
    if (options.json || !process.stdout.isTTY) {
      exitOk(result, { json: options.json });
    }
    if (result.versions.length === 0) {
      exitOk(result, { json: false });
    }
    const header = "VERSION  CURRENT  CREATED                 SIZE";
    const rows = result.versions.map((v) => {
      const current = v.is_current ? "yes" : "";
      const created = v.created_at.replace("T", " ").replace(/\.\d+Z$/, "Z");
      return `${String(v.version).padEnd(8)} ${current.padEnd(8)} ${created.padEnd(22)} ${v.size_bytes}`;
    });
    process.stdout.write(`${[header, ...rows].join("\n")}
`);
    process.exit(0);
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        { code: err.code, message: err.message, details: err.details, hint: err.hint },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/commands/visibility.ts
var VALID_VISIBILITY = /* @__PURE__ */ new Set(["public", "unlisted", "private"]);
async function runVisibility(deckId, visibility, options, deps = {}) {
  if (!VALID_VISIBILITY.has(visibility)) {
    exitError(
      {
        code: "INVALID_ARGUMENT",
        message: `Invalid visibility \`${visibility}\`. Expected public, unlisted, or private.`
      },
      { json: options.json }
    );
  }
  const config = await loadConfig();
  const deck = findAnonDeck(config, deckId);
  const api = deps.api ?? createApiClient();
  if (deck) {
    try {
      await api.visibilityAnon(deck.deck_id, visibility);
      exitError(
        {
          code: "UNEXPECTED",
          message: "Visibility change should not succeed for anonymous decks"
        },
        { json: options.json }
      );
    } catch (err) {
      if (err instanceof ApiError) {
        const claimedElsewhere = err.code === "DECK_NOT_OWNED" && Boolean(config.api_key);
        if (!claimedElsewhere) {
          exitError(
            {
              code: err.code,
              message: err.message,
              details: err.details,
              hint: err.hint
            },
            { json: options.json }
          );
        }
      } else {
        throw err;
      }
    }
  }
  if (!config.api_key) {
    exitError(
      {
        code: "AUTH_REQUIRED",
        message: "API key required to change owned deck visibility",
        hint: "Run `slidesfly login` or `slidesfly login --api-key YOUR_KEY`"
      },
      { json: options.json }
    );
  }
  try {
    const result = await api.setVisibilityOwned(deckId, visibility, config.api_key);
    await removeAnonDeck(deckId);
    exitOk(result, { json: options.json });
  } catch (err) {
    if (err instanceof ApiError) {
      exitError(
        {
          code: err.code,
          message: err.message,
          details: err.details,
          hint: err.hint
        },
        { json: options.json }
      );
    }
    throw err;
  }
}

// src/index.ts
function readVersion() {
  if (true) {
    return "0.1.3";
  }
  try {
    const pkgPath = join6(dirname6(fileURLToPath3(import.meta.url)), "../package.json");
    return JSON.parse(readFileSync(pkgPath, "utf8")).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}
var program2 = new Command();
program2.name("slidesfly").description("Publish HTML decks to Slidesfly").version(readVersion()).option("--api-key <key>", "API key override").hook("preAction", async (thisCommand) => {
  const opts = thisCommand.opts();
  if (opts.apiKey) {
    await setApiKey(opts.apiKey);
  }
});
program2.command("install").description("Install Slidesfly agent skill for Claude Code, Cursor, and Codex").option("--target <target>", "auto, claude-code, cursor, codex, or all", "auto").option("--scope <scope>", "user or project", "user").option("--force", "Overwrite modified skill files").option("--skill-only", "Install skill files only").option("--from-url <url>", "Fetch canonical SKILL.md from URL").option("--json", "Output JSON").action(
  async (options) => {
    await runInstall({
      target: options.target,
      scope: options.scope,
      force: options.force,
      skillOnly: options.skillOnly,
      fromUrl: options.fromUrl,
      json: options.json
    });
  }
);
program2.command("publish").description("Publish an HTML deck anonymously").argument("<file>", "Path to .html file").option("--title <title>", "Deck title").option("--id <deckId>", "Update an existing local anonymous or owned deck").option("--visibility <v>", "public, unlisted, or private (owned publish only)").option("--json", "Output JSON").action(
  async (file, options) => {
    await runPublish(file, {
      title: options.title,
      deckId: options.id,
      visibility: options.visibility,
      json: options.json
    });
  }
);
program2.command("list").description("List anonymous decks from local config").option("--json", "Output JSON").action(async (options) => {
  await runList(options);
});
program2.command("open").description("Open a deck URL in the default browser").argument("<deck_id>", "Deck ID").option("--json", "Output JSON").action(async (deckId, options) => {
  await runOpen(deckId, options);
});
program2.command("delete").description("Delete an anonymous deck").argument("<deck_id>", "Deck ID").option("--json", "Output JSON").action(async (deckId, options) => {
  await runDelete(deckId, options);
});
program2.command("visibility").description("Change deck visibility (anonymous decks are limited)").argument("<deck_id>", "Deck ID").argument("<visibility>", "public, unlisted, or private").option("--json", "Output JSON").action(async (deckId, visibility, options) => {
  await runVisibility(deckId, visibility, options);
});
program2.command("versions").description("List versions of an owned deck").argument("<deck_id>", "Deck ID").option("--json", "Output JSON").action(async (deckId, options) => {
  await runVersions(deckId, options);
});
program2.command("restore").description("Restore an owned deck to a previous version (creates a new version)").argument("<deck_id>", "Deck ID").argument("<version>", "Version number to restore", (v) => Number(v)).option("--json", "Output JSON").action(async (deckId, version, options) => {
  await runRestore(deckId, { version, json: options.json });
});
program2.command("expire").description("Set or clear deck link expiry (Pro plan)").argument("<deck_id>", "Deck ID").argument("<when>", "Duration (7d, 24h, 30m), ISO-8601 timestamp, or off").option("--json", "Output JSON").action(async (deckId, when, options) => {
  await runExpire(deckId, when, options);
});
program2.command("password").description("Set or clear a deck password (Pro plan)").argument("<deck_id>", "Deck ID").argument("<password>", "Password to set, or off to remove protection").option("--json", "Output JSON").action(async (deckId, password, options) => {
  await runPassword(deckId, password, options);
});
program2.command("allowlist").description("Set or clear a deck email allowlist (Pro plan)").argument("<deck_id>", "Deck ID").argument("<emails...>", "Emails to allow, or off to remove the allowlist").option("--json", "Output JSON").action(async (deckId, emails, options) => {
  await runAllowlist(deckId, emails, options);
});
program2.command("login").description("Log in via browser PKCE flow (or store an API key)").option("--api-key <key>", "Store API key in local config (fallback)").option("--code", "Use device code flow (headless / SSH)").option("--no-claim", "Skip auto-claiming anonymous decks after login").option("--json", "Output JSON").action(
  async (options) => {
    await runLogin({
      apiKey: options.apiKey,
      code: options.code,
      noClaim: options.noClaim,
      json: options.json
    });
  }
);
program2.command("claim").description("Claim anonymous decks to your account").argument("[deck_id]", "Optional deck ID to claim from local config").option("--json", "Output JSON").action(async (deckId, options) => {
  await runClaim(deckId, options);
});
program2.command("logout").description("Clear stored API key").option("--json", "Output JSON").action(async (options) => {
  await runLogout(options);
});
program2.command("status").description("Show CLI config status").option("--json", "Output JSON").action(async (options) => {
  await runStatus(options);
});
program2.command("uninstall").description("Remove installed Slidesfly agent skill files").option("--scope <scope>", "user, project, or omit for both").option("--json", "Output JSON").action(async (options) => {
  await runUninstall({
    scope: options.scope,
    json: options.json
  });
});
program2.parse();
