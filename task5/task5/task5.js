"use strict";

var canvas;
var gl;

var numVertices = 0;

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

var vertices = [
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

    // Window 1
    vec4(-0.501, 0.15, 0.15, 1.0),      // 13
    vec4(-0.501, -0.15, 0.15, 1.0),      // 14
    vec4(-0.501, -0.15, -0.15, 1.0),      // 15
    vec4(-0.501, 0.15, -0.15, 1.0),      // 16
];

// Catppuccin color scheme
function colorSphere() {
    colorCube();
    // quad(1, 0, 3, 2)
    // for(let i = 0; i < vertices.length; i++)
    // {
    //     verts.push(vertices[a]);
    //     cols.push(vec4(1, 1, 1, 1));
    //     norms.push(vec3(0, 0, 0));
    // }
    // numVertices = vertices.length*3;
}

function colorCube() {
    // Base
    quad(1, 0, 3, 2, vec4(1, 1, 1, 1));
    quad(2, 3, 7, 6, vec4(1, 1, 1, 1));
    quad(3, 0, 4, 7, vec4(1, 1, 1, 1));
    quad(4, 5, 6, 7, vec4(1, 1, 1, 1));
    quad(5, 4, 0, 1, vec4(1, 1, 1, 1));

    // Windows
    quad(9, 10, 11, 12, vec4(1, 1, 1, 1));
    quad(13, 14, 15, 16, vec4(1, 1, 1, 1));
}

function quad(a, b, c, d, col) {
    var t1 = subtract(vertices[b], vertices[a]);
    var t2 = subtract(vertices[c], vertices[b]);
    var normal = cross(t1, t2);
    var normal = vec3(normal);

    verts.push(vertices[a]);
    cols.push(col);
    norms.push(vertexColors[normal]);

    verts.push(vertices[b]);
    cols.push(col);
    norms.push(vertexColors[normal]);

    verts.push(vertices[c]);
    cols.push(col);
    norms.push(vertexColors[normal]);

    verts.push(vertices[a]);
    cols.push(col);
    norms.push(vertexColors[normal]);

    verts.push(vertices[c]);
    cols.push(col);
    norms.push(vertexColors[normal]);

    verts.push(vertices[d]);
    cols.push(col);
    norms.push(vertexColors[normal]);
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

    //===== CREATE GEOMETRY ======//
    colorSphere();

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
        const speed = 0.1;
        if (isRot) {
            if(rotX.checked) rX += speed;
            if(rotY.checked) rY += speed;
            if(rotZ.checked) rZ += speed;
            if(rotP.checked) { rX += speed; rY += speed; rZ += speed; }
        }
    }, 0.1);

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
    gl.drawArrays(gl.TRIANGLES, 0, numVertices);

    requestAnimFrame(render);
}
