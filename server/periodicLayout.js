redoLayout = false;

Meteor.setInterval(function() {
    if (redoLayout) {
        let posts = {};
        Posts.find({}, {fields: {'_id': 1, 'target': 1}}).forEach(function(post) {
            posts[post._id] = post;
        });

        let grapher = new LayeredGrapher.layoutGraph(posts);

        for (let id in posts) {
            let post = posts[id];
            Posts.update({_id: id}, {$set: {defaultPosition: {x:post.x, y:post.y}, subtreeWidth: post.subtreeWidth}});
        }

        redoLayout = false;
    }
}, 1000*60*60); //Run every hour
