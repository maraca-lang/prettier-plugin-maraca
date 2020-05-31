import * as prettier from 'prettier';

const code = `
[
  [ =>>  ],
  @ 
  func,
  [
    [:testing, href: '', Home], [:a, href:~   about, About],,
    1  >> '1 + 3',   >>'2134',
    'one
two'
  ],
  [10, 20  ]   +  ,
  (  # 100   | 1) [
    : [:p, Hi\\!, ' '],
    about: ['':p, About.\\!],   => [:p, 'Not found...'],,
  ],  [x =>>   2: @x * 4000],
  [: test, "what     about

  this
< woo: hi  there />"], **&
]
`;
console.log(
  prettier.format(code, {
    parser: 'maraca',
    plugins: ['./lib/index'],
  }),
);
