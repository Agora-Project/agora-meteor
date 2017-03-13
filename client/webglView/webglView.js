/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let instance = this;
    
    this.onRendererReady = new Notifier();
    let onSubReady = new Notifier();
    
    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    
    Notifier.all(onSubReady, this.onRendererReady).onFulfilled(function() {
        instance.postObserver = Posts.find({}).observe({
            added: function(post) {
                instance.renderer.addPost(post);
            },
            removed: function(post) {
            }
        });
        
        let t0 = performance.now();
        
        //Begin rendering
        let render = function() {
            if (instance.isDestroyed) {
                return;
            }
            
            let t1 = performance.now();
            let dt = (t1 - t0)/1000.0;
            //instance.camera.step(dt);
            instance.renderer.render();
            window.requestAnimationFrame(render);
            t0 = t1;
        };
        
        window.requestAnimationFrame(render);
    });
});

Template.webglView.onRendered(function() {
    let instance = this;
    
    let canvas = $('.gl-viewport');
    this.camera = new Camera(canvas);
    this.renderer = new WebGLRenderer(canvas, this.camera);
    this.onRendererReady.fulfill();
    
    $(window).resize(function() {
        instance.camera.resize();
        instance.renderer.resize();
    });
});

Template.webglView.events({
    'mousedown, touchstart': function(event, instance) {
        instance.camera.mouseDown({x:event.offsetX, y:event.offsetY});
    },
    'mousemove, touchmove': function(event, instance) {
        instance.camera.mouseMove({x:event.offsetX, y:event.offsetY});
    },
    'mouseup, mouseout, touchend': function(event, instance) {
        instance.camera.mouseUp({x:event.offsetX, y:event.offsetY});
    },
    'wheel': function(event, instance) {
        instance.camera.mouseWheel(event.originalEvent.deltaY);
    }
});

Template.webglView.onDestroyed(function() {
    this.postObserver.stop();
    this.isDestroyed = true;
    $(window).off('resize');
});
