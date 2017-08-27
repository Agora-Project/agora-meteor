MainViewLayout = function(localPostPositions) {

    let posts = []

    this.init = function(postArray) {
        posts = [];
        let graph = new LayeredGrapher.layoutGraph(postArray);
        for (let id in graph) {
            let post = graph[id];
            localPostPositions.insert({_id: id, position: {x: post.x, y: post.y}, subtreeWidth: post.subtreeWidth});
            posts.push(post);
        }
        return graph;
    };

    this.addPost = function(post) {
        let insertPostResults = LayeredGrapher.insertPost(posts, post);
        post = insertPostResults.post;
        localPostPositions.insert({_id: post._id, position: post.position, subtreeWidth: post.subtreeWidth});
        for (let updatedPost of insertPostResults.changedPosts) {
            localPostPositions.update({_id: updatedPost._id}, {$set: {position: {x: updatedPost.position.x, y: updatedPost.position.y}, subtreeWidth: updatedPost.subtreeWidth}});
        }
        posts.push(post);
        return post;
    };

    this.removePost = function(post) {

    };

    this.updatePost = function(id, fields) {

    };

}
