MainViewLayout = function() {

    let localPostPositions = new Mongo.Collection(null);

    this.init = function(initPostArray) {
        for (let post of initPostArray) {
            localPostPositions.insert(post);
        }
        LayeredGrapher.layoutGraph(localPostPositions);
        return localPostPositions.find({}).fetch();
    };

    this.addPost = function(post) {
        return LayeredGrapher.insertPost(localPostPositions, post);
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
        localPostPositions.update({_id: id},{$set: fields});
    };

}
