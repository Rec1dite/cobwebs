"use strict";

var canvas;
var gl;

var numVertices = 0;

// The final lists that are sent to the gpu buffers
var verts = [];
var cols = [];
var norms = [];
var imgData = null;

var near = -1;
var far = 3;
var radius = 1.0;
var theta = 0.0;
var phi = 1.0;
var dr = 5.0 * Math.PI / 180.0;

var isRot = true;
var isWire = false;

var rX = 0.0;
var rY = 0.0;
var rZ = 0.0;

var left = -1.0;
var right = 1.0;
var ytop = 1.0;
var bottom = -1.0;

var viewMat, projMat, transMat;
var viewMatLoc, projMatLoc, transMatLoc;
var camera;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

function getPixIndex(x, z, sampleStep, width) {
    return 4 * (x * sampleStep + z * sampleStep * width);
}

function constructPlane() {
    const sampleStep = 1.0;
    if (imgData == null) { return; }

    // Reset lists
    verts = [];
    cols = [];
    norms = [];

    let w = imgData.width / sampleStep;
    let h = imgData.height / sampleStep;
    // let w = 20;
    // let h = 20;

    let scale = 2.0 / w;
    for (let x = 0; x < w; x++) {

        // Draw forward strip
        for (let z = 0; z < h; z++) {

            // Get pixel color
            let pixIndex = getPixIndex(x, z, sampleStep, imgData.width);
            let r = imgData.data[pixIndex] / 255.0;
            let g = imgData.data[pixIndex+1] / 255.0;
            let b = imgData.data[pixIndex+2] / 255.0;

            let xp = (x+1) % w;
            let zp = (z+1) % h;
            let y1 = r;
            let y2 = imgData.data[getPixIndex(x, zp, sampleStep, imgData.width)] / 255.0;
            let y3 = imgData.data[getPixIndex(xp, zp, sampleStep, imgData.width)] / 255.0;
            let y4 = imgData.data[getPixIndex(xp, z, sampleStep, imgData.width)] / 255.0;
            // let r, g, b;
            // r = g = b = x / w;

            addSquare((x-w/2), (z-h/2), y1, y2, y3, y4, 50*scale, scale, r, g, b);
        }
    }
}

function addSquare(x, z, y1, y2, y3, y4, yscale, scale, r, g, b) {
    const sx = scale*x;
    const sz = scale*z;

    verts.push(sx, yscale*y1, sz, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;

    verts.push(sx, yscale*y2, sz+scale, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;

    verts.push(sx+scale, yscale*y3, sz+scale, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;

    verts.push(sx, yscale*y1, sz, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;

    verts.push(sx+scale, yscale*y3, sz+scale, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;

    verts.push(sx+scale, yscale*y4, sz, 1);
    cols.push(r, g, b, 1);
    norms.push(0, 1, 0);
    numVertices += 1;
}

var nBuffer;
var vBuffer;
var cBuffer;
var gl;
var program;


window.onload = function init() {
    //===== SETUP =====//
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.depthRange(0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.PRIMITIVE_RESTART_FIXED_INDEX)

    gl.clearColor(0.12, 0.12, 0.18, 1.0);

    theta = 10;

    //===== LOAD SHADERS =====//
    //  Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // reloadCanvas();

    //===== HANDLE FILE UPLOAD =====//
    document.getElementById('fileInput').addEventListener('change', function(e) {
        let img = new Image();
        img.src = URL.createObjectURL(e.target.files[0]);

        img.onload = function() {
            let previewCanvas = document.getElementById('previewCanvas');
            previewCanvas.width = img.width;
            previewCanvas.height = img.height;
            let context = previewCanvas.getContext('2d');
            context.drawImage(img, 0, 0, img.width, img.height);
            imgData = context.getImageData(0, 0, previewCanvas.width, previewCanvas.height);

            reloadCanvas();

            console.log(imgData);
        };

    }, false);

}

function reloadCanvas() {
    //===== DELETE PREVIOUS BUFFERS =====//
    gl.deleteBuffer(nBuffer);
    gl.deleteBuffer(cBuffer);
    gl.deleteBuffer(vBuffer);

    //===== CREATE GEOMETRY ======//
    constructPlane();

    //===== CREATE BUFFERS =====//
    // normals
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(norms), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // colors
    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cols), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // vertices
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(verts), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    transMatLoc = gl.getUniformLocation(program, "transMatrix");
    viewMatLoc = gl.getUniformLocation(program, "viewMatrix");
    projMatLoc = gl.getUniformLocation(program, "projMatrix");


    let wire = document.getElementById("wire");
    isWire = wire.checked;
    wire.onchange = () => {
        isWire = wire.checked;
    }
    render();

}

// See [https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Animating_objects_with_WebGL]
var render = () => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    phi += 0.01;
    theta += 0.01;

    camera = vec3(radius * Math.sin(phi), radius * Math.sin(theta),
        radius * Math.cos(phi));

    let transMat = mat4();
    // transMat = mult(transMat, scale([1, 1, 1, 1], [1, 1, 1, 1]));
    transMat = mult(transMat, rotate(rX, [1, 0, 0]));
    transMat = mult(transMat, rotate(rY, [0, 1, 0]));
    transMat = mult(transMat, rotate(rZ, [0, 0, 1]));

    viewMat = lookAt(camera, at, up);
    projMat = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(transMatLoc, false, flatten(transMat));
    gl.uniformMatrix4fv(viewMatLoc, false, flatten(viewMat));
    gl.uniformMatrix4fv(projMatLoc, false, flatten(projMat));

    // Possible options:
    // POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN

    let drawMode = gl.TRIANGLES;

    for (let i = 0; i < numVertices; i += 6) {
        gl.drawArrays(drawMode, i, 6);
    }
    // gl.drawArrays(drawMode, 0, numVertices)

    requestAnimFrame(render);
}