/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

/**
 * The main view consists of five basic modules:
 *
 *    * Main Module (main.js)
 *          This file; the primary entry-point and handler for the other four modules.
 *          Callbacks are mostly set up and destroyed in this module.
 *
 *    * Camera (camera.js)
 *          Stores client view state (position, zoom, screen boundaries).
 *          Also handles camera input.
 *
 *    * Partitioner (partitioner.js)
 *          An optimization module. Exposes a number of efficient spatial queries.
 *          Depends on the camera.
 *
 *    * Renderer (renderer.js)
 *          Handles the WebGL context and performs canvas rendering.
 *          Depends on the camera.
 *
 *    * Detailed Posts (detailed/detailed.js)
 *          Handles the creation of template-based HTML posts.
 *          These detailed posts appear when the camera is sufficiently zoomed.
 *          Depends on the camera and partitioner.
 *
 */

Template.mainView.onCreated(function() {
    let instance = this;

    //Declare modules.
    this.camera = new MainViewCamera();
    this.partitioner = new MainViewPartitioner(this.camera);
    this.renderer = new MainViewRenderer(this.camera);
    this.detailedPosts = new MainViewDetailedPosts(this.camera, this.partitioner);
    let modules = [this.camera, this.partitioner, this.renderer, this.detailedPosts];

    //Set up async notifiers.
    this.onRendered = new Notifier();
    let onSubReady = new Notifier();

    this.subscribe('abstractPosts', {onReady: onSubReady.fulfill});
    this.replyTarget = new ReactiveVar();
    this.isSizeDirty = true;

    Notifier.all(onSubReady, this.onRendered).onFulfilled(function() {
        //Perform initial setup.
        let postCursor = Posts.find({});
        let initPostArray = postCursor.fetch();
        
        for (let module of modules) {
            module.init(initPostArray);
        }

        //Callback for added/removed posts.
        let isLive = false;
        instance.postObserver = postCursor.observe({
            added: function(post) {
                if (isLive) {
                    for (let module of modules) {
                        module.addPost(post);
                    }
                }
            },
            removed: function(post) {
                for (let module of modules) {
                    module.removePost(post);
                }
            }
        });
        isLive = true;

        //Callback for changed post positions.
        instance.changeObserver = Posts.find({}, {fields: {'defaultPosition': 1}}).observeChanges({
            changed: function(id, fields) {
                let pos = fields.defaultPosition;
                for (let module of modules) {
                    module.updatePostPosition(id, pos);
                }
            }
        });

        let t0 = performance.now();
        
        //Begin rendering.
        let render = function() {
            if (instance.isDestroyed) {
                return;
            }

            let t1 = performance.now();
            let dt = (t1 - t0)/1000.0;

            instance.canvas[0].width = instance.canvas.width();
            instance.canvas[0].height = instance.canvas.height();

            instance.camera.step(dt);
            instance.renderer.render();
            instance.detailedPosts.update();
            window.requestAnimationFrame(render);
            t0 = t1;
        };

        window.requestAnimationFrame(render);
    });
});

Template.mainView.onRendered(function() {
    let instance = this;

    //Initialize everything that depends on the canvas existing.
    let canvas = $('#main-viewport');
    
    this.canvas = canvas;
    this.camera.construct(canvas);
    this.renderer.construct(canvas);
    this.onRendered.fulfill();
    
    this.getMousePos = function(event) {
        return {x:event.pageX, y:event.pageY - canvas.offset().top};
    };
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
    this.changeObserver.stop();
    this.isDestroyed = true;
});

Template.mainReply.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
    
    this.errorMessage = new ReactiveVar();
});

Template.mainReply.onRendered(function() {
    let instance = this;
    let target = this.parent.replyTarget.get();
    
    let div = $('#main-reply');
    div.css('top', -div.outerHeight());
    
    let titleInput = $('#main-reply-title');
    let contentInput = $('#main-reply-textarea');
    
    let hasContent = function() {
        return titleInput.val().length > 0 || contentInput.val().length > 0;
    };
    
    $('#main-reply-submit-button').click(function(event) {
        let post = {
            title: titleInput.val(),
            content: contentInput.val(),
            target: target._id
        };

        Meteor.call("insertPost", post, function(error) {
            if (error) {
                //Display error message to user.
                instance.errorMessage.set(error.reason);
            }
            else {
                //Don't delete user's work unless it posts successfully.
                instance.parent.replyTarget.set();
            }
        });
    });

    $('#main-reply-cancel-button').click(function(event) {
        if (!hasContent() || confirm('You have an unfinished post. Are you sure you want to cancel?')) {
            instance.parent.replyTarget.set();
        }
    });
    
    $(window).on('beforeunload', function(event) {
        if (hasContent()) {
            return 'You have an unfinished post. Are you sure you want to close Agora?';
        }
    });
});

Template.mainReply.helpers({
    errorMessage: function() {
        return Template.instance().errorMessage.get();
    }
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

Template.mainReply.onDestroyed(function() {
    $(window).off('beforeunload');
});
