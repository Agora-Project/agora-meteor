MainViewLayout = function(localPostPositions) {

    this.init = function(postArray) {
        let graph = new LayeredGrapher.layoutGraph(postArray);
        for (let id in graph) {
            let post = graph[id];
            localPostPositions.insert({_id: id, position: {x:post.x, y:post.y}, subtreeWidth: post.subtreeWidth});
        }
        return graph;
    };

    this.addPost = function(post) {

    };

    this.removePost = function(post) {

    };

    this.updatePost = function(id, fields) {

    };

}
