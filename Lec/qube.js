"use strict";

var canvas;
var gl;

var numVertices = 36;

var currT = "tra";

var stepMult = 1.0;
var steps = {
    tra: 0.1,
    rot: 1.0,
    sca: 0.1
}


var transform = {
    tra: { x: 0, y: 0, z: 0 },
    rot: { x: 0, y: 0, z: 0 },
    sca: { x: 1, y: 1, z: 1 }
}

var thetaLoc;
var transLoc;
var scaleLoc;

function resetTransform() {
    transform = {
        tra: { x: 0, y: 0, z: 0 },
        rot: { x: 0, y: 0, z: 0 },
        sca: { x: 1, y: 1, z: 1 }
    };

    stepMult = 1.0;
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

    debug.innerHTML = `
    <b>DEBUG INFO</b><br />
    POSITION ${transform["tra"].x.toFixed(1)}, ${transform["tra"].y.toFixed(1)}, ${transform["tra"].z.toFixed(1)}
    <br />
    ROTATION ${transform["rot"].x.toFixed(1)}, ${transform["rot"].y.toFixed(1)}, ${transform["rot"].z.toFixed(1)}
    <br />
    SCALE    ${transform["sca"].x.toFixed(1)}, ${transform["sca"].y.toFixed(1)}, ${transform["sca"].z.toFixed(1)}
    <br /><br />
    STEP MULTIPLIER ${stepMult.toFixed(1)}
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

    thetaLoc = gl.getUniformLocation(program, "theta");
    transLoc = gl.getUniformLocation(program, "trans");
    scaleLoc = gl.getUniformLocation(program, "scale");

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

    updateTransform();

    for (let x of ["tra", "rot", "sca"]) {
        document.getElementById(x).addEventListener("change", updateTransform);
    }

    document.addEventListener("keypress", e => {
        switch(e.key) {
            // Apply transformation
            case "a": applyMove("x", -stepMult); break;
            case "d": applyMove("x", stepMult);  break;

            case "w": applyMove("y", stepMult);  break;
            case "s": applyMove("y", -stepMult); break;

            case "q": applyMove("z", -stepMult); break;
            case "e": applyMove("z", stepMult);  break;

            // Change step multiplier
            case "+": stepMult = Math.max(0, Math.min(10, stepMult+0.1)); break;
            case "-": stepMult = Math.max(0, Math.min(10, stepMult-0.1)); break;

            // Reset
            case " ": resetTransform(); break;
        }
        e.preventDefault();
        e.stopPropagation();
        updateDebug();
    });

    render();
}

function unpackTransform(trans) {
    let {x, y, z} = transform[trans];
    return [x, y, z];
}

function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.uniform3fv(thetaLoc, unpackTransform("rot"));
    gl.uniform3fv(transLoc, unpackTransform("tra"));
    gl.uniform3fv(scaleLoc, unpackTransform("sca"));

    gl.drawElements(gl.TRIANGLES, numVertices, gl.UNSIGNED_BYTE, 0);

    requestAnimFrame(render);
}
