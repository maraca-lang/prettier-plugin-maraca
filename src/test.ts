import * as prettier from 'prettier';

const code = `
[
  @@ 100,
  [
    [:testing, href: "", Home, \`hello
    there\`], [:a, href: about, About],,
    "1 + ?"$1
  ],
  (#url   | 1) [
    ~: [:p, Hi\\!, " "],
    about: [:p, About.\\!],   => [:p, "Not found..."],,
  ]
]
`;
console.log(
  prettier.format(code, {
    parser: 'maraca',
    plugins: ['./lib/index'],
  }),
);
