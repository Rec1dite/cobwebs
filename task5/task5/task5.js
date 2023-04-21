"use strict";

var canvas;
var gl;

var numVertices = 0;
var numVerticesHigh = 0;
var numVerticesLow = 0;

// The final lists that are sent to the gpu buffers
var verts = [];
var cols = [];
var norms = [];

var near = -1;
var far = 3;
var radius = 1.0;
var theta = 0.0;
var phi = 1.0;
var dr = 5.0 * Math.PI / 180.0;

var isRot = true;
var isLow = false;
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

let lat = 80;
let latLow = 0;
let latHigh = 0;
let lon = 120;
let r = 1;

// Calculates the <x, y, z> coords of a point on the sphere
function calcXYZ(i, j) {
    let latR = Math.PI / lat;
    let lonR = 2*Math.PI / lon;

    let x = Math.sin(latR*i) * Math.cos(lonR*j-Math.PI/2) * r;
    let y = Math.cos(latR*i) * Math.cos(lonR*j-Math.PI/2) * r;
    let z = Math.sin(lonR*j-Math.PI/2) * r;
    return [x, y, z];
}

function colorSphere(la, lo) {
    numVertices = 0;
    lat = la;
    lon = lo;

    drawCap(0, 1);
    for(let j = 1; j < lon/2-1; j++) {
        drawTriStrip(j);
    }
    drawCap(lon/2, lon/2-1);
}

// Constructs the caps at each end of the sphere
function drawCap(j, jn) {
    let c = 1;

    // Add pivot point
    let [x, y, z] = calcXYZ(0, j);
    verts.push(x, y, z, 1);
    cols.push(c, c, c, 1);

    // Add orbitors
    for(let i = 0; i <= lat*2; i++) {
        [x, y, z] = calcXYZ(i, jn);

        verts.push(x, y, z, 1);
        cols.push(1, 0, 0, 1);
        norms.push(x, y, z);
    }
}

// Draws a single latitudinal ribbon in the middle of the sphere
function drawTriStrip(j) {
    for(let i = 0; i <= lat*2; i++) {
        let [x1, y1, z1] = calcXYZ(i, j);
        let [x2, y2, z2] = calcXYZ(i, (j+1)%lon);

        let c = Math.abs(i/lat - 1);

        // i, j+1
        verts.push(x1, y1, z1, 1);
        cols.push(c, c, c, 1);
        norms.push(x1, y1, z1); // Norms == coords on sphere
        numVertices += 1;

        // i, 0
        verts.push(x2, y2, z2, 1);
        cols.push(c, c, c, 1);
        norms.push(x2, y2, z2);
        numVertices += 1;
    }
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

    //===== CREATE GEOMETRY ======//
    //high
    colorSphere(80, 120);
    numVerticesHigh = numVertices;
    latHigh = 80;

    //low
    colorSphere(8, 12);
    numVerticesLow = numVertices;
    latLow = 8;

    //===== CREATE BUFFERS =====//
    // normals
    var nBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(norms), gl.STATIC_DRAW );

    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

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

    document.getElementById("toggleRot").onclick = () => { isRot = !isRot; }
    let rotX = document.getElementById("rotX");
    let rotY = document.getElementById("rotY");
    let rotZ = document.getElementById("rotZ");
    let rotP = document.getElementById("rotP");

    setInterval(() => {
        const speed = 0.4;
        if (isRot) {
            if(rotX.checked) rX += speed;
            if(rotY.checked) rY += speed;
            if(rotZ.checked) rZ += speed;
            if(rotP.checked) { rX += speed; rY += speed; rZ += speed; }
        }
    }, 0.1);

    document.getElementById("toggleRes").onclick = () => {
        if (isLow) {
            isLow = false;
            document.getElementById("toggleRes").innerHTML = "Toggle Low Res";
        } else {
            isLow = true;
            document.getElementById("toggleRes").innerHTML = "Toggle High Res";
        }
    }

    // TODO
    let wire = document.getElementById("wire");
    wire.onchange = () => {
        isWire = wire.checked;
    }

    render();
}


var render = function () {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    camera = vec3(radius * Math.sin(phi), radius * Math.sin(theta),
        radius * Math.cos(phi));

    let transMat = mat4();
    // transMat = mult(transMat, scale([1, 1, 1, 1], [1, 1, 1, 1]));
    transMat = mult(transMat, rotate(rX, [1, 0, 0] ));
    transMat = mult(transMat, rotate(rY, [0, 1, 0] ));
    transMat = mult(transMat, rotate(rZ, [0, 0, 1] ));

    viewMat = lookAt(camera, at, up);
    projMat = ortho(left, right, bottom, ytop, near, far);

    gl.uniformMatrix4fv(transMatLoc, false, flatten(transMat));
    gl.uniformMatrix4fv(viewMatLoc, false, flatten(viewMat));
    gl.uniformMatrix4fv(projMatLoc, false, flatten(projMat));

    // Possible options:
    // POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN

    let capDrawMode = isWire ? gl.LINE_STRIP : gl.TRIANGLE_FAN;
    let midDrawMode = isWire ? gl.LINE_LOOP : gl.TRIANGLE_STRIP;

    if (isLow) {
        // High res vertices come at the beginning of the array,
        // so we need to offset by that amount
        let numCap = 2*(latLow+1);
        let numCapHigh = 2*(latHigh+1);
        let highOffset = 2*numCapHigh + numVerticesHigh;

        gl.drawArrays(capDrawMode, highOffset, numCap); //Cap
        gl.drawArrays(midDrawMode, highOffset + numCap, numVerticesLow); //Middle
        gl.drawArrays(capDrawMode, highOffset + numVerticesLow+numCap, numCap); //Cap
    }
    else
    {
        let numCap = 2*(latHigh+1);
        gl.drawArrays(capDrawMode, 0, numCap); //Cap
        gl.drawArrays(midDrawMode, numCap, numVerticesHigh); //Middle
        gl.drawArrays(capDrawMode, numVerticesHigh+numCap, numCap); //Cap
    }


    // gl.drawArrays(gl.POINTS, 0, numVertices);

    requestAnimFrame(render);
}
