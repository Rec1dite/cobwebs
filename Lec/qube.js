"use strict";

var canvas;
var gl;

var numVertices = 36;

var currT = "tra";

var steps = {
    tra: 0.1,
    rot: 0.1,
    sca: 0.1
}

var transform = {
    tra: { x: 0, y: 0, z: 0 },
    rot: { x: 0, y: 0, z: 0 },
    sca: { x: 1, y: 1, z: 1 }
}

// Apply a transformation step to a property along an axis
function applyMove(axis, mult) {
    transform[currT][axis] += steps[currT] * mult;
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

    let rads = {};
    for (let x of ["tra", "rot", "sca"]) {
        rads[x] = document.getElementById(x);
    }

    let updateTransform = () => {
        currT = rads["tra"].checked ? "tra" : 
                        rads["rot"].checked ? "rot" :
                        rads["sca"].checked ? "sca" :
                        null;
    }

    for (let x of ["tra", "rot", "sca"]) {
        document.getElementById(x).addEventListener("change", updateTransform);
    }

    document.addEventListener("keypress", e => {
        switch(e.key) {
            case "a": applyMove("x", -1.0); break;
            case "d": applyMove("x", 1.0);  break;

            case "w": applyMove("y", -1.0); break;
            case "s": applyMove("y", 1.0);  break;

            case "q": applyMove("z", -1.0); break;
            case "e": applyMove("z", 1.0);  break;
        }
        updateDebug();
    });

    render();
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // gl.uniform3fv(thetaLoc, theta);
    let transMat = mat4();
    // transMat = mult(transMat, scale([1, 1, 1, 1], [1, 1, 1, 1]));
    transMat = mult(transMat, rotate(rX, [1, 0, 0]));
    transMat = mult(transMat, rotate(rY, [0, 1, 0]));
    transMat = mult(transMat, rotate(rZ, [0, 0, 1]));

    viewMat = lookAt(camera, at, up);
    projMat = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(transMatLoc, false, flatten(transMat));

    gl.drawElements(gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0);

    requestAnimFrame(render);
}
