import * as prettier from 'prettier/standalone';
import { parse } from 'maraca';

const {
  concat,
  fill,
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

const checkIdNode = node => {
  if (!node || !node.nodes) return node;
  if (
    node.type === 'list' &&
    node.info.bracket === '[' &&
    node.nodes.length === 1 &&
    node.nodes[0].type === 'func' &&
    !node.nodes[0].info &&
    !node.nodes[0].nodes[0] &&
    node.nodes[0].nodes[1] &&
    node.nodes[0].nodes[1].type === 'value' &&
    node.nodes[0].nodes[2] &&
    node.nodes[0].nodes[2].type === 'combine' &&
    node.nodes[0].nodes[2].nodes[0].type === 'value' &&
    node.nodes[0].nodes[2].nodes[0].info.value ===
      node.nodes[0].nodes[1].info.value &&
    node.nodes[0].nodes[2].nodes[1].type === 'context'
  ) {
    return { ...node, idNode: true };
  }
  return { ...node, nodes: node.nodes.map(checkIdNode) };
};

export const parsers = {
  maraca: {
    parse: s => checkIdNode(parse(s)),
    astFormat: 'maraca',
    locStart: node => node.start,
    locEnd: node => node.end,
  },
};

const indentBreak = (...docs) => ifBreak(indent(concat(docs)), concat(docs));

const printString = (quote, value) =>
  group(
    concat([
      markAsRoot,
      quote,
      join(
        concat([hardline, hardline]),
        value
          .split(/\s*\n\s*\n\s*/g)
          .filter(s => s)
          .map(s =>
            fill(
              s
                .split(/\s+/g)
                .reduce((res, a) => [...res, line, a], [])
                .slice(1),
            ),
          ),
      ),
      quote,
    ]),
  );

const printConfig = (
  path,
  print,
  { type, nodes = [] as any[], info = {} as any, idNode },
) => {
  if (idNode) return '~';
  if (type === 'func') {
    const [key, value] = nodes;
    if (info.map) {
      if (key && value) {
        return group(
          concat([
            group(
              concat([
                path.call(print, 'nodes', '1'),
                '=>',
                line,
                path.call(print, 'nodes', '0'),
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
  if (type === 'push') {
    return group(
      concat([
        path.call(print, 'nodes', '0'),
        indentBreak(line, '->', line, path.call(print, 'nodes', '1')),
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
      concat([
        path.call(print, 'nodes', '0'),
        indentBreak(line, info.func, line, path.call(print, 'nodes', '1')),
      ]),
    );
  }
  if (type === 'library') {
    return group(concat(['#', path.call(print, 'nodes', '0')]));
  }
  if (type === 'list') {
    const items = [] as any[];
    let current = [] as any;
    let multi = null as any;
    let lines = 0;
    path.each(p => {
      const c = p.getValue();
      if (c.type === 'nil') {
        current.push(',', ifBreak('', ' '));
        lines++;
      } else {
        if (current.length > 0) items.push(concat(current));
        current = [...Array.from({ length: lines }).map(() => softline)];
        lines = 0;
        if (c.info && c.info.first) multi = [markAsRoot, '"'];
        if (multi) {
          const printed = print(p);
          if (Array.isArray(printed)) {
            multi.push(...printed);
          } else {
            multi[multi.length - 1] = group(
              concat([multi[multi.length - 1], printed]),
            );
          }
        } else {
          current.push(print(p));
        }
        if (c.info && c.info.last) {
          multi.push('"');
          current.push(fill(multi));
          multi = null;
        }
      }
    }, 'nodes');
    if (current.length > 0) items.push(concat(current));
    return group(
      concat([
        info.bracket,
        indent(concat([softline, join(concat([',', line]), items)])),
        ifBreak(',', ''),
        softline,
        { '[': ']', '(': ')', '{': '}', '<': '/>' }[info.bracket],
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
    if (info.multi) {
      const result = `${info.split ? '>' : ''}${info.value.replace(
        /([<>"\\])/g,
        (_, m) => `\\${m}`,
      )}`;
      return result
        .split(/\s*\n\s*\n\s*/g)
        .reduce(
          (res, a) => [
            ...res,
            hardline,
            hardline,
            ...a
              .split(/\s+/g)
              .reduce((res, b) => [...res, line, b], [] as any[])
              .slice(1),
          ],
          [] as any[],
        )
        .slice(2);
    }
    if (info.value.length === 1 && !/[a-zA-Z0-9]/.test(info.value)) {
      return info.value === ' ' ? '_' : `'${info.value}`;
    }
    if (/^((?:\d+\.\d+)|(?:[a-zA-Z0-9]+))$/.test(info.value)) {
      return info.value;
    }
    return printString('"', info.value);
  }
  if (type === 'nil') return '""';
  if (type === 'context') return '?';
  if (type === 'comment') return printString('`', info.value);
};

export const printers = {
  maraca: {
    print(path, _, print) {
      const config = path.getValue();
      return printConfig(path, print, config);
    },
  },
};
