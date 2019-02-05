import * as prettier from 'prettier/standalone';
import { parse } from 'maraca';

const {
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

const printConfig = (
  path,
  print,
  { type, nodes = [] as any[], info = {} as any },
) => {
  if (type === 'other') {
    const [key, value] = nodes;
    if (info.map) {
      if (key && value) {
        return group(
          concat([
            group(
              concat([
                path.call(print, 'nodes', '0'),
                '=>',
                line,
                path.call(print, 'nodes', '1'),
                '=>',
              ]),
            ),
            indentBreak(line, path.call(print, 'nodes', '2')),
          ]),
        );
      }
      if (value) {
        return group(
          concat([
            concat([path.call(print, 'nodes', '1'), '=>>']),
            indentBreak(line, path.call(print, 'nodes', '2')),
          ]),
        );
      }
      return group(
        concat(['=>>', indentBreak(line, path.call(print, 'nodes', '2'))]),
      );
    }
    if (value) {
      return group(
        concat([
          concat([path.call(print, 'nodes', '1'), '=>']),
          indentBreak(line, path.call(print, 'nodes', '2')),
        ]),
      );
    }
    return group(
      concat(['=>', indentBreak(line, path.call(print, 'nodes', '2'))]),
    );
  }
  if (type === 'assign') {
    if (info.unpack) {
      if (nodes.length === 1) {
        return group(
          concat(['::', indentBreak(line, path.call(print, 'nodes', '0'))]),
        );
      }
      return group(
        concat([
          path.call(print, 'nodes', '1'),
          '::',
          indentBreak(line, path.call(print, 'nodes', '0')),
        ]),
      );
    }
    if (nodes[1].type === 'nil') {
      return group(
        concat([':', indentBreak(line, path.call(print, 'nodes', '0'))]),
      );
    }
    if (nodes[0].type === 'nil') {
      return concat([path.call(print, 'nodes', '1'), ': ']);
    }
    if (nodes[0] === nodes[1]) {
      return concat([path.call(print, 'nodes', '1'), ':=']);
    }
    if (
      nodes[0].type === 'combine' &&
      nodes[0].nodes[0] === nodes[1] &&
      nodes[0].nodes[1].type === 'context'
    ) {
      return concat([path.call(print, 'nodes', '1'), ':=?']);
    }
    return group(
      concat([
        path.call(print, 'nodes', '1'),
        ':',
        indentBreak(line, path.call(print, 'nodes', '0')),
      ]),
    );
  }
  if (type === 'copy') {
    return group(
      concat([
        path.call(print, 'nodes', '1'),
        ';',
        indentBreak(line, path.call(print, 'nodes', '0')),
      ]),
    );
  }
  if (type === 'interpret') {
    return group(
      concat([
        Array.from({ length: info.level + 1 }).join('@'),
        path.call(print, 'nodes', '0'),
      ]),
    );
  }
  if (type === 'core') {
    if (nodes.length === 1) {
      return group(concat([info.func, path.call(print, 'nodes', '0')]));
    }
    return group(
      join(concat([line, info.func, line]), path.map(print, 'nodes')),
    );
  }
  if (type === 'library') {
    return group(concat(['#', path.call(print, 'nodes', '0')]));
  }
  if (type === 'list') {
    const items = [] as any[];
    let current = [] as any;
    let lines = 0;
    path.each(p => {
      const c = p.getValue();
      if (c.type === 'nil') {
        current.push(',', ifBreak('', ' '));
        lines++;
      } else {
        if (current.length > 0) {
          items.push(concat(current));
        }
        current = [
          ...Array.from({ length: lines }).map(() => softline),
          print(p),
        ];
        lines = 0;
      }
    }, 'nodes');
    items.push(concat(current));
    return group(
      concat([
        info.bracket,
        indent(concat([softline, join(concat([',', line]), items)])),
        ifBreak(',', ''),
        softline,
        { '[': ']', '(': ')', '{': '}' }[info.bracket],
      ]),
    );
  }
  if (type === 'combine') {
    return group(
      indent(
        concat(
          path.map(
            (p, i) =>
              concat([
                ...(i !== 0 && info.dot ? [softline, '.'] : []),
                print(p),
                info.space && info.space[i] ? line : '',
              ]),
            'nodes',
          ),
        ),
      ),
    );
  }
  if (type === 'value') {
    if (info.value.length === 1 && !/[a-zA-Z0-9]/.test(info.value)) {
      return info.value === ' ' ? '_' : `'${info.value}`;
    }
    if (/^((?:\d+\.\d+)|(?:[a-zA-Z0-9]+))$/.test(info.value)) {
      return info.value;
    }
    return group(
      concat([
        markAsRoot,
        '"',
        join(hardline, info.value.replace(/"/g, '""').split(/\n/g)),
        '"',
      ]),
    );
  }
  if (type === 'nil') return '""';
  if (type === 'context') return '?';
  if (type === 'comment') {
    return group(
      concat([markAsRoot, '`', join(hardline, info.value.split(/\n/g)), '`']),
    );
  }
};

export const printers = {
  maraca: {
    print(path, _, print) {
      const config = path.getValue();
      return printConfig(path, print, config);
    },
  },
};
