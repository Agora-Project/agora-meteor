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
    console.log(this.data._id);
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
    
    this.update = function(camera) {
        //Update visible posts.
        if (camera.getScale() < 512.0) {
            posts.remove({});
        }
        else {
            Posts.find({}).forEach(function(post) {
                if (posts.findOne(post)) {
                    //Remove post if it is no longer visible.
                    if (!camera.isPointVisible(post.defaultPosition)) {
                        posts.remove(post);
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
        
    };
    
    this.find = function() {
        return posts.find({});
    };
};
