/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

/**
 * The WebGL view consists of five basic modules:
 *
 *    * Main Module (main.js)
 *          This file; the main entry-point and handler for the other four modules.
 *          Callbacks are mostly set up and destroyed in this module.
 *
 *    * Partitioner (partitioner.js)
 *          An optimization module. Exposes a number of efficient spatial queries.
 *      
 *    * Camera (camera.js)
 *          Stores client view state (position, zoom, screen boundaries).
 *          Also handles camera input.
 *
 *    * Renderer (renderer.js)
 *          Handles the WebGL context and performs canvas rendering.
 *          Depends on the camera.
 *      
 *    * Detailed Posts (detailed/detailed.js)
 *          Handles the creation of template-based HTML posts.
 *          These detailed posts appear when the camera is sufficiently zoomed.
 *          Depends on the partitioner and camera.
 *
 */
 
Template.mainView.onCreated(function() {
    let instance = this;
    
    this.onRendererReady = new Notifier();
    let onSubReady = new Notifier();
    
    let postCursor = Posts.find({});
    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    this.detailedPosts = new MainViewDetailedPosts(postCursor);
    this.replyTarget = new ReactiveVar();
    
    Notifier.all(onSubReady, this.onRendererReady).onFulfilled(function() {
        //Perform initial setup
        instance.detailedPosts.setup();
        
        //Callback for added/removed posts
        let isLive = false;
        instance.postObserver = postCursor.observe({
            added: function(post) {
                instance.renderer.addPost(post);
                
                //For posts added during runtime
                if (isLive) {
                    console.log('new post: ' + post._id);
                }
            },
            removed: function(post) {
            }
        });
        isLive = true;
        
        //Callback for changed post positions
        Posts.find({}, {fields: {'defaultPosition': 1}}).observeChanges({
            changed: function(id, fields) {
                let pos = fields.defaultPosition;
                console.log('new position: ' + id + ' ' + pos);
                
                //Need to update position in webgl renderer, partition, and detailed posts.
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
            
            instance.camera.step(dt);
            instance.renderer.render();
            instance.detailedPosts.update(instance.camera);
            window.requestAnimationFrame(render);
            t0 = t1;
        };
        
        window.requestAnimationFrame(render);
    });
});

Template.mainView.onRendered(function() {
    let instance = this;
    
    let canvas = $('#main-viewport');
    
    this.getMousePos = function(event) {
        return {x:event.pageX, y:event.pageY - canvas.offset().top};
    };
    
    this.camera = new MainViewCamera(canvas);
    this.renderer = new MainViewRenderer(canvas, this.camera);
    this.onRendererReady.fulfill();
    
    $(window).resize(function() {
        instance.camera.resize();
        instance.renderer.resize();
    });
});

Template.mainView.helpers({
    detailedPosts: function() {
        return Template.instance().detailedPosts.find();
    },
    replyTarget: function() {
        return Template.instance().replyTarget.get();
    }
});

Template.mainView.events({
    'mousedown, touchstart': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseDown(instance.getMousePos(event), event.button);
        }
    },
    'mousemove, touchmove': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseMove(instance.getMousePos(event));
        }
    },
    'mouseup, touchend': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseUp(instance.getMousePos(event), event.button);
        }
    },
    'mouseleave': function(event, instance) {
        //Stop dragging if we leave the canvas area. We can't see mouseup events if they are outside of the window.
        if (instance.camera && $('#main-container').is(event.target)) {
            instance.camera.mouseUp(instance.getMousePos(event), 0);
        }
    },
    'wheel': function(event, instance) {
        if (instance.camera) {
            instance.camera.mouseWheel(event.originalEvent.deltaY);
        }
    }
});

Template.mainView.onDestroyed(function() {
    this.postObserver.stop();
    this.isDestroyed = true;
    $(window).off('resize');
});

Template.mainReply.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.mainReply.onRendered(function() {
    let instance = this;
    //No idea why we need curValue here. get() should work on its own but it doesn't.
    let target = this.parent.replyTarget.get().curValue; 
    
    $('#main-reply-submit-button').click(function(event) {
        let post = {
            content: $('#main-reply-textarea').val(),
            target: target._id
        };
        
        Meteor.call("insertPost", post);
        instance.parent.replyTarget.set();
    });
    
    $('#main-reply-cancel-button').click(function(event) {
        instance.parent.replyTarget.set();
    });
});

Template.mainReply.events({
    'mousedown, touchstart, mousemove, touchmove, mouseup, touchend, wheel': function(event, instance) {
        if (instance.parent.camera.isDragging()) {
            //Prevents interaction while dragging.
            event.preventDefault();
        }
        else {
            //Prevent events from passing through posts into the WebGL canvas.
            event.stopImmediatePropagation();
        }
    }
});
