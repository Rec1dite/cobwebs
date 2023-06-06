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
var theta = 90;
var phi = 0;

var isRot = true;
var isWire = false;

var rX = 0.0;
var rY = 0.0;
var rZ = 0.0;

var left = -1.5;
var right = 1.5;
var ytop = 1.0;
var bottom = -1.0;

var viewMat, projMat, transMat;
var viewMatLoc, projMatLoc, transMatLoc;
var camera;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var sampleStep = 1.0;

function getPixIndex(x, z, sampleStep, width) {
    return 4 * (x * sampleStep + z * sampleStep * width);
}

function constructPlane() {
    numVertices = 0;
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
    for (let x = 0; x < w-1; x++) {

        // Draw forward strip
        for (let z = 0; z < h-1; z++) {

            // Get pixel color
            let pixIndex = getPixIndex(x, z, sampleStep, imgData.width);
            let r = imgData.data[pixIndex] / 255.0;
            // let g = imgData.data[pixIndex+1] / 255.0;
            // let b = imgData.data[pixIndex+2] / 255.0;

            let xp = (x+1) % w;
            let zp = (z+1) % h;
            let y1 = r;
            let y2 = imgData.data[getPixIndex(x, zp, sampleStep, imgData.width)] / 255.0;
            let y3 = imgData.data[getPixIndex(xp, zp, sampleStep, imgData.width)] / 255.0;
            let y4 = imgData.data[getPixIndex(xp, z, sampleStep, imgData.width)] / 255.0;
            // let r, g, b;
            // r = g = b = x / w;

            addSquare((x-w/2), (z-h/2), y1, y2, y3, y4, 50*scale/sampleStep, scale);
        }
    }
}

function addSquare(x, z, y1, y2, y3, y4, yscale, scale) {
    const sx = scale*x;
    const sz = scale*z;

    let col1 = [1, 0, 0];
    let col2 = [0, 0, 1];

    // Triangle 1
    verts.push(sx, yscale*y1, sz, 1);
    verts.push(sx, yscale*y2, sz+scale, 1);
    verts.push(sx+scale, yscale*y3, sz+scale, 1);

    for (let i = 0; i < 3; i++) {
        cols.push(col1[0], col1[1], col1[2], 1);
        norms.push(0, 1, 0);
    }

    // Triangle 2
    verts.push(sx, yscale*y1, sz, 1);
    verts.push(sx+scale, yscale*y3, sz+scale, 1);
    verts.push(sx+scale, yscale*y4, sz, 1);

    for (let i = 0; i < 3; i++) {
        cols.push(col2[0], col2[1], col2[2], 1);
        norms.push(0, 1, 0);
    }

    numVertices += 6;
}

var nBuffer;
var vBuffer;
var cBuffer;
var gl;
var program;

var loader;

window.onload = function init() {
    //===== SETUP =====//
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.depthRange(0.8, 1.0);
    gl.enable(gl.DEPTH_TEST);

    gl.clearColor(0.12, 0.12, 0.18, 1.0);
    gl.clearDepth(1)

    //===== LOAD SHADERS =====//
    //  Load shaders and initialize attribute buffers
    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // reloadCanvas();

    //===== HANDLE FILE UPLOAD =====//
    loader = document.getElementById("loader");
    let previewCanvas = document.getElementById('previewCanvas');
    let context = previewCanvas.getContext('2d');

    document.getElementById('fileInput').addEventListener('change', function(e) {
        let img = new Image();
        img.src = URL.createObjectURL(e.target.files[0]);

        // Start loader animation
        loader.classList.add("show");

        img.onload = function() {
            previewCanvas.width = img.width;
            previewCanvas.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);
            imgData = context.getImageData(0, 0, previewCanvas.width, previewCanvas.height);

            reloadCanvas();

            console.log(imgData);
        };

    }, false);

    //===== ADD EVENT LISTENERS =====//
    document.getElementById("mapRes").value = sampleStep;

    let toggleWire = document.getElementById("toggleWire")
    toggleWire.addEventListener("click", () => {
        isWire = !isWire;
        toggleWire.innerHTML = isWire ? "Disable Wireframe" : "Enable Wireframe";
    });

    let toggleRot = document.getElementById("toggleRot");
    toggleRot.addEventListener("click", () => {
        isRot = !isRot;
        toggleRot.innerHTML = isRot ? "Disable Rotation" : "Enable Rotation";
    });

    let mapRes = document.getElementById("mapRes");
    mapRes.addEventListener("change", e => {
        sampleStep = e.target.value;
    });
}

function setupGLAttrib(buffer, arrData, attribName, chunkSize) {
    buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(arrData), gl.STATIC_DRAW);

    var attrib = gl.getAttribLocation(program, attribName);
    gl.vertexAttribPointer(attrib, chunkSize, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(attrib);
}

var renderId = 0;
function reloadCanvas() {
    //===== DELETE PREVIOUS BUFFERS =====//
    gl.deleteBuffer(nBuffer);
    gl.deleteBuffer(cBuffer);
    gl.deleteBuffer(vBuffer);


    //===== CREATE GEOMETRY ======//
    constructPlane();

    //===== CREATE BUFFERS =====//
    // normals

    // setupGLAttrib(nBuffer, norms, "vNormal", 3);
    setupGLAttrib(cBuffer, cols, "vColor", 4);
    setupGLAttrib(vBuffer, verts, "vPosition", 4);

    transMatLoc = gl.getUniformLocation(program, "transMatrix");
    viewMatLoc = gl.getUniformLocation(program, "viewMatrix");
    projMatLoc = gl.getUniformLocation(program, "projMatrix");

    render(++renderId);
    setTimeout(() => {
        loader.classList.remove("show");
    }, 200);
}

// See [https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Animating_objects_with_WebGL]
let lastRender = 0;
var render = (id) => {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let now = Date.now();
    if (isRot) {
        phi += (now - lastRender) * 0.001;
        // theta += 0.01;
    }
    lastRender = now;

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

    let drawMode = isWire ? gl.LINE_LOOP : gl.TRIANGLES;

    if (isWire) {
        for (let i = 0; i < numVertices; i += 6) {
            gl.drawArrays(drawMode, i, 6);
        }
    }
    else {
        gl.drawArrays(drawMode, 0, numVertices)
    }

    // Stop condition
    if (id == renderId) {
        window.requestAnimationFrame(() => render(id));
    }
}