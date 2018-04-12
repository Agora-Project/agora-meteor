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
        return LayeredGrapher.insertPost(localPostPositions, post);
    };

    this.removePost = function(post) {
        return LayeredGrapher.removePost(localPostPositions, post);
    };

    this.updatePost = function(id, fields) {
        localPostPositions.update({_id: id},{$set: fields});
    };

    this.getPosts = function() {
        return localPostPositions.find({}).fetch();
    }

    this.getPost = function(id) {
        return localPostPositions.findOne({_id: id});
    }

}
