import * as prettier from 'prettier';
import { parse } from 'maraca';

const {
  breakParent,
  concat,
  group,
  ifBreak,
  indent,
  join,
  line,
  softline,
} = prettier.doc.builders;

export const languages = [
  {
    name: 'Maraca',
    parsers: ['maraca'],
    extensions: ['.ma'],
    tmScope: 'source.maraca',
    vscodeLanguageIds: ['maraca'],
  },
];

export const parsers = {
  maraca: {
    parse,
    astFormat: 'maraca',
    locStart: node => node.start,
    locEnd: node => node.end,
  },
};

const printConfig = (path, print, config) => {
  if (config.type === 'other') {
    if (config.key === true) {
      return group(concat(['=>', line, path.call(print, 'output')]));
    }
    if (config.value === true) {
      return group(concat(['=>>', line, path.call(print, 'output')]));
    }
    if (!config.value) {
      return group(
        concat([
          path.call(print, 'key'),
          '=>',
          line,
          path.call(print, 'output'),
        ]),
      );
    }
    if (!config.key) {
      return group(
        concat([
          path.call(print, 'value'),
          '=>>',
          line,
          path.call(print, 'output'),
        ]),
      );
    }
    return group(
      concat([
        path.call(print, 'key'),
        '=>',
        line,
        path.call(print, 'value'),
        '=>',
        line,
        path.call(print, 'output'),
      ]),
    );
  }
  if (config.type === 'set') {
    if (config.unpack) {
      if (config.args.length === 1) {
        return group(concat(['::', softline, path.call(print, 'args', '0')]));
      }
      return group(
        concat([
          path.call(print, 'args', '0'),
          softline,
          '::',
          softline,
          path.call(print, 'args', '1'),
        ]),
      );
    }
    if (config.args.length === 1) {
      return group(concat(['::', line, path.call(print, 'args', '0')]));
    }
    if (config.args[1].type === 'nil') {
      if (config.args[0].type === 'value') {
        return group(concat([':', softline, path.call(print, 'args', '0')]));
      }
      return group(concat([':', line, path.call(print, 'args', '0')]));
    }
    return group(
      concat([
        path.call(print, 'args', '1'),
        softline,
        ':',
        line,
        path.call(print, 'args', '0'),
      ]),
    );
  }
  if (config.type === 'core') {
    if (config.args.length === 1) {
      return group(
        concat([config.func, softline, path.call(print, 'args', '0')]),
      );
    }
    return group(
      join(concat([line, config.func, line]), path.map(print, 'args')),
    );
  }
  if (config.type === 'eval' || config.type === 'js') {
    if (config.arg.type === 'nil') {
      return group(
        concat([
          { eval: '##', js: '#' }[config.type],
          path.call(print, 'code'),
        ]),
      );
    }
    return group(
      concat([
        { eval: '##', js: '#' }[config.type],
        path.call(print, 'code'),
        line,
        path.call(print, 'arg'),
      ]),
    );
  }
  if (config.type === 'list') {
    return group(
      concat([
        config.bracket,
        indent(
          concat([
            softline,
            join(
              concat([',', line]),
              path.map(p => {
                const c = p.getValue();
                if (c.type === 'nil') return '';
                return print(p);
              }, 'values'),
            ),
          ]),
        ),
        ifBreak(',', ''),
        softline,
        { '[': ']', '(': ')', '{': '}' }[config.bracket],
      ]),
    );
  }
  if (config.type === 'combine') {
    return group(join(config.tight ? '.' : ' ', path.map(print, 'args')));
  }
  if (config.type === 'any') return '*';
  if (config.type === 'value') {
    if (/^((?:\d*\.\d+)|(?:[a-zA-Z0-9]+)|(?:\d+))$/.test(config.value)) {
      return config.value;
    }
    return `"${config.value.replace(/"/g, '\\"')}"`;
  }
  if (config.type === 'nil') return '[]';
  if (config.type === 'context') return '?';
};

const printBreak = (path, print, config) => {
  const result = printConfig(path, print, config);
  if (config.break) return concat([breakParent, result]);
  return result;
};

export const printers = {
  maraca: {
    print(path, _, print) {
      const config = path.getValue();
      return printBreak(path, print, config);
    },
  },
};
