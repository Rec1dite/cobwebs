var gl;
var points;
window.onload = function init()
{
    var canvas = document.getElementById("gl-canvas");
    
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("Cannot obtain WebGL"); }

    const roofVs = [-1, 0.25, 0, 1, 1, 0.25]
    const baseVs = [
        -0.75, -1,
        -0.25, -1,
        -0.75, 0.25,
        -0.25, -0.4,
        0.75, 0.25,
        0.25, -0.4,
        0.75, -1,
        0.25, -1,
    ];
    const doorVs = [-0.2, -0.95, -0.2, -0.45, 0.25, -1, 0.25, -0.4]

    const vs = roofVs.concat(baseVs).concat(doorVs);

    cs = [
        1, 0, 1, 1,
        1, 0, 0, 1,
        1, 1, 0, 1,
    ]
    cs = cs.concat(cs).concat(cs).concat(cs).concat(cs);

    // Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor( 0.9, 0.95, 1.0, 1.0 );
    
    // Load shaders and initialize attribute buffers
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    render(vs, cs, [
        roofVs.length/2,
        baseVs.length/2,
        doorVs.length/2
    ], gl.TRIANGLE_STRIP, program);
};

// Possible options:
// POINTS, LINES, LINE_STRIP, LINE_LOOP, TRIANGLES, TRIANGLE_STRIP, TRIANGLE_FAN
function render(verts, cols, splits, mode, program) {
    var vs = new Float32Array(verts);
    var cs = new Float32Array(cols);

    //===== VERTEX SHADER =====//
    // Load the data into the GPU
    var bufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
    gl.bufferData(gl.ARRAY_BUFFER, vs, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    //===== FRAGMENT SHADER =====//
    // Load the data into the GPU
    var cBufferId = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBufferId);
    gl.bufferData(gl.ARRAY_BUFFER, cs, gl.STATIC_DRAW);

    // Associate our shader variables with our data buffer
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    gl.clear(gl.COLOR_BUFFER_BIT);

    let offset = 0;
    for(let i in splits) {
        gl.drawArrays(mode, offset, splits[i]);
        offset += splits[i];
    }
}
