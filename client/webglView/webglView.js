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

Template.webglView.onRendered(function() {
    let canvas = $(".gl-viewport");
    let gl = canvas[0].getContext('experimental-webgl');

    gl.clearColor(0.0, 0.192, 0.325, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    this.canvas = canvas;
    this.gl = gl;
});

Template.webglView.onDestroyed(function() {
    delete this.canvas;
    delete this.gl;
});
