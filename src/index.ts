import * as prettier from 'prettier/standalone';
import { parse } from 'maraca';

const {
  breakParent,
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

export const parsers = {
  maraca: {
    parse: (s) => parse(s),
    astFormat: 'maraca',
    locStart: (node) => node.start,
    locEnd: (node) => node.end,
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
  { type, nodes = [] as any[], info = {} as any },
) => {
  if (type === 'func') {
    const [key, value] = nodes;
    const bodyValue = indentBreak(line, path.call(print, 'info', 'value'));
    const body =
      info.key === true
        ? bodyValue
        : indentBreak(
            line,
            info.key ? path.call(print, 'info', 'key') : '',
            ':',
            bodyValue,
          );
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
            body,
          ]),
        );
      }
      if (value) {
        return group(
          concat([concat([path.call(print, 'nodes', '1'), '=>>']), body]),
        );
      }
      if (info.value.type !== 'nil') {
        return group(concat(['=>>', body]));
      }
      return group(concat(['=>>', line]));
    }
    if (value) {
      return group(
        concat([concat([path.call(print, 'nodes', '1'), '=>']), body]),
      );
    }
    return group(concat(['=>', body]));
  }
  if (type === 'set') {
    const operator = info.pushable ? ':~' : ':';
    if (!nodes[1]) {
      return group(
        concat([operator, indentBreak(line, path.call(print, 'nodes', '0'))]),
      );
    }
    if (nodes[0].type === 'nil' && nodes[1].type === 'nil') {
      return operator;
    }
    if (nodes[1].type === 'nil') {
      return group(
        concat([
          `''${operator}`,
          indentBreak(line, path.call(print, 'nodes', '0')),
        ]),
      );
    }
    if (nodes[0].type === 'nil') {
      return concat([path.call(print, 'nodes', '1'), `${operator} `]);
    }
    if (nodes[0] === nodes[1]) {
      return concat([path.call(print, 'nodes', '1'), ':=']);
    }
    return group(
      concat([
        path.call(print, 'nodes', '1'),
        operator,
        indentBreak(line, path.call(print, 'nodes', '0')),
      ]),
    );
  }
  if (type === 'copy') {
    return concat([path.call(print, 'nodes', '0'), ':@']);
  }
  if (type === 'eval') {
    if (nodes.length === 1) {
      return group(concat(['>>', softline, path.call(print, 'nodes', '0')]));
    }
    return group(
      concat([
        path.call(print, 'nodes', '1'),
        indentBreak(softline, '>>', softline, path.call(print, 'nodes', '0')),
      ]),
    );
  }
  if (['push', 'trigger'].includes(type)) {
    return group(
      concat([
        path.call(print, 'nodes', '0'),
        indentBreak(
          line,
          { push: '->', trigger: '|' }[type],
          line,
          path.call(print, 'nodes', '1'),
        ),
      ]),
    );
  }
  if (type === 'map') {
    if (nodes.length === 1) {
      return group(
        concat([
          info.func,
          ...(info.func === '!' ? [line] : []),
          path.call(print, 'nodes', '0'),
        ]),
      );
    }
    return group(
      concat([
        path.call(print, 'nodes', '0'),
        indentBreak(line, info.func, line, path.call(print, 'nodes', '1')),
      ]),
    );
  }
  if (type === 'size') {
    return group(concat(['#', path.call(print, 'nodes', '0')]));
  }
  if (type === 'block') {
    const items = [] as any[];
    let multi = null as any;
    let lines = 0;
    const addItem = (item) => {
      items.push(
        concat([
          ...Array.from({ length: lines }).map(() => softline),
          ...(items.length !== 0 ? [line] : []),
          item,
        ]),
      );
      lines = 0;
    };
    path.each((p) => {
      const c = p.getValue();
      if (c.type === 'nil') {
        items.push(ifBreak('', ' '));
        lines++;
      } else {
        if (c.info && c.info.first) multi = ['"'];
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
          multi.push('"');
          addItem(
            join(
              hardline,
              splitItems(multi, (x) => x === hardline).map((x) =>
                fill(
                  splitItems(x, (y) => y === line)
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
        indent(
          concat([
            softline,
            join(group(concat([softline, ','])), items),
            ifBreak(group(concat([softline, ','])), ''),
          ]),
        ),
        softline,
        { '[': ']', '(': ')', '{': '}', '<': '/>' }[info.bracket],
      ]),
    );
  }
  if (type === 'combine') {
    return group(
      concat(
        path.map(
          (p, i) =>
            concat([
              ...(i !== 0 && [
                softline,
                { 1: '.', 2: '..', 3: '...' }[info.level],
              ]),
              print(p),
            ]),
          'nodes',
        ),
      ),
    );
  }
  if (type === 'join') {
    const items = path
      .map(
        (p, i) => [print(p), ...(info.space && info.space[i] ? [line] : [])],
        'nodes',
      )
      .reduce((res, x) => [...res, ...x], []);
    return group(
      join(
        concat([group(concat([line, '\\'])), hardline]),
        splitItems(
          items,
          (x) => x.type === 'concat' && x.parts[1] === hardline,
        ).map((x) =>
          fill(
            splitItems(x, (y) => y === line)
              .reduce((res, y) => [...res, line, group(concat(y))], [])
              .slice(1),
          ),
        ),
      ),
    );
  }
  if (type === 'value') {
    if (!info.multi) {
      if (!info.value) return "''";
      if (info.value === '\n') return concat(['\\', hardline]);
      if (/^[a-zA-Z0-9]+$/.test(info.value)) {
        return info.value;
      }
      if (info.value.length === 1) {
        return info.value === ' ' ? '_' : `\\${info.value}`;
      }
      return group(
        concat([
          "'",
          join(
            hardline,
            info.value.replace(/(['\\])/g, (_, m) => `\\${m}`).split(/\n/g),
          ),
          "'",
        ]),
      );
    }
    const result = info.value
      .replace(/\n\n/g, '￿')
      .replace(/([<>"\\\n])/g, (_, m) => `\\${m}`)
      .replace(/￿/g, '\n\n');
    return result
      .split(/\n/g)
      .reduce((res, t) => {
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
      }, [] as any[])
      .slice(1);
  }
  if (type === 'get') {
    return group(concat(['@', path.call(print, 'nodes', '0')]));
  }
  if (type === 'nil') return "''";
  if (type === 'error') {
    return group(concat(path.map((p) => print(p), 'info', 'nodes')));
  }
  if (type === 'part') {
    return info.value.includes('\n')
      ? concat([breakParent, info.value])
      : info.value;
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
