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

function constructPlane() {
    if (imgData == null) { return; }
    // let w = imgData.width;
    // let h = imgData.height;
    let w = 20;
    let h = 20;

    let scale = 2.0 / w;
    for (let x = 0; x < w; x++) {

        // Draw strip
        for (let z = 0; z < h; z++) { 

            // Get pixel color
            let pixIndex = 4*(x + z*w);
            let r = imgData.data[pixIndex] / 255.0;
            let g = imgData.data[pixIndex+1] / 255.0;
            let b = imgData.data[pixIndex+2] / 255.0;
            r = g = b = 1;

            addSquare(scale*(x-w/2), 0, scale*(z-h/2), scale, r, g, b);
        }
    }
}

function addSquare(x, y, z, scale, r, g, b) {
    verts.push(x, y, z, 1);

    cols.push(r, g, b, 1);
    norms.push(x, y, z);
    numVertices += 1;

    verts.push(x+scale, y, z, 1);

    cols.push(r, g, b, 1);
    norms.push(x, y, z);
    numVertices += 1;
}

window.onload = function init() {

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

    //===== CREATE GEOMETRY ======//
    constructPlane();

    //===== CREATE BUFFERS =====//
    // normals
    var nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(norms), gl.STATIC_DRAW);

    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // colors
    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(cols), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    // vertices
    var vBuffer = gl.createBuffer();
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

    theta = 10;
    render();
}


var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    phi += 0.001;
    theta += 0.001;

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

    let drawMode = gl.LINE_STRIP;
    gl.drawArrays(drawMode, 0, numVertices)

    requestAnimFrame(render);
}
