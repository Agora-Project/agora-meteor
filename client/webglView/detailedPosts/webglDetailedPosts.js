Template.webglDetailedPost.onCreated(function() {
    let parentView = this.view.parentView;
    while (parentView.templateInstance === undefined) {
        parentView = parentView.parentView;
    }
    this.parent = parentView.templateInstance();
});

Template.webglDetailedPost.onRendered(function() {
    let div = $('#gl-detailed-post-' + this.data._id);
    div.fadeIn(200);
});

Template.webglDetailedPost.events({
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

WebGLDetailedPosts = function() {
    //Collection of currently visible detailed posts.
    let posts = new Mongo.Collection(null);
    
    let remove = function(post) {
        let div = $('#gl-detailed-post-' + post._id);
        div.fadeOut(100, function() {
            posts.remove(post);
        });
    };
    
    this.update = function(camera) {
        //Update visible posts.
        if (camera.getScale() < 767.0) {
            posts.find({}).forEach(remove);
        }
        else {
            Posts.find({}).forEach(function(post) {
                if (posts.findOne(post)) {
                    //Remove post if it is no longer visible.
                    if (!camera.isPointVisible(post.defaultPosition)) {
                        remove(post);
                    }
                }
                else {
                    //Add post if it is visible.
                    if (camera.isPointVisible(post.defaultPosition)) {
                        posts.insert(post);
                    }
                }
            });
        }
        
        //Update post positions.
        posts.find({}).forEach(function(post) {
            let div = $('#gl-detailed-post-' + post._id);
            let pos = camera.toScreen(post.defaultPosition);
            div.css('left', pos.x - div.outerWidth()/2);
            div.css('top', pos.y - div.outerHeight()/2);
        });
    };
    
    this.find = function() {
        return posts.find({});
    };
};
