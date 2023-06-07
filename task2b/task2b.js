"use strict";

var canvas;
var gl;

var numVertices = 0;
var numArrows = 0;

// The final lists that are sent to the gpu buffers
var verts = [];
var cols = [];
var arrows = [];
var arrowTips = [];
var arrowCols = [];

var imgData = null;

var near = 0.01;
var far = -10;
var radius = 1.0;
var theta = 90;
var phi = 0;

var isRot = true;
var isWire = false;
var isNorms = true;

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
let tiltZ = 0;
let tiltX = 0;

var sampleStep = 1.0;

function getPixIndex(x, z, sampleStep, width) {
    return 4 * (x * sampleStep + z * sampleStep * width);
}

function constructPlane() {
    if (imgData == null) { return; }

    // Reset lists
    verts = [];
    arrows = [];
    arrowTips = [];
    arrowCols = [];
    cols = [];
    numVertices = 0;
    numArrows = 0;

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

function clamp(x, min, max) {
    return Math.min(Math.max(x, min), max);
}

function addSquare(x, z, y1, y2, y3, y4, yscale, xzScale) {
    const sx = xzScale*x;
    const sz = xzScale*z;

    const col1 = [1, 0, 0];
    const col2 = [0, 0, 1];
    const arrowCol = [1, 1, 0];

    // Calculate normal
    let v1 = vec3(sx, yscale*y1, sz);
    let v2 = vec3(sx, yscale*y2, sz+xzScale);
    let v3 = vec3(sx+xzScale, yscale*y3, sz+xzScale);
    let v4 = vec3(sx+xzScale, yscale*y4, sz);

    const normScale = 0.01*Math.sqrt(sampleStep);
    let normal1 = scale(normScale, normalize(cross(subtract(v2, v1), subtract(v3, v1))));
    let normal2 = scale(normScale, normalize(cross(subtract(v3, v1), subtract(v4, v1))));

    // Calculate center of first triangle
    let center1 = scale(0.33, add(add(v1, v2), v3));
    let center2 = scale(0.33, add(add(v1, v3), v4));

    arrows.push(...center1, 1);
    arrows.push(...add(center1, normal1), 1);
    arrows.push(...center2, 1);
    arrows.push(...add(center2, normal2), 1);

    arrowTips.push(...add(center2, normal2), 1);
    arrowTips.push(...add(center2, normal2), 1);

    for (let i = 0; i < 6; i++) {
        arrowCols.push(...arrowCol, 1);
    }

    numArrows += 4;

    // Triangle 1
    verts.push(...v1, 1);
    verts.push(...v2, 1);
    verts.push(...v3, 1);

    for (let i = 0; i < 3; i++) {
        cols.push(...col1, 1);
    }

    // Triangle 2
    verts.push(...v1, 1);
    verts.push(...v3, 1);
    verts.push(...v4, 1);

    for (let i = 0; i < 3; i++) {
        cols.push(...col2, 1);
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
    sampleStep = 1.0;

    document.getElementById('fileInput').addEventListener('change', function(e) {
        // Start loader animation
        loader.classList.add("show");

        let img = new Image();
        img.src = URL.createObjectURL(e.target.files[0]);

        img.onload = function() {
            previewCanvas.width = img.width;
            previewCanvas.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);
            imgData = context.getImageData(0, 0, previewCanvas.width, previewCanvas.height);

            reloadCanvas();
        };

    }, false);

    //===== ADD EVENT LISTENERS =====//
    let mapRes = document.getElementById("mapRes");
    mapRes.value = sampleStep;

    let toggleNorms = document.getElementById("toggleNorms")
    toggleNorms.addEventListener("click", () => {
        isNorms = !isNorms;
        toggleNorms.innerHTML = isNorms ? "Disable Normals" : "Enable Normals";
    });

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

    mapRes.addEventListener("change", e => {
        sampleStep = clamp(e.target.value, 1, 100);
    });

    let zoomIn = document.getElementById("zoomIn");
    let zoomOut = document.getElementById("zoomOut");
    let tiltU = document.getElementById("tiltU");
    let tiltD = document.getElementById("tiltD");
    let tiltL = document.getElementById("tiltL");
    let tiltR = document.getElementById("tiltR");
    let tiltReset = document.getElementById("tiltReset");

    zoomIn.addEventListener("click", () => { radius -= 0.1; });
    zoomOut.addEventListener("click", () => { radius += 0.1; });

    tiltU.addEventListener("click", () => { tiltX -= 10; });
    tiltD.addEventListener("click", () => { tiltX += 10; });
    tiltL.addEventListener("click", () => { tiltZ += 10; });
    tiltR.addEventListener("click", () => { tiltZ -= 10; });
    tiltReset.addEventListener("click", () => { tiltX = 0; tiltZ = 0; });
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

    setupGLAttrib(cBuffer, cols.concat(arrowCols), "vColor", 4);
    setupGLAttrib(vBuffer, verts.concat(arrows).concat(arrowTips), "vPosition", 4);
    // setupGLAttrib(cBuffer, arrowCols, "vColor", 4);
    // setupGLAttrib(vBuffer, arrows, "vPosition", 4);

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
    }
    lastRender = now;

    camera = vec3(radius * Math.sin(phi), radius * Math.sin(theta),
        radius * Math.cos(phi));

    let transMat = mat4();
    // transMat = mult(transMat, scale([1, 1, 1, 1], [1, 1, 1, 1]));
    transMat = mult(transMat, rotate(rX, [1, 0, 0]));
    transMat = mult(transMat, rotate(rY, [0, 1, 0]));
    transMat = mult(transMat, rotate(rZ, [0, 0, 1]));

    // Rotate the up vector around the camera direction vector
    const dir = normalize(subtract(at, camera));
    const rotZMat = rotate(tiltZ, dir);
    const tiltUp = mult(rotZMat, vec4(up, 0)).splice(0, 3);
    const rotXMat = rotate(tiltX, cross(dir, up));
    const tiltCam = mult(rotXMat, vec4(camera, 0)).splice(0, 3);

    viewMat = lookAt(tiltCam, at, tiltUp);
    // projMat = ortho(left, right, bottom, ytop, near, far);
    projMat = perspective(90, canvas.width / canvas.height, near, far);

    gl.uniformMatrix4fv(transMatLoc, false, flatten(transMat));
    gl.uniformMatrix4fv(viewMatLoc, false, flatten(viewMat));
    gl.uniformMatrix4fv(projMatLoc, false, flatten(projMat));

    // Possible options:
    // POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN

    if (isWire) {
        for (let i = 0; i < numVertices; i += 6) {
            gl.drawArrays(gl.LINE_LOOP, i, 6);
        }
        if (isNorms) {
            for (let i = numVertices; i < numVertices+numArrows; i += 2) {
                gl.drawArrays(gl.LINES, i, 2);
            }
        }
    }
    else {
        gl.drawArrays(gl.TRIANGLES, 0, numVertices);
        if (isNorms) {
            gl.drawArrays(gl.LINES, numVertices, numArrows);
            gl.drawArrays(gl.POINTS, numVertices+numArrows, numArrows/2);
        }
    }

    // Stop condition
    if (id == renderId) {
        window.requestAnimationFrame(() => render(id));
    }
}