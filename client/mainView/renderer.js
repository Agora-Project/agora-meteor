let VERT_SHADER_SOURCE = "\
uniform mat3 u_mat;\n\
uniform float u_point_size;\n\
attribute vec2 in_pos;\n\
attribute vec3 in_color;\n\
varying vec3 v_color;\n\
void main() {\n\
    gl_PointSize = u_point_size;\n\
    vec3 pos = vec3(in_pos, 1.0)*u_mat;\n\
    gl_Position = vec4(pos.xy, 0.0, 1.0);\n\
    v_color = in_color;\n\
}";

//Looks complicated and horrible, but this just draws circles.
let POST_FRAG_SHADER_SOURCE = "\
#ifdef GL_OES_standard_derivatives\n\
#extension GL_OES_standard_derivatives : enable\n\
#endif\n\
precision mediump float;\n\
varying vec3 v_color;\n\
void main() {\n\
    float alpha = 1.0;\n\
    vec2 p = gl_PointCoord*2.0 - 1.0;\n\
    float r = dot(p, p);\n\
#ifdef GL_OES_standard_derivatives\n\
    float delta = fwidth(r);\n\
    alpha = smoothstep(1.0, 1.0 - delta, r);\n\
#else\n\
    if (r > 1.0) {\n\
        discard;\n\
    }\n\
#endif\n\
    gl_FragColor = vec4(v_color, alpha);\n\
}";

let LINK_FRAG_SHADER_SOURCE = "\
precision mediump float;\n\
void main() {\n\
    gl_FragColor = vec4(1.0);\n\
}";

let loadShader = function(gl, source, type) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.log(gl.getShaderInfoLog(shader));
    }
    return shader;
};

let linkShaderProgram = function(gl, vertShader, fragShader) {
    let shader = gl.createProgram();
    gl.attachShader(shader, vertShader);
    gl.attachShader(shader, fragShader);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        console.log(gl.getProgramInfoLog(shader));
        return null;
    }
    shader.locMat = gl.getUniformLocation(shader, 'u_mat');
    return shader;
};

MainViewRenderer = function(camera, localPostPositions) {
    let self = this;
    let canvas, gl;
    let postShader, linkShader;

    let postCount = 0;
    let postIndices = {}; //Map of post IDs to their data indices.
    let linkCount = 0;
    let pointSize = 0.0;

    this.construct = function(initCanvas) {
        canvas = initCanvas;
        gl = canvas[0].getContext('experimental-webgl');

        gl.clearColor(0.0, 0.192, 0.325, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.getExtension('OES_standard_derivatives');

        //Set up shader program
        let vertShader = loadShader(gl, VERT_SHADER_SOURCE, gl.VERTEX_SHADER);
        let postFragShader = loadShader(gl, POST_FRAG_SHADER_SOURCE, gl.FRAGMENT_SHADER);
        let linkFragShader = loadShader(gl, LINK_FRAG_SHADER_SOURCE, gl.FRAGMENT_SHADER);
        postShader = linkShaderProgram(gl, vertShader, postFragShader);
        linkShader = linkShaderProgram(gl, vertShader, linkFragShader);

        postShader.locSize = gl.getUniformLocation(postShader, 'u_point_size');

        //Set up post vertex buffer
        let MAX_POSTS = 65536;

        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, MAX_POSTS*20, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 8);

        //Set up link index buffer
        let MAX_LINKS = 131072;

        let ebo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ebo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, MAX_LINKS*4, gl.DYNAMIC_DRAW);
    }

    this.render = function() {
        gl.viewport(0, 0, canvas[0].width, canvas[0].height);

        let matrix = camera.getMatrix();
        pointSize = camera.getScale()/6.0 + 2;

        gl.useProgram(postShader);
        gl.uniformMatrix3fv(postShader.locMat, false, matrix);
        gl.uniform1f(postShader.locSize, pointSize);
        gl.useProgram(linkShader);
        gl.uniformMatrix3fv(linkShader.locMat, false, matrix);

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(linkShader);
        gl.drawElements(gl.LINES, linkCount*2, gl.UNSIGNED_SHORT, 0);

        if (pointSize > 2.0) {
            gl.useProgram(postShader);
            gl.drawArrays(gl.POINTS, 0, postCount);
        }
    };

    this.init = function(postArray) {
        //Could be optimized by uploading one big buffer to the GPU.
        for (let post of postArray) {
            self.addPost(post);
        }
    };

    let addLink = function(source, target) {
        gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, linkCount*4, new Int16Array([source, target]));
        linkCount++;
    };

    this.addPost = function(post) {
        let user = Meteor.users.findOne({_id: Meteor.userId()});
        let buffer;
        if (postIsSeen(post)) {

            buffer = [post.position.x, post.position.y, 1.0, 1.0, 1.0];
        } else buffer = [post.position.x, post.position.y, 1.0, 0.843, 0];
        gl.bufferSubData(gl.ARRAY_BUFFER, postCount*20, new Float32Array(buffer));

        if (post.target) {
            let target = postIndices[post.target];
            if (target !== undefined) {
                addLink(postCount, target);
            }
        }

        for (let sourceID of post.replies) {
            let source = postIndices[sourceID];
            if (source !== undefined) {
                addLink(source, postCount);
            }
        }

        postIndices[post._id] = postCount;
        postCount++;
    };

    this.removePost = function(post) {
        let index = postIndices[post._id];

        if (index === undefined) {
            return;
        }

        //Very simple hack to delete posts. Set post position to NaN so it doesn't draw.
        //Also affects links because they use the same post vertex data.
        //Much easier than shuffling around posts to maintain buffer density.
        gl.bufferSubData(gl.ARRAY_BUFFER, index*20, new Float32Array([NaN, NaN, NaN, NaN, NaN]));

        //Make sure to forget the old index.
        delete postIndices[post._id];

        //TODO: Make this more sophisticated (stop using this hack).
        //Idea: Could count number of post deletions, and remake graph from scratch if there are too many.
        //Probably too slow for large graphs (>10000 posts)
    };

    this.updatePost = function(id, fields) {
        /*if (fields.defaultPosition) {
            let index = postIndices[id]*20;
            let pos = fields.defaultPosition;
            //gl.bufferSubData(gl.ARRAY_BUFFER, index, new Float32Array([pos.x, pos.y]));
        }*/
    };
    this.seePost = function(id) {
        let index = postIndices[id]*20 + 8;
        gl.bufferSubData(gl.ARRAY_BUFFER, index, new Float32Array([1, 1, 1]));
    }
};
