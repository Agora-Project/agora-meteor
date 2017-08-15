MainViewLayout = function(localPostPositions) {
    let layeredGrapher;

    this.init = function(postArray) {
        let posts = {};
        Posts.find({}, {fields: {'_id': 1, 'target': 1}}).forEach(function(post) {
            posts[post._id] = post;
        });
        layeredGrapher = new LayeredGrapher(posts);
        for (let id in posts) {
            let post = posts[id];
            localPostPositions.insert({_id: id, position: {x:post.x, y:post.y}, subtreeWidth: post.subtreeWidth});
        }
    };

    this.addPost = function(post) {

    };

    this.removePost = function(post) {

    };

    this.updatePost = function(id, fields) {

    };

}
