import * as prettier from 'prettier';

const code = `
[
  @@ 100,
  [
    [:a, href: "", Home], [:a, href: about, About],
  ],
  (#url) [
    : [:p, "Hi!"],
    about: [:p, "About!"],   => [:p, "Not found..."],,
  ]
]
`;
console.log(
  prettier.format(code, {
    parser: 'maraca',
    plugins: ['./lib/index'],
  }),
);
