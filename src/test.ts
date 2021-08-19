import * as prettier from "prettier";

const code = `(1  + 1)`;

console.log(
  prettier.format(code, {
    parser: "maraca",
    plugins: ["./lib/index"],
  })
);
