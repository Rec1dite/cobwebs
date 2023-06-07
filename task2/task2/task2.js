"use strict";

var canvas;
var gl;

var numVertices = 0;

// The final lists that are sent to the gpu buffers
var points = [];
var colors = [];

var near = -1;
var far = 3;
var radius = 1.0;
var theta = 0.0;
var phi = 1.0;
var dr = 5.0 * Math.PI / 180.0;

var isIso = false;

var left = -1.0;
var right = 1.0;
var ytop = 1.0;
var bottom = -1.0;

var modelViewMatrix, projectionMatrix;
var modelViewMatrixLoc, projectionMatrixLoc;
var camera;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var vertices = [
    // Base
    vec4(-0.5, -0.5, 0.5, 1.0),    // 0b
    vec4(-0.5, 0.5, 0.5, 1.0),    // 1t
    vec4(0.5, 0.5, 0.5, 1.0),     // 2t
    vec4(0.5, -0.5, 0.5, 1.0),     // 3b
    vec4(-0.5, -0.5, -0.5, 1.0),    // 4b
    vec4(-0.5, 0.5, -0.5, 1.0),    // 5t
    vec4(0.5, 0.5, -0.5, 1.0),     // 6t
    vec4(0.5, -0.5, -0.5, 1.0),     // 7b

    // Rooftop
    vec4(0.0, 1.0, 0.0, 1.0),       // 8t

    // Window 1
    vec4(0.501, 0.15, 0.15, 1.0),      // 9
    vec4(0.501, -0.15, 0.15, 1.0),      // 10
    vec4(0.501, -0.15, -0.15, 1.0),      // 11
    vec4(0.501, 0.15, -0.15, 1.0),      // 12

    // Window 2
    vec4(-0.501, 0.15, 0.15, 1.0),      // 13
    vec4(-0.501, -0.15, 0.15, 1.0),      // 14
    vec4(-0.501, -0.15, -0.15, 1.0),      // 15
    vec4(-0.501, 0.15, -0.15, 1.0),      // 16

    // Door
    vec4(0.15, 0.15, -0.501, 1.0),      // 17
    vec4(-0.15, 0.15, -0.501, 1.0),      // 18
    vec4(-0.15, -0.475, -0.501, 1.0),      // 19
    vec4(0.15, -0.475, -0.501, 1.0),      // 20
];

// Catppuccin color scheme
var vertexColors = {
    r: vec4(0.95, 0.55, 0.66, 1.0),
    g: vec4(0.65, 0.89, 0.63, 1.0),
    b: vec4(0.54, 0.71, 0.98, 1.0),

    c: vec4(0.58, 0.89, 0.84, 1.0),
    m: vec4(0.92, 0.63, 0.68, 1.0),
    y: vec4(0.98, 0.7, 0.53, 1.0),

    k: vec4(0.07, 0.07, 0.11, 1.0),
    w: vec4(0.8, 0.84, 0.96, 1.0),

    x: vec4(0.12, 0.12, 0.18, 1.0)
};

function colorCube() {
    // Base
    quad(1, 0, 3, 2, "g");
    quad(2, 3, 7, 6, "y");   //Window wall 1
    quad(3, 0, 4, 7, "m");  // Floor
    quad(4, 5, 6, 7, "c");
    quad(5, 4, 0, 1, "b");

    // // Roof
    tri(6, 8, 2, "r");
    tri(6, 8, 5, "m");
    tri(5, 8, 1, "r");
    tri(2, 8, 1, "m");

    // Windows
    quad(9, 10, 11, 12, "k");
    quad(13, 14, 15, 16, "k");

    // Door
    quad(17, 18, 19, 20, "k");
}

function tri(a, b, c, col) {
    points.push(vertices[a]);
    colors.push(vertexColors[col]);
    points.push(vertices[b]);
    colors.push(vertexColors[col]);
    points.push(vertices[c]);
    colors.push(vertexColors[col]);
    numVertices += 3;
}

function quad(a, b, c, d, col) {
    points.push(vertices[a]);
    colors.push(vertexColors[col]);
    points.push(vertices[b]);
    colors.push(vertexColors[col]);
    points.push(vertices[c]);
    colors.push(vertexColors[col]);
    points.push(vertices[a]);
    colors.push(vertexColors[col]);
    points.push(vertices[c]);
    colors.push(vertexColors[col]);
    points.push(vertices[d]);
    colors.push(vertexColors[col]);
    numVertices += 6;
}

window.onload = function init() {
    //===== SETUP =====//
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.12, 0.12, 0.18, 1.0);

    gl.enable(gl.DEPTH_TEST);

    //===== LOAD SHADERS =====//
    //  Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    colorCube();

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
    projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");

    document.getElementById("toggleIso").onclick = () => {
        if (isIso) {
            isIso = false;
            theta = 0.0;
            document.getElementById("toggleIso").innerHTML = "Toggle Isometric";
        } else {
            isIso = true;
            theta = 0.5;
            document.getElementById("toggleIso").innerHTML = "Toggle Flat";
        }
    }

    setInterval(() => phi += 0.01, 0.1);

    render();
}


var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera = vec3(radius * Math.sin(phi), radius * Math.sin(theta),
        radius * Math.cos(phi));

    modelViewMatrix = lookAt(camera, at, up);
    projectionMatrix = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(modelViewMatrix));
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    gl.drawArrays(gl.TRIANGLES, 0, numVertices);
    requestAnimFrame(render);
}
