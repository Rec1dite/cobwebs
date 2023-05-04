"use strict";

var canvas;
var gl;

var numVertices = 36;

var transform = {
    t: { x: 0, y: 0, z: 0 },
    r: { x: 0, y: 0, z: 0 },
    s: { x: 1, y: 1, z: 1 }
}

var vertices = [
    vec3(-0.5, -0.5, 0.5),
    vec3(-0.5, 0.5, 0.5),
    vec3(0.5, 0.5, 0.5),
    vec3(0.5, -0.5, 0.5),
    vec3(-0.5, -0.5, -0.5),
    vec3(-0.5, 0.5, -0.5),
    vec3(0.5, 0.5, -0.5),
    vec3(0.5, -0.5, -0.5)
];

var vertexColors = [
    vec4(0.0, 0.0, 0.0, 1.0),  // k
    vec4(1.0, 0.0, 0.0, 1.0),  // r
    vec4(1.0, 1.0, 0.0, 1.0),  // y
    vec4(0.0, 1.0, 0.0, 1.0),  // g
    vec4(0.0, 0.0, 1.0, 1.0),  // b
    vec4(1.0, 0.0, 1.0, 1.0),  // m
    vec4(1.0, 1.0, 1.0, 1.0),  // w
    vec4(0.0, 1.0, 1.0, 1.0)   // c
];

var indices = [
    1, 0, 3,
    3, 2, 1,
    2, 3, 7,
    7, 6, 2,
    3, 0, 4,
    4, 7, 3,
    6, 5, 1,
    1, 2, 6,
    4, 5, 6,
    6, 7, 4,
    5, 4, 0,
    0, 1, 5
];

function updateDebug() {
    const debug = document.getElementById("debug");
    debug.innerText = `
    DEBUG INFO
    {transform["t"]}
    {transform["r"]}
    {transform["s"]}
    `;
}

window.onload = function init() {
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    // config
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // array
    var iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(indices), gl.STATIC_DRAW);

    // colors
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertexColors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // vertices
    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    let thetaLoc = gl.getUniformLocation(program, "theta");

    document.addEventListener("keypress", e => {
        switch(e.key) {
            case "a": break;
            case "d": break;

            case "w": break;
            case "s": break;

            case "q": break;
            case "e": break;
        }
        updateDebug();
    });

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.uniform3fv(thetaLoc, theta);

    gl.drawElements(gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0);

    requestAnimFrame(render);
}
