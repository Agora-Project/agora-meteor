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

let vertexShaderSource = "\
attribute vec2 in_pos;\
void main(void) {\
    gl_Position = vec4(in_pos, 0.0, 1.0);\
}";

let fragmentShaderSource ="\
precision mediump float;\
void main() {\
    gl_FragColor = vec4(1.0);\
}";

Template.webglView.onRendered(function() {
    let canvas = $(".gl-viewport");
    let gl = canvas[0].getContext('experimental-webgl');
    
    this.isDestroyed = false;
    let sizeDirty = true;
    
    $(window).resize(function() {
        sizeDirty = true;
    });
    
    let template = this;
    let render = function() {
        if (template.isDestroyed) {
            return;
        }
        
        if (sizeDirty) {
            canvas[0].width = canvas.width();
            canvas[0].height = canvas.height();
            sizeDirty = false;
        }
        
        gl.viewport(0, 0, canvas[0].width, canvas[0].height);
        gl.clearColor(0.0, 0.192, 0.325, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        window.requestAnimationFrame(render);
    }
    
    window.requestAnimationFrame(render);
});

Template.webglView.onDestroyed(function() {
    $(window).off('resize'); //Destroy resize callbacks.
    this.isDestroyed = true;
});
