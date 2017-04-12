/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Template.webglView.onCreated(function() {
    let instance = this;
    
    this.onRendererReady = new Notifier();
    let onSubReady = new Notifier();
    
    let postCursor = Posts.find({});
    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    this.detailedPosts = new WebGLDetailedPosts(postCursor);
    
    Notifier.all(onSubReady, this.onRendererReady).onFulfilled(function() {
        //Perform initial setup
        instance.detailedPosts.setup();
        
        //Make update callback
        let isSetup = false;
        instance.postObserver = postCursor.observe({
            added: function(post) {
                if (isSetup) {
                    //insert into partition
                }
                
                instance.renderer.addPost(post);
            },
            removed: function(post) {
            }
        });
        isSetup = true;
        
        let t0 = performance.now();
        
        //Begin rendering
        let render = function() {
            if (instance.isDestroyed) {
                return;
            }
            
            let t1 = performance.now();
            let dt = (t1 - t0)/1000.0;
            
            instance.camera.step(dt);
            instance.renderer.render();
            instance.detailedPosts.update(instance.camera);
            window.requestAnimationFrame(render);
            t0 = t1;
        };
        
        window.requestAnimationFrame(render);
    });
});

Template.webglView.onRendered(function() {
    let instance = this;
    
    let canvas = $('.gl-viewport');
    
    this.getMousePos = function(event) {
        return {x:event.pageX, y:event.pageY - canvas.offset().top};
    };
    
    this.camera = new WebGLCamera(canvas);
    this.renderer = new WebGLRenderer(canvas, this.camera);
    this.onRendererReady.fulfill();
    
    $(window).resize(function() {
        instance.camera.resize();
        instance.renderer.resize();
    });
});

Template.webglView.helpers({
    detailedPosts: function() {
        return Template.instance().detailedPosts.find();
    }
});

Template.webglView.events({
    'mousedown, touchstart': function(event, instance) {
        instance.camera.mouseDown(instance.getMousePos(event), event.button);
    },
    'mousemove, touchmove': function(event, instance) {
        instance.camera.mouseMove(instance.getMousePos(event));
    },
    'mouseup, touchend': function(event, instance) {
        instance.camera.mouseUp(instance.getMousePos(event), event.button);
    },
    'mouseleave': function(event, instance) {
        //Stop dragging if we leave the canvas area. We can't see mouseup events if they are outside of the window.
        if ($('.gl-container').is(event.target)) {
            instance.camera.mouseUp(instance.getMousePos(event), 0);
        }
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
