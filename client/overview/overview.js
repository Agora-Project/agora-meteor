/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.overview.onCreated(function() {
    let subscription = this.subscribe('abstractPosts', Date.now());
    
    this.autorun(function() {
        if (subscription.ready()) {
            let posts = Post.find({});
            
            posts.observe({
                added: function(post) {
                },
                removed: function(post) {
                }
            });
        }
    });
});

Template.overview.onRendered(function() {
    let canvas = $(".glview-viewport");
    let gl = canvas[0].getContext('experimental-webgl');

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    this.canvas = canvas;
    this.gl = gl;
});
