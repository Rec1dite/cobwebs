from json import dumps
cols = [
    (242, 140, 169),    # red
    (166, 227, 161),    # green
    (137, 180, 250),    # blue

    (148, 226, 213),    # cyan
    (235, 161, 173),    # magenta
    (250, 179, 135),    # yellow

    (17, 17, 27),       # black
    (205, 214, 244),    # white

    (30, 30, 46)        # base
]

print(
    dumps({
        "cols": [
            (round(a/255, 2), round(b/255, 2), round(c/255, 2))
            for (a, b, c) in cols
        ]
    }, indent=4)
)