MainViewLayout = function(localPostPositions) {

    this.init = function() {
        let graph = new LayeredGrapher.layoutGraph(localPostPositions);
    };

    this.addPost = function(post) {
        let posts = localPostPositions.find({});
        let insertPostResults = LayeredGrapher.insertPost(posts, post);
        post = insertPostResults.post;
        localPostPositions.insert(post);
        for (let updatedPost of insertPostResults.changedPosts) {
            localPostPositions.update({_id: updatedPost._id}, {$set: {position: {x: updatedPost.position.x, y: updatedPost.position.y}, subtreeWidth: updatedPost.subtreeWidth}});
        }
        return post;
    };

    this.removePost = function(post) {
        let posts = localPostPositions.find({});
        localPostPositions.remove({_id: post._id});
        let removePostResults = LayeredGrapher.removePost(posts, post._id);
        if (!removePostResults) return post;
        for (let updatedPost of removePostResults.changedPosts) {
            localPostPositions.update({_id: updatedPost._id}, {$set: {position: {x: updatedPost.position.x, y: updatedPost.position.y}, subtreeWidth: updatedPost.subtreeWidth}});
        }
        return removePostResults.post;
    };

    this.updatePost = function(id, fields) {

    };

}
