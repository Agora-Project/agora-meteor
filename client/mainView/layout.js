MainViewLayout = function(localPostPositions) {

    let posts = []

    this.init = function(postArray) {
        posts = [];
        let graph = new LayeredGrapher.layoutGraph(postArray);
        for (let id in graph) {
            let post = graph[id];
            localPostPositions.insert({_id: id, position: {x:post.x, y:post.y}, subtreeWidth: post.subtreeWidth});
            posts.push(post);
        }
        return graph;
    };

    this.addPost = function(post) {
        post = LayeredGrapher.insertPost(posts, post);
        localPostPositions.insert({_id: post._id, position: post.position, subtreeWidth: post.subtreeWidth});
        posts.push(post);
        return post;
    };

    this.removePost = function(post) {

    };

    this.updatePost = function(id, fields) {

    };

}
