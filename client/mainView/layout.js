/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

MainViewLayout = function() {
    localPostPositions = new Mongo.Collection(null);


    let finalizeResults = function(results, post) {
        let changedPosts = new Set();

        for (let id of results.changedPosts.values()) {
            let updatedPost = localPostPositions.findOne({id: id});
            if (!updatedPost) console.log("Updated Post not found: ", id);
            else changedPosts.add(updatedPost);
        }

        let finalPost = localPostPositions.findOne({id: results.post.id});
        if (finalPost) results.post = finalPost;

        results.changedPosts = changedPosts;

        return results;
    }

    this.init = function(initPostArray) {
        for (let post of initPostArray) {
            localPostPositions.insert(post);
        }

        LayeredGrapher.layoutGraph(localPostPositions);
        return localPostPositions.find({}).fetch();
    };

    this.addPost = function(post) {
        let results = LayeredGrapher.insertPost(localPostPositions, post);

        return finalizeResults(results, post);
    };

    this.repositionPost = function(post) {
      let results = LayeredGrapher.repositionPosts(localPostPositions, post);

      return finalizeResults(results, post);
    }

    this.removePost = function(post) {
        let results = LayeredGrapher.removePost(localPostPositions, post);

        return finalizeResults(results, post);
    };

    this.updatePost = function(_id, fields) {
        localPostPositions.update({_id: _id},{$set: fields});
    };

    this.getPosts = function() {
        return localPostPositions.find({}).fetch();
    }

    this.getPost = function(id) {
        return localPostPositions.findOne({id: id});
    }

}
