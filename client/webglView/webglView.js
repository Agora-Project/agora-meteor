/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let subscription = this.subscribe('abstractPosts', Date.now());
    
    this.autorun(function() {
        if (subscription.ready()) {
            let posts = Posts.find({});
            
            posts.observe({
                added: function(post) {
                    console.log(post);
                },
                removed: function(post) {
                }
            });
        }
    });
});

Template.webglView.onRendered(function() {
    let canvas = $(".gl-viewport");
    let gl = canvas[0].getContext('experimental-webgl');

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    this.canvas = canvas;
    this.gl = gl;
});
