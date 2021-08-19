import * as prettier from "prettier";

const code = `
<(
  inline
  size=17 height="1.5" font bold italic underline strike color indent
  pad spacing fill cursor width
  input placeholder
  hover focus click key
  **content
)=>
  {
    gap=(([(@height > 3) @height =>(@height * @size)] - @size) * "0.5" + 1)
    base=<
      hover+=(@onmouseenter | true)
      hover+=(@onmouseleave | "")
      focus+=(@onfocus | true)
      focus+=(@onblur | "")
      click+=(@onclick | true)
      key+=(@onkeydown)
      style=<
        "font-size"="{@size}px"
        "line-height"=[@height "{@height}[(@height > 3) "px"]"]
        "font-family"=@font
        "font-weight"=[@bold bold]
        "font-style"=[@italic italic]
        "text-indent"=[@indent "{@indent}px"]
        padding={[@pad "{@pad}px"] [@inline "{(@gap * "0.25")}px 0"]}
        color=@color
        background=@fill
        cursor=@cursor
        "max-width"=[@width "{@width}px"]
        margin="0 auto"
        outline=none
        "text-decoration"={[@underline "underline"] [@strike "line-through"]}
        "user-select"=[(@cursor = pointer) none]
      >
    >
    [
      @input <input value=@content.1 placeholder=@placeholder =@base>
    ]
    nextInline={@inline @hasValues.@content}
    inner=@content.<<> (res x)=>>>
      <
        =@res
        =[
          @isBlock.@x
          <@map.<inline=@nextInline size={@x.size @size} height={@x.height @height} =@x>>
          =>@breakLines.@x
        ]
      >
    >
    [@inline <span =@inner =@base>]
    [
      @nextInline
      <div
        =@base
        <div
          style=<padding="1px 0" "min-height"="{@size}px">
          <div
            style=<"margin-top"="{-@gap}px" "margin-bottom"="{-@gap}px">
            =@inner
          >
        >
      >
    ]
    [
      @spacing
      <div
        =@inner.<(x i)=>> <div style=<"padding-top"="[(@i ! 1) @spacing]px"> @x>>
        =@base
      >
    ]
    <div =@inner =@base>
  }
>
`;

console.log(
  prettier.format(code, {
    parser: "maraca",
    plugins: ["./lib/index"],
  })
);
