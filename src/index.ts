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

const splitItems = (items, test) => {
  const temp = [...items];
  const result = [] as any[];
  let i = 0;
  while (i !== -1) {
    i = temp.findIndex(test);
    const chunk = temp.splice(0, i === -1 ? temp.length : i + 1);
    if (i !== -1) chunk.pop();
    result.push(chunk);
  }
  return result;
};

const indentBreak = (...docs) => ifBreak(indent(concat(docs)), concat(docs));

const printConfig = (
  path,
  print,
  { type, nodes = [] as any[], info = {} as any, idNode },
) => {
  if (type === 'identity' || idNode) return '~';
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
    let multi = null as any;
    let lines = 0;
    const addItem = item => {
      items.push(
        concat([
          ...Array.from({ length: lines }).map(() => softline),
          ...(items.length !== 0 ? [line] : []),
          item,
        ]),
      );
      lines = 0;
    };
    path.each(p => {
      const c = p.getValue();
      if (c.type === 'nil') {
        items.push(ifBreak('', ' '));
        lines++;
      } else {
        if (c.info && c.info.first) multi = ["'"];
        if (multi) {
          const printed = print(p);
          if (Array.isArray(printed)) {
            const [indent, ...rest] = printed;
            multi.push(indent && line, ...rest);
          } else {
            multi.push(printed);
          }
        } else {
          addItem(print(p));
        }
        if (c.info && c.info.last) {
          multi.push("'");
          addItem(
            join(
              hardline,
              splitItems(multi, x => x === hardline).map(x =>
                fill(
                  splitItems(x, y => y === line)
                    .reduce((res, x) => [...res, line, group(concat(x))], [])
                    .slice(1),
                ),
              ),
            ),
          );
          multi = null;
        }
      }
    }, 'nodes');
    return group(
      concat([
        info.bracket,
        indent(concat([softline, join(group(concat([softline, ','])), items)])),
        ifBreak(group(concat([softline, ','])), ''),
        softline,
        { '[': ']', '(': ')', '{': '}', '<': '/>' }[info.bracket],
      ]),
    );
  }
  if (type === 'combine') {
    const items = path
      .map(
        (p, i) => [
          ...(i !== 0 && info.dot ? [softline, '.'] : []),
          print(p),
          ...(info.space && info.space[i] ? [line] : []),
        ],
        'nodes',
      )
      .reduce((res, x) => [...res, ...x], []);
    return group(
      join(
        concat([group(concat([line, '\\'])), hardline]),
        splitItems(
          items,
          x => x.type === 'concat' && x.parts[1] === hardline,
        ).map(x =>
          fill(
            splitItems(x, y => y === (info.dot ? softline : line))
              .reduce(
                (res, y) => [
                  ...res,
                  info.dot ? softline : line,
                  group(concat(y)),
                ],
                [],
              )
              .slice(1),
          ),
        ),
      ),
    );
  }
  if (type === 'value') {
    if (info.split === undefined) {
      if (!info.value) return '""';
      if (info.value === '\n') return concat(['\\', hardline]);
      if (/^((?:\d+\.\d+)|(?:[a-zA-Z0-9]+))$/.test(info.value)) {
        return info.value;
      }
      if (info.value.length === 1 && !/[a-zA-Z0-9]/.test(info.value)) {
        return info.value === ' ' ? '_' : `\\${info.value}`;
      }
      return group(
        concat([
          '"',
          join(
            hardline,
            info.value.replace(/(["\\])/g, (_, m) => `\\${m}`).split(/\n/g),
          ),
          '"',
        ]),
      );
    }
    const s = info.value
      .replace(/\n\n/g, '￿')
      .replace(/([<>'\\\n])/g, (_, m) => `\\${m}`)
      .replace(/￿/g, '\n\n');
    const result = `${info.split ? '>' : ''}${s}`;
    return result
      .split(/\n/g)
      .reduce(
        (res, t) => {
          const parts = t.split(/^(\s*)/g);
          const [, indent, rest] =
            parts.length < 3 ? ['', '', ...parts, ''] : parts;
          return [
            ...res,
            hardline,
            indent,
            ...rest
              .split(/ /g)
              .reduce((res, a) => [...res, line, a], [] as any[])
              .slice(1),
          ];
        },
        [] as any[],
      )
      .slice(1);
  }
  if (type === 'nil') return '""';
  if (type === 'context') return '?';
  if (type === 'comment') {
    return group(
      concat([
        '`',
        join(
          hardline,
          info.value.split(/\n/g).map(t =>
            fill(
              t
                .split(/ /g)
                .reduce((res, a) => [...res, line, a], [])
                .slice(1),
            ),
          ),
        ),
        '`',
      ]),
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
