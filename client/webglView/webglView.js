/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let subscription = this.subscribe('abstractPosts', Date.now());
    let template = this;
    
    this.autorun(function() {
        if (subscription.ready()) {
            let posts = Posts.find({});
            
            posts.observe({
                added: function(post) {
                },
                removed: function(post) {
                }
            });
        }
    });
});

let VERT_SHADER_SOURCE = "\
attribute vec2 in_pos;\
void main(void) {\
    gl_Position = vec4(in_pos, 0.0, 1.0);\
}";

let FRAG_SHADER_SOURCE ="\
precision mediump float;\
void main() {\
    gl_FragColor = vec4(1.0);\
}";

let loadShader = function(gl, source, type) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw gl.getShaderInfoLog(shader);
    }
    return shader;
}

Template.webglView.onRendered(function() {
    let canvas = $(".gl-viewport");
    let gl = canvas[0].getContext('experimental-webgl');
    
    //Set up resize callback
    this.isDestroyed = false;
    let sizeDirty = true;
    
    $(window).resize(function() {
        sizeDirty = true;
    });
    
    //Set up shader program
    let vertShader = loadShader(gl, VERT_SHADER_SOURCE, gl.VERTEX_SHADER);
    let fragShader = loadShader(gl, FRAG_SHADER_SOURCE, gl.FRAGMENT_SHADER);
    let shader = gl.createProgram();
    gl.attachShader(shader, vertShader);
    gl.attachShader(shader, fragShader);
    gl.linkProgram(shader);
    if (!gl.getProgramParameter(shader, gl.LINK_STATUS)) {
        throw gl.getProgramInfoLog(shader);
    }
    gl.useProgram(shader);
    
    //Begin animating
    let template = this;
    let render = function() {
        if (template.isDestroyed) {
            return;
        }
        
        if (sizeDirty) {
            canvas[0].width = canvas.width();
            canvas[0].height = canvas.height();
            gl.viewport(0, 0, canvas[0].width, canvas[0].height);
            sizeDirty = false;
        }
        
        gl.clearColor(0.0, 0.192, 0.325, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        window.requestAnimationFrame(render);
    }
    
    window.requestAnimationFrame(render);
});

Template.webglView.onDestroyed(function() {
    $(window).off('resize'); //Destroy resize callback
    this.isDestroyed = true;
});
