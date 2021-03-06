'use strict';

// work around as requiring babel at runtime caused a timeout on travis.
require('babel-core').transform('const foo="bar"', { presets: ['es2015'] });

const Path = require('path');
const expect = require('unexpected').clone();
const tolk = require('../lib/tolk');

function getPath(path) {
  return Path.join(process.cwd(), 'fixtures/source', path);
}

const autoprefixOptions = {
  browsers: ['last 2 versions', 'Chrome 29']
};

describe('readCompiled', function() {
  it('should read a file directly if there is no adapter', function() {
    return expect(
      tolk.read(getPath('unchanged.txt')),
      'to be fulfilled with',
      'I am the same\n'
    );
  });

  it('should throw when reading a file that does not exist', function() {
    return expect(
      tolk.read(getPath('does-not-exist.txt')),
      'when rejected',
      'to satisfy',
      {
        code: 'ENOENT',
        path: /fixtures\/source\/does-not-exist\.txt$/,
        message: /^ENOENT.*?, open '.+?fixtures\/source\/does-not-exist\.txt'$/
      }
    );
  });

  it('should compile a file if there is an adapter', function() {
    return expect(
      tolk.read(getPath('babel/simplest.jsx')),
      'to be fulfilled with',
      expect.it(
        'to begin with',
        "'use strict';\n\nvar foo = 'bar';\n//# sourceMappingURL=data:application/json;base64,"
      )
    );
  });

  it('should throw when compiling a file that does not exist', function() {
    return expect(
      tolk.read(getPath('does-not-exist.scss')),
      'when rejected',
      'to satisfy',
      {
        code: 'ENOENT',
        path: /fixtures\/source\/does-not-exist\.scss$/,
        message: /^ENOENT.*?, open '.+?fixtures\/source\/does-not-exist\.scss'$/
      }
    );
  });

  it('should throw when compiling a file with syntax errors', function() {
    return expect(
      tolk.read(getPath('scss/syntaxerror.scss')),
      'when rejected',
      'to exhaustively satisfy',
      {
        status: 1,
        file: /fixtures\/source\/scss\/syntaxerror\.scss$/,
        line: 2,
        column: 3,
        message: 'property "color" must be followed by a \':\'',
        formatted:
          'Error: property "color" must be followed by a \':\'\n        on line 2 of fixtures/source/scss/syntaxerror.scss\n>>   color hotpink\n\n   --^\n'
      }
    );
  });

  it('should autoprefix uncompiled CSS output', function() {
    return expect(
      tolk.read(getPath('basic.css'), autoprefixOptions),
      'to be fulfilled with',
      expect
        .it(
          'to begin with',
          'body {\n  -webkit-transform: rotate(-1deg);\n          transform: rotate(-1deg);\n}'
        )
        .and(
          'to contain',
          '\n\n/*# sourceMappingURL=data:application/json;base64,'
        )
    );
  });

  it('should autoprefix compiled CSS output', function() {
    return expect(
      tolk.read(getPath('scss/autoprefix.scss'), autoprefixOptions),
      'to be fulfilled with',
      expect
        .it(
          'to begin with',
          'body {\n  -webkit-transform: rotate(-1deg);\n          transform: rotate(-1deg); }'
        )
        .and(
          'to contain',
          '\n\n/*# sourceMappingURL=data:application/json;base64,'
        )
    );
  });
});
