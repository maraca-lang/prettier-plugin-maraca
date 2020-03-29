import * as prettier from 'prettier';

const code = `
[
  [ =>>  ],
  [
    [:testing, href: '', Home, \`hello
    there\`], [:a, href: about, About],,
    '1 + ?'$1,
    'one
two'
  ],
  (  # 100   | 1) [
    : [:p, Hi\\!, ' '],
    about: ['':p, About.\\!],   => [:p, 'Not found...'],,
  ],
  [: test, "what     about this
< woo: hi  there />"]
]
`;
console.log(
  prettier.format(code, {
    parser: 'maraca',
    plugins: ['./lib/index'],
  }),
);
