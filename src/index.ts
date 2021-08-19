import * as prettier from "prettier/standalone";
import maraca, { fromJs, parse } from "maraca";

const { fill, group, indent, join, line, softline } = prettier.doc.builders;

export const languages = [
  {
    name: "Maraca",
    parsers: ["maraca"],
    extensions: [".ma"],
    tmScope: "source.maraca",
    vscodeLanguageIds: ["maraca"],
  },
];

const script = `
{
  chunk=<(open close inner)=>
    <type=group
      @open
      <type=indent
        <type=softline>
        @inner
      >
      <type=softline>
      @close
    >
  >
  array=<(open close content)=>
    @chunk.<
      open=@open
      close=@close
      inner=<type=join sep=<type=line> =@content>
    >
  >
  operator=<(op content)=>
    <type=group
      <@map.(@content.1) " " @op>
      <type=line>
      @map.(@content.2)
    >
  >
  set=<(key op content)=>
    <type=group
      <@key @op>
      <type=indent
        <type=softline>
        @map.(@content.1)
      >
    >
  >
  base=<(type bracket func mode params key name multi **content)=>
    {
      [
        (@type = block)
        @array.<
          open=@bracket
          close=<"<"=">" "["="]" "{"="}">.@bracket
          content=<(c)=>>@map.@c>.@content
        >
      ]

      [
        (@type = func)
        @set.<
          key=[
            @isBlock.@params
            @array.<
              open=\\(
              close=\\)
              content=<(p)=>>
                <@p.rest @p.key [@p.def <\\= @map.(@p.def)>]>
              >.@params
            >
            =>@params
          ]
          op=@mode
          content=@content
        >
      ]

      [
        (@type = merge)
        @set.<key=<type=join sep=\\. =<(k)=>>@map.@k>.@key> op="+=" content=@content>
      ]
      [
        (@type = attr)
        @set.<key=@map.@key op=\\= content=@content>
      ]
      [
        (@type = unpack)
        <type=group
          \\=
          @map.(@content.1)
        >
      ]
      
      [
        (@type = expr)
        @chunk.<open=\\( close=\\) inner=@map.(@content.1)>
      ]

      [
        (@type = dot)
        <type=group
          <@map.(@content.1) \\.>
          <type=indent
            <type=softline>
            @map.(@content.2)
          >
        >
      ]

      [
        (@type = pipe)
        @operator.<op=\\| content=@content>
      ]
      [
        (@type = map)
        [
          (#@content = 2)
          @operator.<op=@func content=@content>
          => <@func @map.(@content.1)>
        ] 
      ]
      [
        (@type = size)
        <\\# @map.(@content.1)>
      ]
      [
        (@type = var)
        <\\@ @name>
      ]

      [
        (@type = multi)
        <type=fill
          =@multiFill.<
            \\"
            =<(c)=>>@map.<=@c multi=true>>.@content
            \\"
          >
        >
      ]
      [
        (@type = template)
        <type=fill
          =@multiFill.<
            [!@multi \\"]
            =<(c)=>>[@isBlock.@c @base.@c =>@escape.@c]>.@content  
            [!@multi \\"]
          >
        >
      ]
    }
  >
  map=<v=>
    {
      [@isBlock.@v @base.@v]
      [@alphaNum.@v @v]
      [@single.@v "\\\\{@v}"]
      "\\"{@v}\\""
    }
  >
  @input.@map
}
`;

const splitString = (str) => [
  ...(/^\s/.test(str) ? [null] : []),
  ...str
    .trim()
    .split(/\s+/g)
    .reduce((res, s) => [...res, null, { type: "value", value: s }], [])
    .slice(1),
  ...(/\s$/.test(str) ? [null] : []),
];

export const parsers = {
  maraca: {
    parse: (s) =>
      maraca(script, {
        input: parse(s),
        isBlock: fromJs((value) => fromJs(value.type === "block")),
        alphaNum: fromJs((value) => fromJs(/^[a-zA-Z0-9]*$/.test(value.value))),
        single: fromJs((value) => fromJs(value.value.length === 1)),
        escape: fromJs((value) =>
          fromJs(value.value.replace(/\<|\>|\[|\]|\{|\}|"/g, (m) => `\\${m}`))
        ),
        multiFill: fromJs((value) => {
          const items = value.content
            .filter((x) => x.type === "block" || x.value)
            .reduce(
              (res, c) => [
                ...res,
                ...(c.type === "value" ? splitString(c.value) : [c]),
              ],
              []
            );
          const result = [[]];
          for (const i of items) {
            if (i === null) result.push([]);
            else result[result.length - 1].push(i);
          }
          return fromJs(
            result
              .reduce(
                (res, r) => [
                  ...res,
                  fromJs({ type: "line" }),
                  r.length === 1 ? r[0] : fromJs(r, false),
                ],
                []
              )
              .slice(1),
            false
          );
        }),
      }),
    astFormat: "maraca",
    // locStart: (node) => node.start,
    // locEnd: (node) => node.end,
  },
};

export const printers = {
  maraca: {
    print(path, _, print) {
      const config = path.getValue();
      if (config.type === "value") return config.value;
      const type = config.values.type?.value;
      if (!type) return path.map(print, "content");
      if (type === "fill") {
        return fill(path.map(print, "content"));
      }
      if (type === "group") {
        return group(path.map(print, "content"));
      }
      if (type === "indent") {
        return indent(path.map(print, "content"));
      }
      if (type === "join") {
        return join(
          path.call(print, "values", "sep"),
          path.map(print, "content")
        );
      }
      if (type === "line") {
        return line;
      }
      if (type === "softline") {
        return softline;
      }
    },
  },
};
