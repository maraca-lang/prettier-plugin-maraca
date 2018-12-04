import * as prettier from 'prettier';
import { parse } from 'maraca';

const {
  breakParent,
  concat,
  group,
  hardline,
  ifBreak,
  indent,
  join,
  line,
  markAsRoot,
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

const indentBreak = (...docs) => ifBreak(indent(concat(docs)), concat(docs));

const printConfig = (path, print, config) => {
  if (config.type === 'other') {
    if (config.map) {
      if (config.key && config.value) {
        return group(
          concat([
            group(
              concat([
                path.call(print, 'key'),
                '=>',
                line,
                path.call(print, 'value'),
                '=>',
              ]),
            ),
            indentBreak(line, path.call(print, 'output')),
          ]),
        );
      }
      if (config.value) {
        return group(
          concat([
            concat([path.call(print, 'value'), '=>>']),
            indentBreak(line, path.call(print, 'output')),
          ]),
        );
      }
      return group(
        concat(['=>>', indentBreak(line, path.call(print, 'output'))]),
      );
    }
    if (config.value) {
      return group(
        concat([
          concat([path.call(print, 'value'), '=>']),
          indentBreak(line, path.call(print, 'output')),
        ]),
      );
    }
    return group(concat(['=>', indentBreak(line, path.call(print, 'output'))]));
  }
  if (config.type === 'set') {
    if (config.unpack) {
      if (config.args.length === 1) {
        return group(
          concat(['::', indentBreak(line, path.call(print, 'args', '0'))]),
        );
      }
      return group(
        concat([
          path.call(print, 'args', '0'),
          '::',
          indentBreak(line, path.call(print, 'args', '1')),
        ]),
      );
    }
    if (config.args[1].type === 'nil') {
      return group(
        concat([':', indentBreak(line, path.call(print, 'args', '0'))]),
      );
    }
    if (config.args[0].type === 'nil') {
      return concat([path.call(print, 'args', '1'), ': ']);
    }
    if (config.args[0] === config.args[1]) {
      return concat([path.call(print, 'args', '1'), ':=']);
    }
    if (
      config.args[0].type === 'combine' &&
      config.args[0].args[0] === config.args[1] &&
      config.args[0].args[1].type === 'context'
    ) {
      return concat([path.call(print, 'args', '1'), ':=?']);
    }
    return group(
      concat([
        path.call(print, 'args', '1'),
        ':',
        indentBreak(line, path.call(print, 'args', '0')),
      ]),
    );
  }
  if (config.type === 'dynamic') {
    return group(
      concat([
        Array.from({ length: config.level + 1 }).join('@'),
        path.call(print, 'arg'),
      ]),
    );
  }
  if (config.type === 'core') {
    if (config.args.length === 1) {
      return group(concat([config.func, path.call(print, 'args', '0')]));
    }
    return group(
      join(concat([line, config.func, line]), path.map(print, 'args')),
    );
  }
  if (config.type === 'eval') {
    return group(concat([config.mode, path.call(print, 'code')]));
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
    return group(
      indent(
        concat(
          path.map(
            (p, i) =>
              concat([
                ...(i !== 0 && config.dot ? [softline, '.'] : []),
                print(p),
                config.space && config.space[i] ? line : '',
              ]),
            'args',
          ),
        ),
      ),
    );
  }
  if (config.type === 'value') {
    if (config.value.length === 1 && !/[a-zA-Z0-9]/.test(config.value)) {
      return `\\${config.value}`;
    }
    if (/^((?:\d+\.\d+)|(?:[a-zA-Z0-9]+))$/.test(config.value)) {
      return config.value;
    }
    return group(
      concat([
        markAsRoot,
        '"',
        softline,
        join(hardline, config.value.replace(/"/g, '\\"').split(/\n/g)),
        softline,
        '"',
      ]),
    );
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
