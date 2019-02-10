/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

MainViewLayout = function() {

    localPostPositions = new Mongo.Collection(null);

    this.init = function(initPostArray) {
        for (let post of initPostArray) {
            localPostPositions.insert(post);
        }
        LayeredGrapher.layoutGraph(localPostPositions);
        return localPostPositions.find({}).fetch();
    };

    this.addPost = function(post) {
        let results = LayeredGrapher.insertPost(localPostPositions, post);
        let changedPosts = new Set();

        for (let id of results.changedPosts.values()) {
            changedPosts.add(localPostPositions.findOne({_id: id}));
        }

        results.post = localPostPositions.findOne({id: post.id});

        results.changedPosts = changedPosts;

        return results;
    };

    this.repositionPost = function(post) {
      let results = LayeredGrapher.repositionPost(localPostPositions, post);
      let changedPosts = new Set();

      for (let id of results.changedPosts.values()) {
          changedPosts.add(localPostPositions.findOne({_id: id}));
      }

      results.changedPosts = changedPosts;

      return results;
    }

    this.removePost = function(post) {
        let results = LayeredGrapher.removePost(localPostPositions, post);
        let changedPosts = new Set();

        for (let updatedPost_id of results.changedPosts.values()) {
            changedPosts.add(localPostPositions.findOne({_id: updatedPost_id}));
        }

        results.changedPosts = changedPosts;

        return results;
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
