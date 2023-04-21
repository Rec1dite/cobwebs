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

# (0.95, 0.55, 0.66),
# (0.65, 0.89, 0.63),
# (0.54, 0.71, 0.98),
# (0.58, 0.89, 0.84),
# (0.92, 0.63, 0.68),
# (0.98, 0.7, 0.53),
# (0.07, 0.07, 0.11),
# (0.8, 0.84, 0.96),
# (0.12, 0.12, 0.18)
