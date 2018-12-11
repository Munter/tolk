'use strict';

const Path = require('path');
const util = require('util');
const readFile = util.promisify(require('fs').readFile);

const accord = require('accord');
const inlineSourceMapComment = require('inline-source-map-comment');

const autoprefixer = require('autoprefixer');
const postcss = require('postcss');

const extensionMap = {};
const loadedAdapters = [];

// Whitelisted adapters
const adapters = [
  'LiveScript',
  'babel',
  'coco',
  'coffee-script',
  'dogescript',
  'less',
  'markdown',
  'myth',
  'scss',
  'stylus',
  'swig'
];

Object.keys(accord.all())
  .map(function(engine) {
    if (adapters.indexOf(engine) === -1) {
      return undefined;
    }

    try {
      return accord.load(engine);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        console.error(
          `${e.message.replace(
            /^error: ?/i,
            'Accord Error: '
          )}. Try updating to the latest version`
        );
      }
      // else {
      //   console.error('Missing adapter:', engine);
      // }
    }
  })
  .filter(function(engine) {
    return engine;
  })
  .forEach(function(adapter) {
    loadedAdapters.push(adapter);
    const extensions = adapter.extensions.map(function(extension) {
      return `.${extension}`;
    });

    extensions.forEach(function(extension) {
      if (!Array.isArray(extensionMap[extension])) {
        extensionMap[extension] = [];
      }

      extensionMap[extension].push(adapter);
    });
  });

function inlineSourceMap(isCss, compiled) {
  let result = compiled.result;
  if (compiled.sourcemap) {
    const comment = inlineSourceMapComment(compiled.sourcemap, {
      block: isCss
    });

    result += `\n${comment}\n`;
  }

  return result;
}

module.exports = {
  extensions: extensionMap,
  adapters: loadedAdapters,

  /**
   * Read a source file, transpile it with any available transpiler engine and add source maps
   *
   * @param {string} pathName Path to source file
   * @param {object[]} options
   * @param {boolean} [options.sourceMap=true] Add inlined sourcemap comment to output
   * @param {(string|string[])} [options.browsers=['last 2 versions']] Add inlined sourcemap comment to output
   *
   * @returns {String} Source file transpiled with any matching transpiling engine
   */
  read: async function(
    pathName,
    { sourceMap = true, browsers = ['last 2 versions'] } = {}
  ) {
    if (typeof browsers === 'string') {
      browsers = [browsers];
    }

    const adapters = extensionMap[Path.extname(pathName)];
    const adapter = adapters && adapters[0];
    let isCss = Path.extname(pathName) === '.css';

    let result;

    if (adapter) {
      isCss = adapter.output === 'css';

      const transpilerOptions = {
        sourcemap: sourceMap
      };

      if (adapter.engineName === 'node-sass') {
        transpilerOptions.includePaths = [Path.dirname(pathName)];
      }

      result = inlineSourceMap(
        isCss,
        await adapter.renderFile(pathName, transpilerOptions)
      );
    } else {
      result = await readFile(pathName, 'utf8');
    }

    if (isCss) {
      const css = await postcss([autoprefixer({ browsers })])
        .process(result, { from: pathName, map: sourceMap })
        .then(result => {
          result.warnings().forEach(function(warn) {
            console.warn(warn.toString());
          });

          return result.css;
        });

      result = css;
    }

    return result;
  }
};
